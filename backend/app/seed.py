"""
Idempotent database seeder.

Seeds three things:
  1. Dishes       — from seed_data.py, with real photos pulled from the Pexels API.
  2. Users        — synthetic diners with coherent dietary profiles and budgets.
  3. Interactions — realistic order history, so the collaborative-filtering
                    layer has a genuine signal to learn from.

Interaction generation is *not* uniform random: each user is assigned preferred
cuisines and habits, then orders are drawn to match. Purely random history would
give the recommender no latent structure to discover.

Environment:
    PEXELS_API_KEY   free key from https://www.pexels.com/api/ (optional but
                     recommended — without it, dishes share one fallback image)

Usage:
    python -m app.seed              # seed everything (skips what exists)
    python -m app.seed --reset      # wipe all data first, then seed
"""

from __future__ import annotations

import os
import random
import sys
import time
from datetime import datetime, timedelta

import requests

from .database import SessionLocal
from . import models
from .seed_data import DISHES

random.seed(42)

PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
PEXELS_SEARCH_URL = "https://api.pexels.com/v1/search"
FALLBACK_IMAGE = "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg"

NUM_USERS = 60
MIN_ORDERS, MAX_ORDERS = 8, 30


# ----------------------------------------------------------------------
# Images
# ----------------------------------------------------------------------

def fetch_image(dish_name: str) -> str:
    if not PEXELS_API_KEY:
        return FALLBACK_IMAGE
    try:
        resp = requests.get(
            PEXELS_SEARCH_URL,
            headers={"Authorization": PEXELS_API_KEY},
            params={
                "query": f"{dish_name} food",
                "per_page": 1,
                "orientation": "landscape",
            },
            timeout=8,
        )
        resp.raise_for_status()
        photos = resp.json().get("photos", [])
        return photos[0]["src"]["medium"] if photos else FALLBACK_IMAGE
    except Exception:
        return FALLBACK_IMAGE


# ----------------------------------------------------------------------
# Synthetic user profiles
# ----------------------------------------------------------------------

FIRST = ["Alex", "Priya", "Jonas", "Mei", "Omar", "Sara", "Liam", "Nina", "Raj",
         "Elena", "Tom", "Aisha", "Marco", "Yuki", "Ben", "Clara", "Dev", "Sofia",
         "Noah", "Leila", "Kai", "Anna", "Hugo", "Zara", "Finn", "Maya"]
LAST = ["Weber", "Sharma", "Muller", "Chen", "Haddad", "Novak", "Bauer", "Rossi",
        "Patel", "Fischer", "Kim", "Lopez", "Schmidt", "Okafor", "Dubois", "Silva"]

CUISINES = ["Italian", "Asian", "Indian", "American", "Mexican", "Mediterranean",
            "Seafood", "Salads", "Vegan", "Breakfast"]


def make_users() -> list[models.User]:
    users = []
    used_emails: set[str] = set()
    for i in range(NUM_USERS):
        first = random.choice(FIRST)
        last = random.choice(LAST)
        email = f"{first.lower()}.{last.lower()}{i}@example.com"
        if email in used_emails:
            continue
        used_emails.add(email)

        # Diet: mostly omnivore, with a realistic minority of veg/vegan.
        roll = random.random()
        is_vegan = roll < 0.08
        is_vegetarian = is_vegan or roll < 0.24
        needs_gf = random.random() < 0.10

        allergens = []
        if random.random() < 0.12:
            allergens.append(random.choice(["Peanuts", "Shellfish", "Fish", "Sesame"]))

        users.append(
            models.User(
                name=f"{first} {last}",
                email=email,
                is_vegetarian=is_vegetarian,
                is_vegan=is_vegan,
                needs_gluten_free=needs_gf,
                allergens=",".join(allergens) if allergens else None,
                spice_tolerance=random.choices([1, 2, 3, 4, 5],
                                               weights=[10, 20, 35, 25, 10])[0],
                avg_budget=round(random.uniform(7.5, 18.0), 2),
                created_at=datetime.utcnow() - timedelta(days=random.randint(30, 400)),
            )
        )
    return users


def user_preferences(user: models.User) -> list[str]:
    """Give each user 2-3 favourite cuisines — the pattern CF is meant to find."""
    pool = CUISINES[:]
    if user.is_vegan:
        pool = ["Vegan", "Salads", "Mediterranean", "Asian", "Indian"]
    elif user.is_vegetarian:
        pool = ["Vegan", "Salads", "Italian", "Indian", "Mediterranean", "Breakfast"]
    k = random.randint(2, 3)
    return random.sample(pool, k=min(k, len(pool)))


