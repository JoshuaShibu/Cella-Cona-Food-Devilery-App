"""
Hybrid recommendation engine for Cella & Cona.

Three signals are blended:

  1. Content-based    — cosine similarity over engineered dish features.
                        Solves cold-start: works for a brand-new user with
                        zero order history.
  2. Collaborative    — item-item co-occurrence from the interactions table
                        ("people who ordered X also ordered Y"). Captures
                        patterns that content features can't see.
  3. Contextual       — time of day, day of week, and weather boosts applied
                        as multipliers on top of the blended base score.

Hard constraints (dietary restrictions, allergens, availability) are applied
as *filters*, never as soft penalties — a vegan must never be shown chicken.

Pure Python / NumPy; no heavy ML dependency needed at this catalogue size.
"""

from __future__ import annotations

import math
from collections import defaultdict
from datetime import datetime

from sqlalchemy.orm import Session

from . import models

# --- Blend weights. Tune these to change recommendation behaviour. ---
W_CONTENT = 0.40
W_COLLAB = 0.35
W_POPULARITY = 0.25

# --- Contextual multipliers ---
MEAL_TIME_BOOST = 1.35        # dish is suitable for the current meal slot
WEATHER_MATCH_BOOST = 1.20    # warm food on a cold day / light food when hot
WEEKEND_INDULGENT_BOOST = 1.15
BUDGET_PENALTY = 0.85         # dish is well above the user's usual spend


# ----------------------------------------------------------------------
# Context helpers
# ----------------------------------------------------------------------

def infer_meal_time(now: datetime | None = None) -> str:
    now = now or datetime.now()
    h = now.hour
    if h < 11:
        return "breakfast"
    if h < 16:
        return "lunch"
    if h < 22:
        return "dinner"
    return "snack"


def infer_weather_bucket(temp_celsius: float | None) -> str | None:
    if temp_celsius is None:
        return None
    if temp_celsius <= 12:
        return "cold"
    if temp_celsius >= 26:
        return "hot"
    return "mild"


# ----------------------------------------------------------------------
# 1. Content-based similarity
# ----------------------------------------------------------------------

