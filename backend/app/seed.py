"""
Idempotent database seeder.

Usage:
    python -m app.seed

Safe to run multiple times — skips dishes that already exist (matched by name).
"""

from .database import SessionLocal
from . import models
from .seed_data import DISHES


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