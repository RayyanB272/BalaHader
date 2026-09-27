"""
Fills BalaHader with demo data: users, businesses, charities, food listings
and donations.

Run from the server folder, with the virtual environment activated:

    python seed_data.py            # add demo data
    python seed_data.py --reset    # delete previous demo data, then add fresh data

All demo accounts use the password:  Password123
Everything this script creates is tagged "is_seed", so --reset only removes
demo data and never touches real accounts.
"""
import re
import sys
from pathlib import Path
from datetime import datetime, timedelta, timezone

from app.database import (
    businesses_collection,
    charities_collection,
    delivery_areas_collection,
    donations_collection,
    listings_collection,
    users_collection,
)
from app.utils.security import hash_password

PASSWORD = "Password123"

# Put one photo per product in  client/public/products/  named after the product,
# e.g.  assorted-manakish-box.jpg  (see the list printed when the script finishes).
# Products without their own photo fall back to a generic category photo.
PRODUCT_IMAGES_DIR = Path(__file__).resolve().parent.parent / "client" / "public" / "products"
PRODUCT_IMAGE_TYPES = (".jpg", ".jpeg", ".png", ".webp")
missing_images = []
DOMAIN = "balahader-demo.com"
NOW = datetime.now(timezone.utc)

IMG = {
    "bakery": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&h=400&fit=crop&auto=format",
    "prepared_meals": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop&auto=format",
    "fresh_produce": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop&auto=format",
    "drinks": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&h=400&fit=crop&auto=format",
    "desserts": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&h=400&fit=crop&auto=format",
    "snacks": "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=600&h=400&fit=crop&auto=format",
    "dairy": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&h=400&fit=crop&auto=format",
}

# ---------------------------------------------------------------- people
ADMIN = ("Admin", "BalaHader", "admin", "70 000 001")

CUSTOMERS = [
    ("Rayan", "Khoury", "rayan.khoury", "03 100 201"),
    ("Lina", "Haddad", "lina.haddad", "03 100 202"),
    ("Omar", "Saade", "omar.saade", "03 100 203"),
]

# name, type, description, area, address, phone, delivery, pickup_info, owner (first, last, email-prefix)
BUSINESSES = [
    ("Al Mina Bakery", "Bakery", "Fresh manakish, bread and pastries baked every morning.",
     "El Mina", "Corniche Street, next to the fish market", "06 210 101", True,
     "Pickup 5pm to 8pm daily.", ("Karim", "Nassar", "karim.nassar")),
    ("Tal Sweets House", "Sweets and desserts", "Traditional Tripoli sweets and cakes.",
     "Al Tal", "Al Tal Square, main road", "06 210 102", False,
     "Pickup until 9pm, ask for the surplus box.", ("Maya", "Itani", "maya.itani")),
    ("Green Basket Market", "Grocery store", "Neighborhood grocery with fresh fruit and vegetables.",
     "Al Qobbeh", "Al Qobbeh Street, building 12", "06 210 103", True,
     "Pickup 4pm to 7pm.", ("Ziad", "Mansour", "ziad.mansour")),
    ("Cedar Kitchen", "Restaurant", "Home-style Lebanese meals prepared daily.",
     "Abu Samra", "Abu Samra main road, ground floor", "06 210 104", False,
     "Pickup 9pm to 10pm at the counter.", ("Dana", "Fakhoury", "dana.fakhoury")),
    ("Zahriyeh Cafe", "Café", "Cafe serving sandwiches, snacks and cold drinks.",
     "Zahriyeh", "Zahriyeh Street, near the roundabout", "06 210 105", False,
     "Pickup any time before closing.", ("Tarek", "Salloum", "tarek.salloum")),
]

# name, description, area, address, phone, verification_status, contact (first, last, email-prefix)
CHARITIES = [
    ("Tripoli Food Bank", "Distributes food parcels to families across Tripoli.",
     "Bab al-Tabbaneh", "Bab al-Tabbaneh, Syria Street", "06 310 201", "verified",
     ("Hala", "Rifai", "hala.rifai")),
    ("Hands of Hope", "Runs a daily meal kitchen for people in need.",
     "Jabal Mohsen", "Jabal Mohsen, main road", "06 310 202", "verified",
     ("Nabil", "Ghazal", "nabil.ghazal")),
    ("New Dawn Association", "Supports elderly residents with weekly food deliveries.",
     "Al Mitein", "Al Mitein, building 5", "06 310 203", "pending",
     ("Rima", "Zein", "rima.zein")),
]

