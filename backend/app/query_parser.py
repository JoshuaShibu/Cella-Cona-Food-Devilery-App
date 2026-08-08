"""
Natural-language query parsing for the recommendation chat.

Maps free-text requests like "something light and vegan for lunch under 10 euros"
onto the structured filters and context signals the recommender already
understands.

This is deliberately rule-based rather than LLM-backed: it's deterministic,
costs nothing per request, has no external dependency, and for a bounded
food-ordering vocabulary it covers the realistic query space. The trade-off is
that it won't generalise to phrasing outside these patterns — swapping in an
LLM call behind the same interface would be the upgrade path.
"""

from __future__ import annotations

import re

# --- Vocabulary -------------------------------------------------------

DIET_TERMS = {
    "vegan": {"is_vegan": True},
    "plant based": {"is_vegan": True},
    "plant-based": {"is_vegan": True},
    "vegetarian": {"is_vegetarian": True},
    "veggie": {"is_vegetarian": True},
    "meat free": {"is_vegetarian": True},
    "meat-free": {"is_vegetarian": True},
    "gluten free": {"is_gluten_free": True},
    "gluten-free": {"is_gluten_free": True},
    "coeliac": {"is_gluten_free": True},
    "celiac": {"is_gluten_free": True},
}

CUISINE_TERMS = {
    "italian": "Italian", "pasta": "Italian", "pizza": "Italian",
    "indian": "Indian", "curry": "Indian",
    "asian": "Asian", "chinese": "Asian", "thai": "Asian",
    "japanese": "Asian", "noodle": "Asian", "noodles": "Asian",
    "mexican": "Mexican", "taco": "Mexican", "tacos": "Mexican",
    "american": "American", "burger": "American", "bbq": "American",
    "mediterranean": "Mediterranean", "greek": "Mediterranean",
    "seafood": "Seafood", "fish": "Seafood",
    "salad": "Salads", "salads": "Salads",
    "breakfast": "Breakfast", "brunch": "Breakfast",
    "dessert": "Dessert", "sweet": "Dessert", "cake": "Dessert",
    "drink": "Beverage", "drinks": "Beverage", "coffee": "Beverage",
    "soup": "Soups", "soups": "Soups",
}

CATEGORY_TERMS = {
    "pizza": "Pizza", "burger": "Burgers", "burgers": "Burgers",
    "salad": "Salads", "salads": "Salads", "wrap": "Wraps", "wraps": "Wraps",
    "soup": "Soups", "soups": "Soups", "dessert": "Desserts",
    "desserts": "Desserts", "drink": "Drinks", "drinks": "Drinks",
    "sandwich": "Sandwiches", "sandwiches": "Sandwiches",
    "bakery": "Bakery", "pastry": "Bakery",
}

MEAL_TERMS = {
    "breakfast": "breakfast", "morning": "breakfast", "brunch": "breakfast",
    "lunch": "lunch", "midday": "lunch",
    "dinner": "dinner", "evening": "dinner", "supper": "dinner",
    "snack": "snack", "late night": "snack",
}

SPICY_TERMS = ["spicy", "hot", "fiery", "chilli", "chili"]
MILD_TERMS = ["mild", "not spicy", "no spice", "non spicy", "gentle"]

LIGHT_TERMS = ["light", "healthy", "fresh", "low calorie", "low-calorie", "refreshing"]
HEARTY_TERMS = ["hearty", "filling", "comfort", "comforting", "warming", "indulgent"]

QUICK_TERMS = ["quick", "fast", "in a hurry", "rush", "asap"]

COLD_WEATHER = ["cold", "chilly", "freezing", "rainy", "winter"]
HOT_WEATHER = ["hot", "warm day", "sunny", "summer", "heatwave"]


def _find_budget(text: str) -> float | None:
    """Extract a maximum price from phrasings like 'under 10' or 'below €12.50'."""
    patterns = [
        r"under\s*€?\s*(\d+(?:[.,]\d+)?)",
        r"below\s*€?\s*(\d+(?:[.,]\d+)?)",
        r"less than\s*€?\s*(\d+(?:[.,]\d+)?)",
        r"max(?:imum)?\s*€?\s*(\d+(?:[.,]\d+)?)",
        r"cheaper than\s*€?\s*(\d+(?:[.,]\d+)?)",
        r"€\s*(\d+(?:[.,]\d+)?)\s*or less",
        r"budget of\s*€?\s*(\d+(?:[.,]\d+)?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return float(match.group(1).replace(",", "."))
    return None


def parse_query(query: str) -> dict:
    """
    Turn a free-text request into recommendation parameters.

    Returns a dict with two keys:
        filters  — hard constraints passed to the dish query
        context  — soft signals passed to the recommender
        matched  — human-readable list of what was understood, for UI feedback
    """
    text = query.lower().strip()
    filters: dict = {}
    context: dict = {}
    matched: list[str] = []

    # Diet
    for term, flags in DIET_TERMS.items():
        if term in text:
            filters.update(flags)
            matched.append(term)
            break

    # Cuisine — checked before category so "pizza" resolves to the more
    # specific category rather than the broader Italian cuisine.
    for term, category in CATEGORY_TERMS.items():
        if re.search(rf"\b{re.escape(term)}\b", text):
            filters["category"] = category
            matched.append(category)
            break
    else:
        for term, cuisine in CUISINE_TERMS.items():
            if re.search(rf"\b{re.escape(term)}\b", text):
                filters["cuisine"] = cuisine
                matched.append(cuisine)
                break

    # Meal time
    for term, meal in MEAL_TERMS.items():
        if term in text:
            context["meal_time"] = meal
            matched.append(meal)
            break

    # Spice
    if any(t in text for t in MILD_TERMS):
        filters["max_spice"] = 2
        matched.append("mild")
    elif any(t in text for t in SPICY_TERMS) and "hot day" not in text:
        filters["min_spice"] = 3
        matched.append("spicy")

    # Weather / temperature affinity
    if any(t in text for t in COLD_WEATHER):
        context["weather"] = "cold"
        matched.append("cold weather")
    elif any(t in text for t in HOT_WEATHER):
        context["weather"] = "hot"
        matched.append("hot weather")

    # Light vs hearty — expressed as a calorie ceiling / floor
    if any(t in text for t in LIGHT_TERMS):
        filters["max_calories"] = 500
        matched.append("light")
    elif any(t in text for t in HEARTY_TERMS):
        filters["min_calories"] = 600
        matched.append("hearty")

    # Speed
    if any(t in text for t in QUICK_TERMS):
        filters["max_prep_time"] = 12
        matched.append("quick")

    # Budget
    budget = _find_budget(text)
    if budget is not None:
        filters["max_price"] = budget
        matched.append(f"under €{budget:g}")

    # Rating
    if "best" in text or "top rated" in text or "highly rated" in text:
        filters["min_rating"] = 4.4
        matched.append("top rated")

    return {"filters": filters, "context": context, "matched": matched}
