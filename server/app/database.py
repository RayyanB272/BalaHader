from pymongo import MongoClient
from app.config import settings

if settings.TESTING:
    # Tests must never wait for or write to a developer's real MongoDB.
    # mongomock is intentionally a test-only dependency.
    import mongomock

    client = mongomock.MongoClient()
else:
    client = MongoClient(settings.MONGODB_URL)

db = client[settings.DATABASE_NAME]

users_collection = db["users"]
businesses_collection = db["businesses"]
charities_collection = db["charities"]

listings_collection = db["surplus_listings"]

orders_collection = db["orders"]
stock_holds_collection = db["stock_holds"]
payments_collection = db["payments"]

donations_collection = db["donations"]
reviews_collection = db["reviews"]

reviews_collection.create_index(
    [("reviewer_id", 1), ("target_type", 1), ("target_id", 1)],
    unique=True
)

delivery_areas_collection = db["delivery_areas"]
deliveries_collection = db["deliveries"]

notifications_collection = db["notifications"]

payment_events_collection = db["payment_events"]

platform_settings_collection = db["platform_settings"]

password_reset_tokens_collection = db[
    "password_reset_tokens"
]

password_reset_tokens_collection.create_index(
    "expires_at",
    expireAfterSeconds=0
)

password_reset_tokens_collection.create_index(
    "token_hash",
    unique=True
)
