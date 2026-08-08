import os
from typing import Optional

import stripe
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .database import SessionLocal, engine
from . import models, schemas, crud, recommender

load_dotenv()
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Cella & Cona API",
    description="Smart lunch ordering with a hybrid recommendation engine.",
    version="2.0.0",
)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
extra_origins = os.getenv("CORS_ORIGINS")
if extra_origins:
    allowed_origins.extend(
        [origin.strip() for origin in extra_origins.split(",") if origin.strip()]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok"}


# ----------------------------------------------------------------------
# Dishes — filtering, sorting, pagination
# ----------------------------------------------------------------------

@app.get("/dishes", response_model=list[schemas.Dish], tags=["dishes"])
def list_dishes(
    category: Optional[str] = None,
    cuisine: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    max_spice: Optional[int] = Query(None, ge=1, le=5),
    is_vegetarian: Optional[bool] = None,
    is_vegan: Optional[bool] = None,
    is_gluten_free: Optional[bool] = None,
    is_available: Optional[bool] = None,
    sort_by: str = Query("name", pattern="^(name|price|rating|order_count|prep_time)$"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """Browse the menu with full filtering, sorting, and pagination."""
    return crud.get_dishes(
        db,
        category=category,
        cuisine=cuisine,
        tag=tag,
        search=search,
        min_price=min_price,
        max_price=max_price,
        min_rating=min_rating,
        max_spice=max_spice,
        is_vegetarian=is_vegetarian,
        is_vegan=is_vegan,
        is_gluten_free=is_gluten_free,
        is_available=is_available,
        sort_by=sort_by,
        order=order,
        limit=limit,
        offset=offset,
    )


@app.get("/dishes/facets", tags=["dishes"])
def dish_facets(db: Session = Depends(get_db)):
    """
    Available filter values, for building the UI filter bar dynamically
    instead of hardcoding category lists in the frontend.
    """
    return crud.get_facets(db)


@app.get("/dishes/{dish_id}", response_model=schemas.Dish, tags=["dishes"])
def get_dish(dish_id: int, db: Session = Depends(get_db)):
    dish = crud.get_dish(db, dish_id)
    if dish is None:
        raise HTTPException(status_code=404, detail="Dish not found")
    return dish


@app.post("/dishes", response_model=schemas.Dish, status_code=201, tags=["dishes"])
def create_dish(payload: schemas.DishCreate, db: Session = Depends(get_db)):
    return crud.create_dish(db, payload)


# ----------------------------------------------------------------------
# Recommendations
# ----------------------------------------------------------------------

@app.get(
    "/recommendations",
    response_model=schemas.RecommendationResponse,
    tags=["recommendations"],
)
def get_recommendations(
    user_id: Optional[int] = None,
    limit: int = Query(10, ge=1, le=50),
    meal_time: Optional[str] = Query(None, pattern="^(breakfast|lunch|dinner|snack)$"),
    weather: Optional[str] = Query(None, pattern="^(cold|mild|hot)$"),
    temp_celsius: Optional[float] = None,
    day_of_week: Optional[int] = Query(None, ge=0, le=6),
    exclude_ordered: bool = True,
    db: Session = Depends(get_db),
):
    """
    Hybrid recommendations blending content similarity, collaborative
    filtering, and contextual signals (meal time, weather, day of week).

    Works without a `user_id` — anonymous visitors get popularity- and
    context-driven picks instead of personalised ones.
    """
    if user_id is not None:
        if not db.query(models.User).filter(models.User.id == user_id).first():
            raise HTTPException(status_code=404, detail="User not found")

    results = recommender.recommend(
        db,
        user_id=user_id,
        limit=limit,
        meal_time=meal_time,
        weather=weather,
        temp_celsius=temp_celsius,
        day_of_week=day_of_week,
        exclude_ordered=exclude_ordered,
    )

    resolved_meal = meal_time or recommender.infer_meal_time()
    resolved_weather = weather or recommender.infer_weather_bucket(temp_celsius)

    strategy = "personalised" if user_id else "popularity+context"
    if user_id and results and results[0]["signals"]["content"] == 0:
        strategy = "cold-start"

    return {
        "context": {
            "user_id": user_id,
            "meal_time": resolved_meal,
            "weather": resolved_weather,
            "day_of_week": day_of_week,
        },
        "strategy": strategy,
        "results": results,
    }


@app.get(
    "/dishes/{dish_id}/similar",
    response_model=list[schemas.SimilarDish],
    tags=["recommendations"],
)
def get_similar_dishes(
    dish_id: int,
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db),
):
    """Content-based 'you might also like' — no user history required."""
    if not db.query(models.Dish).filter(models.Dish.id == dish_id).first():
        raise HTTPException(status_code=404, detail="Dish not found")
    return recommender.similar_dishes(db, dish_id, limit=limit)


# ----------------------------------------------------------------------
# Users & interactions — the training signal
# ----------------------------------------------------------------------

@app.get("/users", response_model=list[schemas.User], tags=["users"])
def list_users(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    return db.query(models.User).limit(limit).all()


@app.get("/users/{user_id}", response_model=schemas.User, tags=["users"])
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.post("/users", response_model=schemas.User, status_code=201, tags=["users"])
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = models.User(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@app.get(
    "/users/{user_id}/history",
    response_model=list[schemas.Interaction],
    tags=["users"],
)
def user_history(user_id: int, db: Session = Depends(get_db)):
    return (
        db.query(models.Interaction)
        .filter(models.Interaction.user_id == user_id)
        .order_by(models.Interaction.ordered_at.desc())
        .all()
    )


@app.post(
    "/interactions",
    response_model=schemas.Interaction,
    status_code=201,
    tags=["users"],
)
def record_interaction(
    payload: schemas.InteractionCreate, db: Session = Depends(get_db)
):
    """
    Record that a user ordered (and optionally rated) a dish. Every call here
    makes the next round of recommendations a little better.
    """
    from datetime import datetime

    if not db.query(models.User).filter(models.User.id == payload.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")
    dish = db.query(models.Dish).filter(models.Dish.id == payload.dish_id).first()
    if not dish:
        raise HTTPException(status_code=404, detail="Dish not found")

    now = datetime.utcnow()
    interaction = models.Interaction(
        user_id=payload.user_id,
        dish_id=payload.dish_id,
        rating=payload.rating,
        quantity=payload.quantity,
        ordered_at=now,
        meal_time=payload.meal_time or recommender.infer_meal_time(now),
        day_of_week=now.weekday(),
        weather=payload.weather,
    )
    db.add(interaction)
    dish.order_count = (dish.order_count or 0) + payload.quantity
    db.commit()
    db.refresh(interaction)
    return interaction


# ----------------------------------------------------------------------
# Orders
# ----------------------------------------------------------------------

@app.get("/orders", response_model=list[schemas.Order], tags=["orders"])
def list_orders(db: Session = Depends(get_db)):
    return crud.get_orders(db)


@app.get("/orders/{order_id}", response_model=schemas.Order, tags=["orders"])
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.post("/orders", response_model=schemas.Order, status_code=201, tags=["orders"])
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_order(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ----------------------------------------------------------------------
# Payments
# ----------------------------------------------------------------------

@app.post("/create-payment-intent", tags=["payments"])
def create_payment_intent(payload: schemas.PaymentIntentCreate):
    if not stripe.api_key:
        raise HTTPException(
            status_code=500,
            detail="STRIPE_SECRET_KEY is not configured on the server.",
        )
    if stripe.api_key.startswith("pk_"):
        raise HTTPException(
            status_code=500,
            detail="STRIPE_SECRET_KEY must be a secret key (starts with sk_).",
        )
    try:
        intent = stripe.PaymentIntent.create(
            amount=payload.amount,
            currency="eur",
            automatic_payment_methods={"enabled": True},
        )
        return {"clientSecret": intent.client_secret}
    except stripe.APIConnectionError as exc:
        raise HTTPException(
            status_code=504,
            detail="Stripe connection timed out. Check network access.",
        ) from exc
    except stripe.StripeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        ) from exc