# business index, title, description, category, original, discounted, quantity, sold, sale hours left, fulfillment
LISTINGS = [
    (0, "Assorted Manakish Box", "Six fresh manakish: zaatar, cheese and kishik.", "bakery", 9.0, 4.5, 20, 6, 30, "both"),
    (0, "Fresh Bread Bundle", "Five loaves of Arabic bread baked this morning.", "bakery", 5.0, 2.0, 25, 9, 18, "pickup"),
    (0, "Croissant Pack", "Four buttery croissants, plain and chocolate.", "bakery", 8.0, 4.0, 15, 3, 40, "both"),
    (1, "Baklava Selection Box", "Mixed baklava, pistachio and cashew.", "desserts", 14.0, 7.0, 12, 4, 36, "pickup"),
    (1, "Knefeh Slices (4)", "Warm knefeh na'ameh slices with syrup.", "desserts", 10.0, 5.0, 16, 5, 20, "pickup"),
    (1, "Chocolate Cake Slices", "Three rich chocolate cake slices.", "desserts", 9.0, 4.5, 10, 2, 44, "pickup"),
    (2, "Fresh Fruit Crate", "Seasonal fruit: apples, oranges and bananas.", "fresh_produce", 12.0, 6.0, 18, 7, 46, "both"),
    (2, "Vegetable Box", "Tomatoes, cucumbers, peppers and herbs.", "fresh_produce", 10.0, 5.0, 22, 8, 28, "both"),
    (2, "Dairy Bundle", "Labneh, yoghurt and white cheese.", "dairy", 11.0, 5.5, 14, 3, 24, "pickup"),
    (2, "Cold Juice Pack (6)", "Six bottles of fresh-pressed juice.", "drinks", 12.0, 6.0, 20, 5, 34, "both"),
    (3, "Chicken and Rice Meal", "Lebanese-style chicken with rice and salad.", "prepared_meals", 12.0, 6.0, 20, 10, 8, "pickup"),
    (3, "Vegetarian Mezze Platter", "Hummus, moutabal, tabbouleh and fattoush.", "prepared_meals", 15.0, 7.5, 12, 4, 10, "pickup"),
    (3, "Kafta and Potatoes Tray", "Kafta with roasted potatoes, serves two.", "prepared_meals", 16.0, 8.0, 10, 3, 9, "pickup"),
    (3, "Lentil Soup (4 cups)", "Hearty lentil soup, ready to reheat.", "prepared_meals", 8.0, 4.0, 16, 6, 12, "pickup"),
    (4, "Sandwich Combo", "Two chicken sandwiches with fries.", "prepared_meals", 11.0, 5.5, 15, 5, 14, "pickup"),
    (4, "Iced Coffee Pack (4)", "Four cold brew iced coffees.", "drinks", 13.0, 6.5, 12, 4, 22, "pickup"),
    (4, "Snack Mix Box", "Nuts, chips and chocolate bars.", "snacks", 9.0, 4.5, 24, 8, 38, "pickup"),
    (4, "Granola Bars (12)", "Twelve oat and honey granola bars.", "snacks", 8.0, 3.5, 30, 12, 42, "pickup"),
]

# business index, listing index, quantity, state, charity index (or None)
DONATIONS = [
    (0, 1, 8, "available", None),
    (2, 7, 6, "available", None),
    (3, 10, 4, "available", None),
    (1, 4, 5, "available", None),
    (3, 11, 6, "claimed", 0),
    (0, 0, 12, "completed", 1),
]