def _feature_vector(dish: models.Dish) -> dict[str, float]:
    """Sparse feature dict for a dish. Weighted by how much each signal matters."""
    f: dict[str, float] = {}
    if dish.category:
        f[f"cat::{dish.category}"] = 1.0
    if dish.cuisine:
        f[f"cuisine::{dish.cuisine}"] = 0.8
    for t in dish.tag_list():
        f[f"tag::{t}"] = 0.6
    if dish.is_vegetarian:
        f["diet::vegetarian"] = 0.5
    if dish.is_vegan:
        f["diet::vegan"] = 0.5
    if dish.is_gluten_free:
        f["diet::gf"] = 0.3
    f[f"spice::{dish.spice_level}"] = 0.4
    if dish.temp_affinity:
        f[f"temp::{dish.temp_affinity}"] = 0.4
    # Price band, so similarly-priced dishes cluster together.
    band = min(int((dish.price or 0) // 4), 4)
    f[f"price_band::{band}"] = 0.3
    return f


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    common = set(a) & set(b)
    if not common:
        return 0.0
    dot = sum(a[k] * b[k] for k in common)
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def content_scores(
    target_dishes: list[models.Dish],
    liked_dishes: list[models.Dish],
) -> dict[int, float]:
    """Score every candidate by mean similarity to the dishes the user liked."""
    if not liked_dishes:
        return {}
    liked_vecs = [_feature_vector(d) for d in liked_dishes]
    scores: dict[int, float] = {}
    for dish in target_dishes:
        v = _feature_vector(dish)
        sims = [_cosine(v, lv) for lv in liked_vecs]
        scores[dish.id] = sum(sims) / len(sims) if sims else 0.0
    return scores


# ----------------------------------------------------------------------
# 2. Collaborative filtering (item-item co-occurrence)
# ----------------------------------------------------------------------

def collaborative_scores(db: Session, user: models.User) -> dict[int, float]:
    """
    Build item-item co-occurrence from all interactions, then score candidates
    by how often they co-occur with dishes this user already ordered.

    Normalised by item popularity so blockbuster dishes don't dominate every
    recommendation (a classic collaborative-filtering failure mode).
    """
    all_rows = db.query(
        models.Interaction.user_id, models.Interaction.dish_id
    ).all()
    if not all_rows:
        return {}

    by_user: dict[int, set[int]] = defaultdict(set)
    dish_popularity: dict[int, int] = defaultdict(int)
    for uid, did in all_rows:
        by_user[uid].add(did)
        dish_popularity[did] += 1

    user_dishes = by_user.get(user.id, set())
    if not user_dishes:
        return {}

    co: dict[int, float] = defaultdict(float)
    for other_uid, dishes in by_user.items():
        if other_uid == user.id:
            continue
        overlap = len(dishes & user_dishes)
        if overlap == 0:
            continue
        # Similar users get more say; sqrt keeps prolific users from dominating.
        similarity = overlap / math.sqrt(len(dishes) * len(user_dishes))
        for did in dishes - user_dishes:
            co[did] += similarity

    if not co:
        return {}

    # Damp by popularity so niche-but-relevant dishes can surface.
    damped = {
        did: score / math.sqrt(dish_popularity.get(did, 1))
        for did, score in co.items()
    }
    peak = max(damped.values()) or 1.0
    return {did: s / peak for did, s in damped.items()}


# ----------------------------------------------------------------------
# 3. Popularity prior
# ----------------------------------------------------------------------

def popularity_scores(dishes: list[models.Dish]) -> dict[int, float]:
    """Normalised blend of order volume and average rating."""
    if not dishes:
        return {}
    peak_orders = max((d.order_count or 0) for d in dishes) or 1
    out = {}
    for d in dishes:
        vol = (d.order_count or 0) / peak_orders
        rating = ((d.rating or 3.5) - 3.0) / 2.0  # map ~3-5 onto 0-1
        out[d.id] = 0.6 * vol + 0.4 * max(0.0, min(1.0, rating))
    return out


# ----------------------------------------------------------------------
# Hard filters
# ----------------------------------------------------------------------

def passes_constraints(dish: models.Dish, user: models.User | None) -> bool:
    if not dish.is_available:
        return False
    if user is None:
        return True
    if user.is_vegan and not dish.is_vegan:
        return False
    if user.is_vegetarian and not dish.is_vegetarian:
        return False
    if user.needs_gluten_free and not dish.is_gluten_free:
        return False
    user_allergens = {a.lower() for a in user.allergen_list()}
    if user_allergens and dish.details and dish.details.allergens:
        dish_allergens = {
            a.strip().lower() for a in dish.details.allergens.split(",")
        }
        if user_allergens & dish_allergens:
            return False
    return True


# ----------------------------------------------------------------------
# Contextual multiplier
# ----------------------------------------------------------------------

def context_multiplier(
    dish: models.Dish,
    user: models.User | None,
    meal_time: str | None,
    weather: str | None,
    day_of_week: int | None,
) -> float:
    mult = 1.0

    if meal_time and meal_time in dish.meal_time_list():
        mult *= MEAL_TIME_BOOST

    if weather == "cold" and dish.temp_affinity == "warm":
        mult *= WEATHER_MATCH_BOOST
    elif weather == "hot" and dish.temp_affinity == "light":
        mult *= WEATHER_MATCH_BOOST

    # Weekends skew indulgent; weekdays skew lighter and quicker.
    if day_of_week is not None:
        is_weekend = day_of_week >= 5
        indulgent = {"Desserts", "BBQ", "Burgers", "Pizza"}
        if is_weekend and dish.category in indulgent:
            mult *= WEEKEND_INDULGENT_BOOST
        if not is_weekend and dish.details and dish.details.prep_time_minutes:
            if dish.details.prep_time_minutes <= 12:
                mult *= 1.08  # quick turnaround suits a weekday lunch break

    if user:
        # Spice beyond tolerance is unpleasant; below tolerance is merely fine.
        if dish.spice_level > user.spice_tolerance:
            mult *= 0.7 ** (dish.spice_level - user.spice_tolerance)
        if dish.price > user.avg_budget * 1.4:
            mult *= BUDGET_PENALTY

    return mult


# ----------------------------------------------------------------------
# Public API
# ----------------------------------------------------------------------

def passes_query_filters(dish, filters: dict | None) -> bool:
    """Apply ad-hoc filters parsed from a free-text chat query."""
    if not filters:
        return True

    if filters.get("is_vegan") and not dish.is_vegan:
        return False
    if filters.get("is_vegetarian") and not dish.is_vegetarian:
        return False
    if filters.get("is_gluten_free") and not dish.is_gluten_free:
        return False
    if filters.get("category") and dish.category != filters["category"]:
        return False
    if filters.get("cuisine") and dish.cuisine != filters["cuisine"]:
        return False
    if filters.get("max_price") and dish.price > filters["max_price"]:
        return False
    if filters.get("min_rating") and (dish.rating or 0) < filters["min_rating"]:
        return False
    if filters.get("max_spice") and dish.spice_level > filters["max_spice"]:
        return False
    if filters.get("min_spice") and dish.spice_level < filters["min_spice"]:
        return False

    details = dish.details
    if filters.get("max_calories"):
        if not details or (details.calories or 0) > filters["max_calories"]:
            return False
    if filters.get("min_calories"):
        if not details or (details.calories or 0) < filters["min_calories"]:
            return False
    if filters.get("max_prep_time"):
        if not details or (details.prep_time_minutes or 99) > filters["max_prep_time"]:
            return False

    return True



def recommend(
    db: Session,
    user_id: int | None = None,
    limit: int = 10,
    meal_time: str | None = None,
    weather: str | None = None,
    temp_celsius: float | None = None,
    day_of_week: int | None = None,
    exclude_ordered: bool = True, 
    query_filters: dict | None = None,
) -> list[dict]:
    """
    Return ranked recommendations with a per-dish explanation of *why* it was
    picked — explainability matters as much as the ranking itself.
    """
    now = datetime.now()
    meal_time = meal_time or infer_meal_time(now)
    weather = weather or infer_weather_bucket(temp_celsius)
    day_of_week = day_of_week if day_of_week is not None else now.weekday()

    user = (
        db.query(models.User).filter(models.User.id == user_id).first()
        if user_id
        else None
    )

    all_dishes = db.query(models.Dish).all()
    candidates = [
        d for d in all_dishes
        if passes_constraints(d, user) and passes_query_filters(d, query_filters)
    ]
    if not candidates:
        return []

    liked_dishes: list[models.Dish] = []
    ordered_ids: set[int] = set()
    if user:
        interactions = (
            db.query(models.Interaction)
            .filter(models.Interaction.user_id == user.id)
            .all()
        )
        ordered_ids = {i.dish_id for i in interactions}
        liked_ids = {i.dish_id for i in interactions if (i.rating or 0) >= 4}
        liked_dishes = [d for d in all_dishes if d.id in liked_ids]

    if exclude_ordered and ordered_ids:
        candidates = [d for d in candidates if d.id not in ordered_ids]
        if not candidates:  # user has tried everything they're allowed
            candidates = [d for d in all_dishes if passes_constraints(d, user)]

    c_scores = content_scores(candidates, liked_dishes)
    f_scores = collaborative_scores(db, user) if user else {}
    p_scores = popularity_scores(candidates)

    # With no history at all, lean entirely on popularity + context.
    cold_start = not liked_dishes and not f_scores

    results = []
    for dish in candidates:
        c = c_scores.get(dish.id, 0.0)
        f = f_scores.get(dish.id, 0.0)
        p = p_scores.get(dish.id, 0.0)

        base = p if cold_start else (W_CONTENT * c + W_COLLAB * f + W_POPULARITY * p)
        mult = context_multiplier(dish, user, meal_time, weather, day_of_week)
        score = base * mult

        reasons = []
        if not cold_start and c > 0.35:
            reasons.append("similar to dishes you've enjoyed")
        if f > 0.3:
            reasons.append("popular with people who order like you")
        if p > 0.6:
            reasons.append("a customer favourite")
        if meal_time in dish.meal_time_list():
            reasons.append(f"great for {meal_time}")
        if weather == "cold" and dish.temp_affinity == "warm":
            reasons.append("warming on a cold day")
        elif weather == "hot" and dish.temp_affinity == "light":
            reasons.append("light and refreshing for the weather")
        if cold_start and not reasons:
            reasons.append("highly rated by our diners")

        results.append(
            {
                "dish": dish,
                "score": round(score, 4),
                "reasons": reasons[:3],
                "signals": {
                    "content": round(c, 3),
                    "collaborative": round(f, 3),
                    "popularity": round(p, 3),
                    "context_multiplier": round(mult, 3),
                },
            }
        )

    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:limit]


def similar_dishes(db: Session, dish_id: int, limit: int = 6) -> list[dict]:
    """Pure content-based 'more like this' — no user needed."""
    target = db.query(models.Dish).filter(models.Dish.id == dish_id).first()
    if not target:
        return []
    others = [
        d for d in db.query(models.Dish).all()
        if d.id != dish_id and d.is_available
    ]
    tv = _feature_vector(target)
    scored = [
        {"dish": d, "score": round(_cosine(tv, _feature_vector(d)), 4)}
        for d in others
    ]
    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored[:limit]