def eligible_for(user: models.User, dish: models.Dish) -> bool:
    if user.is_vegan and not dish.is_vegan:
        return False
    if user.is_vegetarian and not dish.is_vegetarian:
        return False
    if user.needs_gluten_free and not dish.is_gluten_free:
        return False
    if dish.spice_level > user.spice_tolerance + 1:
        return False
    user_allergens = {a.lower() for a in user.allergen_list()}
    if user_allergens and dish.details and dish.details.allergens:
        dish_allergens = {a.strip().lower() for a in dish.details.allergens.split(",")}
        if user_allergens & dish_allergens:
            return False
    return True


def make_interactions(users, dishes) -> list[models.Interaction]:
    interactions = []
    for user in users:
        prefs = user_preferences(user)
        allowed = [d for d in dishes if eligible_for(user, d)]
        if not allowed:
            continue

        # Weight dishes toward the user's preferred cuisines — this is the
        # latent structure the recommender is meant to discover.
        weights = []
        for d in allowed:
            w = 1.0
            if d.cuisine in prefs:
                w *= 6.0
            if abs(d.price - user.avg_budget) < 3:
                w *= 1.8
            if d.rating and d.rating >= 4.4:
                w *= 1.5
            weights.append(w)

        n_orders = random.randint(MIN_ORDERS, MAX_ORDERS)
        picks = random.choices(allowed, weights=weights, k=n_orders)

        for dish in picks:
            ts = datetime.utcnow() - timedelta(
                days=random.randint(0, 180), hours=random.randint(0, 23)
            )
            hour = ts.hour
            if hour < 11:
                meal = "breakfast"
            elif hour < 16:
                meal = "lunch"
            elif hour < 22:
                meal = "dinner"
            else:
                meal = "snack"

            # Users rate dishes in their preferred cuisines more highly.
            base = 4.3 if dish.cuisine in prefs else 3.6
            rating = max(1.0, min(5.0, round(random.gauss(base, 0.7) * 2) / 2))

            interactions.append(
                models.Interaction(
                    user_id=user.id,
                    dish_id=dish.id,
                    rating=rating,
                    quantity=random.choices([1, 2, 3], weights=[75, 20, 5])[0],
                    ordered_at=ts,
                    meal_time=meal,
                    day_of_week=ts.weekday(),
                    weather=random.choices(
                        ["cold", "mild", "hot"], weights=[30, 50, 20]
                    )[0],
                )
            )
    return interactions


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------

def reset(db):
    print("Resetting all data...")
    db.query(models.Interaction).delete()
    db.query(models.OrderItem).delete()
    db.query(models.Order).delete()
    db.query(models.DishDetail).delete()
    db.query(models.Dish).delete()
    db.query(models.User).delete()
    db.commit()
    print("  all tables cleared.")


def run(do_reset: bool = False):
    db = SessionLocal()
    try:
        if do_reset:
            reset(db)

        # --- 1. Dishes ---
        created = skipped = 0
        if not PEXELS_API_KEY:
            print("WARNING: PEXELS_API_KEY not set - using a single fallback image.")
        for row in DISHES:
            if db.query(models.Dish).filter(models.Dish.name == row["name"]).first():
                skipped += 1
                continue
            data = dict(row)
            details = data.pop("details", None)
            data["image_url"] = fetch_image(data["name"])
            dish = models.Dish(**data)
            if details:
                dish.details = models.DishDetail(**details)
            db.add(dish)
            created += 1
            if PEXELS_API_KEY:
                time.sleep(0.25)  # stay under 200 req/hour
        db.commit()
        print(f"Dishes:  {created} created, {skipped} skipped.")

        dishes = db.query(models.Dish).all()

        # --- 2. Users ---
        if db.query(models.User).count() > 0:
            print("Users:   already present, skipping.")
        else:
            db.add_all(make_users())
            db.commit()
            print(f"Users:   {db.query(models.User).count()} created.")

        users = db.query(models.User).all()

        # --- 3. Interactions ---
        if db.query(models.Interaction).count() > 0:
            print("History: already present, skipping.")
        else:
            interactions = make_interactions(users, dishes)
            db.add_all(interactions)
            db.commit()
            print(f"History: {len(interactions)} interactions created.")

            # Denormalise popularity onto the dish row for fast scoring.
            counts: dict[int, int] = {}
            for i in interactions:
                counts[i.dish_id] = counts.get(i.dish_id, 0) + i.quantity
            for dish in dishes:
                dish.order_count = counts.get(dish.id, 0)
            db.commit()
            print("         dish popularity counts updated.")

        print("\nSeed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    run(do_reset="--reset" in sys.argv)
