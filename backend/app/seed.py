"""
Idempotent database seeder. Fetches real food photos live from the Foodish API
(https://foodish-api.com) at seed time.

Usage:
    python -m app.seed

Safe to run multiple times — skips dishes that already exist (matched by name).
"""

import random
import requests

from .database import SessionLocal
from . import models
from .seed_data import DISHES

FOODISH_BASE = "https://foodish-api.com/api"
FOODISH_GENERIC = "https://foodish-api.com/api/"

# Map our menu categories to Foodish's actual categories.
CATEGORY_MAP = {
    "Pizza": ["pizza"],
    "Burgers": ["burger"],
    "Italian": ["pasta"],
    "Indian": ["biryani", "butter-chicken", "samosa"],
    "Desserts": ["dessert"],
    "Bakery": ["dessert"],
    "Asian": ["rice"],
    "Breakfast": ["dosa", "idly"],
}
FALLBACK_IMAGE = "https://foodish-api.com/images/pizza/pizza1.jpg"


def fetch_image(category: str) -> str:
    """Fetch a real food photo URL from Foodish, matched to category where possible."""
    options = CATEGORY_MAP.get(category)
    try:
        if options:
            chosen = random.choice(options)
            resp = requests.get(f"{FOODISH_BASE}/images/{chosen}", timeout=5)
        else:
            # No direct category match — use Foodish's random-any-category endpoint.
            resp = requests.get(FOODISH_GENERIC, timeout=5)
        resp.raise_for_status()
        return resp.json()["image"]
    except Exception:
        return FALLBACK_IMAGE


def run():
    db = SessionLocal()
    try:
        created = 0
        skipped = 0
        for dish_data in DISHES:
            existing = (
                db.query(models.Dish)
                .filter(models.Dish.name == dish_data["name"])
                .first()
            )
            if existing:
                skipped += 1
                continue

            details_data = dish_data.pop("details", None)
            dish_data = dict(dish_data)  # avoid mutating the shared module-level dict
            dish_data["image_url"] = fetch_image(dish_data.get("category", ""))

            dish = models.Dish(**dish_data)
            if details_data:
                dish.details = models.DishDetail(**details_data)

            db.add(dish)
            created += 1

        db.commit()
        print(f"Seed complete: {created} created, {skipped} skipped (already existed).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
