import os
import stripe
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from .database import SessionLocal, engine
from . import models, schemas, crud

load_dotenv()
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cella & Cona API")

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


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/dishes", response_model=list[schemas.Dish])
def list_dishes(db: Session = Depends(get_db)):
    return crud.get_dishes(db)


@app.get("/dishes/{dish_id}", response_model=schemas.Dish)
def get_dish(dish_id: int, db: Session = Depends(get_db)):
    dish = crud.get_dish(db, dish_id)
    if dish is None:
        raise HTTPException(status_code=404, detail="Dish not found")
    return dish


@app.post("/dishes", response_model=schemas.Dish, status_code=201)
def create_dish(payload: schemas.DishCreate, db: Session = Depends(get_db)):
    return crud.create_dish(db, payload)


@app.get("/orders", response_model=list[schemas.Order])
def list_orders(db: Session = Depends(get_db)):
    return crud.get_orders(db)


@app.get("/orders/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = crud.get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.post("/orders", response_model=schemas.Order, status_code=201)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_order(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/create-payment-intent")
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
    except stripe.error.APIConnectionError as exc:
        raise HTTPException(
            status_code=504,
            detail="Stripe connection timed out. Check network access.",
        ) from exc
    except stripe.error.StripeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Stripe error: {exc.user_message or str(exc)}",
        ) from exc
