"""Static seed data for dishes. Edit this list to change what gets seeded."""

DISHES = [
    {
        "name": "Margherita Pizza",
        "description": "Classic tomato, mozzarella, and basil.",
        "price": 9.50,
        "category": "Pizza",
        "tag": "Vegetarian",
        "is_available": True,
        "details": {
            "calories": 780,
            "ingredients": "Tomato, mozzarella, basil, olive oil",
            "allergens": "Gluten, Dairy",
            "prep_time_minutes": 15,
        },
    },
    {
        "name": "Chicken Caesar Salad",
        "description": "Grilled chicken, romaine, parmesan, Caesar dressing.",
        "price": 8.75,
        "category": "Salads",
        "tag": "High Protein",
        "is_available": True,
        "details": {
            "calories": 520,
            "ingredients": "Chicken, romaine, parmesan, croutons, Caesar dressing",
            "allergens": "Gluten, Dairy, Egg",
            "prep_time_minutes": 10,
        },
    },
    {
        "name": "Veggie Wrap",
        "description": "Grilled vegetables, hummus, and feta in a whole wheat wrap.",
        "price": 7.25,
        "category": "Wraps",
        "tag": "Vegetarian",
        "is_available": True,
        "details": {
            "calories": 430,
            "ingredients": "Whole wheat wrap, hummus, grilled vegetables, feta",
            "allergens": "Gluten, Dairy",
            "prep_time_minutes": 8,
        },
    },
]