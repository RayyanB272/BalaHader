"""
Sets the photo of every listing, using the table below.

Run from the server folder, with the virtual environment activated:

    python fix_product_images.py

HOW TO CHANGE A PHOTO
  1. Put the photo file in  client/public/products/
  2. In the table below, write the file name next to the product.
  3. Run the script again.

A product set to None (or missing from the table) uses a photo named after
itself, e.g. "Lentil Soup (4 cups)" -> lentil-soup-4-cups.jpg, if that file
exists; otherwise it keeps whatever image it has now. Nothing is deleted.
"""
import re
from pathlib import Path

from app.database import listings_collection

# ---------------------------------------------------------------------------
#  EDIT THIS TABLE:   "Product title": "photo file name"
# ---------------------------------------------------------------------------
PRODUCT_PHOTOS = {
    "Assorted Manakish Box": "assorted-manakish-box.png",
    "Fresh Bread Bundle": "fresh-bread-bundle.png",
    "Croissant Pack": "croissant-pack.png",
    "Baklava Selection Box": "baklava-selection-box.png",
    "Knefeh Slices (4)": "knefeh-slices-4.jpg",
    "Chocolate Cake Slices": "chocolate-cake-slices.png",
    "Fresh Fruit Crate": "fresh-fruit-crate.png",
    "Vegetable Box": "vegetable-box.png",
    "Dairy Bundle": "dairy-bundle.png",
    "Cold Juice Pack (6)": "cold-juice-pack-6.png",
    "Chicken and Rice Meal": "chicken-and-rice-meal.jpg",
    "Vegetarian Mezze Platter": "vegetarian-mezze-platter.jpg",
    "Kafta and Potatoes Tray": "kafta-and-potatoes-tray.jpg",
    "Lentil Soup (4 cups)": "lentil-soup-4-cups.jpg",
    "Sandwich Combo": "sandwich-combo.png",
    "Iced Coffee Pack (4)": "iced-coffee-pack-4.png",
    "Snack Mix Box": "snack-mix-box.png",
    "Granola Bars (12)": "granola-bars-12.png",
}
# ---------------------------------------------------------------------------

PRODUCTS_DIR = Path(__file__).resolve().parent.parent / "client" / "public" / "products"
EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")


def slugify(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


def main():
    if not PRODUCTS_DIR.exists():
        print(f"Folder not found: {PRODUCTS_DIR}")
        print("Put your photos in client/public/products and run this again.")
        return

    files = {p.name.lower(): p.name for p in PRODUCTS_DIR.iterdir() if p.suffix.lower() in EXTENSIONS}
    by_slug = {Path(name).stem.lower(): name for name in files.values()}
    print(f"Found {len(files)} photos in {PRODUCTS_DIR}\n")

    updated = already_correct = 0
    problems, no_photo = [], []

    for listing in listings_collection.find({}, {"title": 1, "image_url": 1}):
        title = listing.get("title", "")
        chosen = PRODUCT_PHOTOS.get(title)

        if chosen:
            file_name = files.get(chosen.lower())
            if not file_name:
                problems.append(f"{title}: file '{chosen}' is not in the products folder")
                continue
        else:
            file_name = by_slug.get(slugify(title))
            if not file_name:
                no_photo.append(title)
                continue

        new_url = f"/products/{file_name}"

        if listing.get("image_url") == new_url:
            already_correct += 1
            continue

        listings_collection.update_one({"_id": listing["_id"]}, {"$set": {"image_url": new_url}})
        updated += 1
        print(f"  {title}  ->  {file_name}")

    print(f"\n{updated} updated, {already_correct} already correct.")

    if problems:
        print("\nProblems (check the spelling of the file name):")
        for line in problems:
            print(f"  {line}")

    if no_photo:
        print(f"\n{len(set(no_photo))} products have no photo yet and keep their current image:")
        for title in sorted(set(no_photo)):
            print(f"  {title}")


if __name__ == "__main__":
    main()
