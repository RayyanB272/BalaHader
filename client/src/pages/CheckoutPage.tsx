import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageFrame from "../components/layout/PageFrame";
import { getCart } from "../services/cartService";
import { createOrder } from "../services/orderService";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const items = getCart();

  const [fulfillmentType, setFulfillmentType] = useState<
    "pickup" | "delivery"
  >("pickup");
  const [deliveryAreaId, setDeliveryAreaId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (
      fulfillmentType === "delivery" &&
      (!deliveryAreaId.trim() || !deliveryAddress.trim())
    ) {
      setError("Enter both the delivery area ID and delivery address.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const order = await createOrder({
        items: items.map((item) => ({
          listing_id: item.listing_id,
          quantity: item.quantity,
        })),
        fulfillment_type: fulfillmentType,
        delivery_area_id:
          fulfillmentType === "delivery" ? deliveryAreaId : undefined,
        delivery_address:
          fulfillmentType === "delivery" ? deliveryAddress : undefined,
      });

      navigate(`/payment?order=${order.order_id}`);
    } catch {
      setError("Could not create your order. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageFrame hideFooter>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link to="/cart" className="text-sm font-semibold text-[#C9472E]">
          ← Back to cart
        </Link>

        <h1 className="mt-5 text-3xl font-bold text-[#3A2925]">
          Checkout
        </h1>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={submitOrder}
          className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]"
        >
          <section className="rounded-2xl border border-[#EEDFD3] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3A2925]">
              Fulfillment method
            </h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(["pickup", "delivery"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setFulfillmentType(method)}
                  className={`rounded-xl border-2 p-4 text-left ${
                    fulfillmentType === method
                      ? "border-[#E85D3F] bg-[#FFF0E5]"
                      : "border-[#EEDFD3]"
                  }`}
                >
                  <span className="font-semibold capitalize text-[#3A2925]">
                    {method}
                  </span>
                  <span className="mt-1 block text-sm text-[#71605A]">
                    {method === "pickup"
                      ? "Collect from the business"
                      : "Deliver to your address"}
                  </span>
                </button>
              ))}
            </div>

            {fulfillmentType === "delivery" && (
              <div className="mt-5 space-y-4">
                <input
                  value={deliveryAreaId}
                  onChange={(event) => setDeliveryAreaId(event.target.value)}
                  placeholder="Delivery area ID"
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
                />

                <textarea
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  placeholder="Full delivery address"
                  rows={3}
                  className="w-full rounded-xl border border-[#EEDFD3] px-4 py-3 text-sm outline-none focus:border-[#E85D3F]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="mt-6 w-full rounded-xl bg-[#E85D3F] px-5 py-3 font-semibold text-white hover:bg-[#C9472E] disabled:opacity-60"
            >
              {loading ? "Creating order..." : "Continue to payment"}
            </button>
          </section>

          <aside className="h-fit rounded-2xl border border-[#EEDFD3] bg-white p-6">
            <h2 className="font-bold text-[#3A2925]">Order summary</h2>

            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.listing_id}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="text-[#71605A]">
                    {item.title} × {item.quantity}
                  </span>
                  <span className="font-medium text-[#3A2925]">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-between border-t border-[#EEDFD3] pt-4 font-bold text-[#3A2925]">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </aside>
        </form>
      </main>

      </PageFrame>
  );
}
