import os

import mongomock
import pytest


os.environ.setdefault("MONGODB_URL", "mongodb://localhost:27017")
os.environ.setdefault("DATABASE_NAME", "balahader_test")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("IMAGEKIT_PRIVATE_KEY", "test-imagekit-key")
os.environ.setdefault("IMAGEKIT_URL_ENDPOINT", "https://example.test")
os.environ.setdefault("STRIPE_SECRET_KEY", "sk_test_example")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "whsec_example")
os.environ["TESTING"] = "true"


@pytest.fixture
def mongo_db():
    return mongomock.MongoClient().balahader_test
