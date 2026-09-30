from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from bson import ObjectId

from app.routes import admin, payments
from app.routes.orders import create_order
from app.schemas.order import OrderCreate, OrderItemCreate
from app.services import stock_hold_service
from fastapi import HTTPException
import pytest


def test_release_hold_is_idempotent(monkeypatch, mongo_db):
    listing_id = ObjectId()
    hold_id = ObjectId()
    mongo_db.listings.insert_one({"_id": listing_id, "reserved_quantity": 2})
    mongo_db.holds.insert_one({
        "_id": hold_id,
        "status": "active",
        "items": [{"listing_id": str(listing_id), "quantity": 2}],
    })
    monkeypatch.setattr(stock_hold_service, "listings_collection", mongo_db.listings)
    monkeypatch.setattr(stock_hold_service, "stock_holds_collection", mongo_db.holds)
    monkeypatch.setattr(stock_hold_service, "run_transaction", lambda operation: operation(None))

    assert stock_hold_service.release_hold(str(hold_id)) is True
    assert stock_hold_service.release_hold(str(hold_id)) is False
    assert mongo_db.listings.find_one({"_id": listing_id})["reserved_quantity"] == 0


def test_checkout_rejects_duplicate_listings():
    listing_id = str(ObjectId())
    data = OrderCreate(
        items=[OrderItemCreate(listing_id=listing_id, quantity=1), OrderItemCreate(listing_id=listing_id, quantity=1)],
        fulfillment_type="pickup",
    )
    with pytest.raises(HTTPException) as raised:
        create_order(data, {"_id": "customer", "role": "customer"})
    assert raised.value.status_code == 400


def test_payment_commit_updates_stock_hold_and_order_once(monkeypatch, mongo_db):
    listing_id, hold_id, order_id = ObjectId(), ObjectId(), ObjectId()
    mongo_db.listings.insert_one({"_id": listing_id, "reserved_quantity": 1, "remaining_quantity": 3, "quantity_sold": 0})
    mongo_db.holds.insert_one({"_id": hold_id, "status": "active", "expires_at": datetime.now(timezone.utc) + timedelta(minutes=10), "items": [{"listing_id": str(listing_id), "quantity": 1}]})
    order = {"_id": order_id, "stock_hold_id": str(hold_id), "customer_id": "customer", "payment_status": "pending"}
    mongo_db.orders.insert_one(order)
    monkeypatch.setattr(payments, "listings_collection", mongo_db.listings)
    monkeypatch.setattr(payments, "stock_holds_collection", mongo_db.holds)
    monkeypatch.setattr(payments, "orders_collection", mongo_db.orders)
    monkeypatch.setattr(payments, "run_transaction", lambda operation: operation(None))
    monkeypatch.setattr(payments, "create_notification", lambda **kwargs: None)

    now = datetime.now(timezone.utc)
    assert payments._commit_order_payment(order, now) is True
    assert payments._commit_order_payment(order, now) is False
    listing = mongo_db.listings.find_one({"_id": listing_id})
    assert (listing["reserved_quantity"], listing["remaining_quantity"], listing["quantity_sold"]) == (0, 2, 1)


def test_failed_payment_releases_hold(monkeypatch):
    released = []
    updated = SimpleNamespace(update_one=lambda *args, **kwargs: released.append("order"))
    monkeypatch.setattr(payments, "release_hold", lambda hold_id, final_status: released.append((hold_id, final_status)))
    monkeypatch.setattr(payments, "orders_collection", updated)
    payments._fail_order_payment({"_id": ObjectId(), "stock_hold_id": "hold", "payment_status": "pending"}, datetime.now(timezone.utc))
    assert ("hold", "released") in released


def test_admin_refund_updates_order_and_payment(monkeypatch, mongo_db):
    order_id, payment_id = ObjectId(), ObjectId()
    mongo_db.orders.insert_one({"_id": order_id, "payment_status": "refund_pending", "total_amount": 9.0})
    mongo_db.payments.insert_one({"_id": payment_id, "order_id": str(order_id), "status": "succeeded", "stripe_payment_intent_id": "pi_test"})
    monkeypatch.setattr(admin, "orders_collection", mongo_db.orders)
    monkeypatch.setattr(admin, "payments_collection", mongo_db.payments)
    monkeypatch.setattr(admin, "run_transaction", lambda operation: operation(None))
    monkeypatch.setattr(admin.stripe.Refund, "create", lambda **kwargs: SimpleNamespace(id="re_test"))

    result = admin.refund_order(str(order_id), {"role": "admin"})
    assert result["payment_status"] == "refunded"
    assert mongo_db.orders.find_one({"_id": order_id})["payment_status"] == "refunded"


@pytest.mark.asyncio
async def test_webhook_rejects_invalid_signature(monkeypatch):
    class FakeRequest:
        headers = {"stripe-signature": "invalid"}

        async def body(self):
            return b"{}"

    monkeypatch.setattr(payments.stripe.Webhook, "construct_event", lambda *args, **kwargs: (_ for _ in ()).throw(ValueError("invalid")))
    with pytest.raises(HTTPException) as raised:
        await payments.stripe_webhook(FakeRequest())
    assert raised.value.status_code == 400
