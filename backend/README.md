# Backend (FastAPI + SQLite)

## Step-by-step setup
1) Create a virtual environment
   - `python -m venv .venv`
2) Activate it
   - PowerShell: `.venv\Scripts\Activate.ps1`
3) Install dependencies
   - `pip install -r requirements.txt`
4) Run the API
   - `uvicorn app.main:app --reload`
5) Open docs
   - `http://127.0.0.1:8000/docs`

## What this backend provides
- `Dish` and `DishDetail` tables to store dishes and their details.
- `Order` and `OrderItem` tables to store orders and order line items.

## Example payloads
Create a dish:
```json
{
  "name": "Citrus Chicken Bowl",
  "description": "Bright citrus glaze, brown rice, seasonal veg.",
  "price": 9.5,
  "category": "High-Protein",
  "image_url": "/images/food-01.jpg",
  "is_available": true,
  "details": {
    "calories": 540,
    "ingredients": "Chicken, rice, citrus glaze, broccoli",
    "allergens": "Soy",
    "prep_time_minutes": 15
  }
}
```

Create an order:
```json
{
  "customer_name": "Alex",
  "customer_email": "alex@example.com",
  "items": [
    { "dish_id": 1, "quantity": 2 },
    { "dish_id": 3, "quantity": 1 }
  ]
}
```
