"""
Idempotent database seeder. Fetches real, relevant food photos from the
Pexels API (https://pexels.com/api) at seed time, searched by dish name.

Requires the PEXELS_API_KEY environment variable to be set.
Get a free key instantly at: https://www.pexels.com/api/

Usage:
    python -m app.seed

Safe to run multiple times — skips dishes that already exist (matched by name).
"""

import os
import time
import requests

from .database import SessionLocal
from . import models
from .seed_data import DISHES

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"

# A safe, generic food photo used only if the API call fails or no key is set.
FALLBACK_IMAGE = "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg"


def fetch_image(dish_name: str, category: str) -> str:
    """Search Pexels for a photo matching the dish name; fall back gracefully."""
    if not PEXELS_API_KEY:
        return FALLBACK_IMAGE

    query = f"{dish_name} food dish"
    try:
        resp = requests.get(
            PEXELS_SEARCH_URL,
            headers={"Authorization": PEXELS_API_KEY},
            params={"query": query, "per_page": 1, "orientation": "landscape"},
            timeout=8,
        )
        resp.raise_for_status()
        photos = resp.json().get("photos", [])
        if photos:
            return photos[0]["src"]["medium"]
        return FALLBACK_IMAGE
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
            dish_data["image_url"] = fetch_image(
                dish_data["name"], dish_data.get("category", "")
            )

            dish = models.Dish(**dish_data)
            if details_data:
                dish.details = models.DishDetail(**details_data)

            db.add(dish)
            created += 1

            # Stay comfortably under Pexels' 200 requests/hour limit.
            time.sleep(0.3)

        db.commit()
        print(f"Seed complete: {created} created, {skipped} skipped (already existed).")
    finally:
        db.close()


if __name__ == "__main__":
    run()