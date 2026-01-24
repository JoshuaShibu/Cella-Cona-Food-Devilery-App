from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from .database import SessionLocal, engine
from . import models, schemas, crud

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cella & Cona API")


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