def slugify(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def image_for(title, category):
    """Product photo from client/public/products if it exists, else the category photo."""
    slug = slugify(title)

    for extension in PRODUCT_IMAGE_TYPES:
        if (PRODUCT_IMAGES_DIR / f"{slug}{extension}").exists():
            return f"/products/{slug}{extension}"

    missing_images.append(slug)
    return IMG[category]


def user_doc(first, last, prefix, phone, role):
    return {
        "first_name": first,
        "last_name": last,
        "email": f"{prefix}@{DOMAIN}",
        "phone": phone,
        "password_hash": hash_password(PASSWORD),
        "role": role,
        "status": "active",
        "created_at": NOW,
        "updated_at": NOW,
        "is_seed": True,
    }


def reset():
    # Older versions of the seed script did not tag every record consistently.
    # Remove every account in the reserved demo domain and anything owned by it
    # so a duplicate email can never be selected during login.
    demo_users = list(users_collection.find(
        {"email": {"$regex": f"@{re.escape(DOMAIN)}$", "$options": "i"}},
        {"_id": 1}
    ))
    demo_user_ids = [value for user in demo_users for value in (user["_id"], str(user["_id"]))]

    demo_businesses = list(businesses_collection.find(
        {"$or": [{"is_seed": True}, {"user_id": {"$in": demo_user_ids}}]},
        {"_id": 1}
    ))
    demo_business_ids = [value for business in demo_businesses for value in (business["_id"], str(business["_id"]))]

    demo_charities = list(charities_collection.find(
        {"$or": [{"is_seed": True}, {"user_id": {"$in": demo_user_ids}}]},
        {"_id": 1}
    ))
    demo_charity_ids = [value for charity in demo_charities for value in (charity["_id"], str(charity["_id"]))]

    listings_collection.delete_many({
        "$or": [{"is_seed": True}, {"business_id": {"$in": demo_business_ids}}]
    })
    donations_collection.delete_many({
        "$or": [
            {"is_seed": True},
            {"business_id": {"$in": demo_business_ids}},
            {"charity_id": {"$in": demo_charity_ids}},
        ]
    })
    delivery_areas_collection.delete_many({
        "$or": [{"is_seed": True}, {"business_id": {"$in": demo_business_ids}}]
    })
    businesses_collection.delete_many({
        "$or": [{"is_seed": True}, {"user_id": {"$in": demo_user_ids}}]
    })
    charities_collection.delete_many({
        "$or": [{"is_seed": True}, {"user_id": {"$in": demo_user_ids}}]
    })
    users_collection.delete_many({
        "$or": [
            {"is_seed": True},
            {"email": {"$regex": f"@{re.escape(DOMAIN)}$", "$options": "i"}},
        ]
    })
    print("Removed previous demo data.")


def main():
    PRODUCT_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    missing_images.clear()

    if "--reset" in sys.argv:
        reset()
    elif users_collection.find_one({"is_seed": True}):
        print("Demo data already exists. Run  python seed_data.py --reset  to recreate it.")
        return

    users_collection.insert_one(user_doc(*ADMIN, "admin"))
    for first, last, prefix, phone in CUSTOMERS:
        users_collection.insert_one(user_doc(first, last, prefix, phone, "customer"))

    business_ids = []
    for name, kind, desc, area, address, phone, delivery, pickup, (f, l, prefix) in BUSINESSES:
        owner = users_collection.insert_one(user_doc(f, l, prefix, phone, "business"))
        business = businesses_collection.insert_one({
            "user_id": str(owner.inserted_id),
            "business_name": name,
            "business_type": kind,
            "description": desc,
            "phone": phone,
            "address": address,
            "area": area,
            "pickup_info": pickup,
            "delivery_enabled": delivery,
            "status": "active",
            "created_at": NOW,
            "updated_at": NOW,
            "is_seed": True,
        })
        business_ids.append(str(business.inserted_id))

        if delivery:
            for code, zone, fee, minutes in (
                ("MINA", "El Mina", 2.0, 30),
                ("TAL", "Al Tal", 2.5, 35),
                ("QOBBEH", "Al Qobbeh", 3.0, 40),
            ):
                delivery_areas_collection.insert_one({
                    "business_id": str(business.inserted_id),
                    "country_code": "LB",
                    "city_code": "TRIPOLI",
                    "area_code": code,
                    "area_name": zone,
                    "delivery_fee": fee,
                    "estimated_time_minutes": minutes,
                    "is_active": True,
                    "created_at": NOW,
                    "updated_at": NOW,
                    "is_seed": True,
                })

    charity_ids = []
    for name, desc, area, address, phone, status, (f, l, prefix) in CHARITIES:
        owner = users_collection.insert_one(user_doc(f, l, prefix, phone, "charity"))
        verified = status == "verified"
        charity = charities_collection.insert_one({
            "user_id": str(owner.inserted_id),
            "organization_name": name,
            "description": desc,
            "phone": phone,
            "address": address,
            "area": area,
            "verification_document_url": f"https://example.com/documents/{prefix}.pdf",
            "verification_status": status,
            "verified_by": None,
            "verified_at": NOW if verified else None,
            "created_at": NOW,
            "updated_at": NOW,
            "is_seed": True,
        })
        charity_ids.append(str(charity.inserted_id))

    listing_ids = []
    for b, title, desc, cat, original, discounted, qty, sold, hours, fulfillment in LISTINGS:
        sale_deadline = NOW + timedelta(hours=hours)
        listing = listings_collection.insert_one({
            "business_id": business_ids[b],
            "title": title,
            "description": desc,
            "category": cat,
            "original_price": original,
            "discounted_price": discounted,
            "original_quantity": qty,
            "remaining_quantity": qty - sold,
            "reserved_quantity": 0,
            "quantity_sold": sold,
            "sale_deadline": sale_deadline,
            "pickup_deadline": sale_deadline + timedelta(hours=3),
            "fulfillment_type": fulfillment if BUSINESSES[b][6] else "pickup",
            "donate_if_unsold": True,
            "donation_eligible": True,
            "image_url": image_for(title, cat),
            "status": "active",
            "created_at": NOW - timedelta(minutes=len(listing_ids) * 7),
            "updated_at": NOW,
            "is_seed": True,
        })
        listing_ids.append(listing.inserted_id)

    for b, li, qty, state, c in DONATIONS:
        listing = listings_collection.find_one({"_id": listing_ids[li]})
        claimed = state in ("claimed", "completed")
        donations_collection.insert_one({
            "listing_id": str(listing["_id"]),
            "business_id": business_ids[b],
            "charity_id": charity_ids[c] if c is not None else None,
            "title": listing["title"],
            "category": listing["category"],
            "image_url": listing.get("image_url"),
            "quantity": qty,
            "status": state,
            "pickup_deadline": listing["pickup_deadline"],
            "auto_generated": False,
            "available_at": NOW,
            "claimed_at": NOW if claimed else None,
            "collected_at": NOW if state == "completed" else None,
            "completed_at": NOW if state == "completed" else None,
            "created_at": NOW,
            "updated_at": NOW,
            "is_seed": True,
        })
        if state != "completed":
            listings_collection.update_one(
                {"_id": listing["_id"]},
                {"$inc": {"remaining_quantity": -qty}},
            )

    print("Demo data created.\n")
    print(f"Password for every account: {PASSWORD}\n")
    print(f"  Admin     admin@{DOMAIN}")
    for _, _, prefix, _ in CUSTOMERS[:1]:
        print(f"  Customer  {prefix}@{DOMAIN}")
    print(f"  Business  {BUSINESSES[0][8][2]}@{DOMAIN}  ({BUSINESSES[0][0]})")
    print(f"  Charity   {CHARITIES[0][6][2]}@{DOMAIN}  ({CHARITIES[0][0]}, verified)")
    print(f"\n{len(LISTINGS)} food listings, {len(DONATIONS)} donations, "
          f"{len(BUSINESSES)} businesses, {len(CHARITIES)} charities.")

    if missing_images:
        print(f"\n{len(missing_images)} products still use a generic category photo.")
        print(f"Add photos to: {PRODUCT_IMAGES_DIR}")
        print("named exactly like this (.jpg, .png or .webp), then run with --reset:")
        for slug in missing_images:
            print(f"  {slug}.jpg")
    else:
        print("\nEvery product uses its own photo.")


if __name__ == "__main__":
    main()
