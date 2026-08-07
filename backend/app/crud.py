"""Database CRUD operations for dishes and orders."""

from sqlalchemy.orm import Session  # pylint: disable=import-error
from sqlalchemy import asc, desc

from . import models, schemas


def get_dishes(
    db: Session,
    category: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    is_available: bool | None = None,
    sort_by: str = "name",
    order: str = "asc",
) -> list[models.Dish]:
    query = db.query(models.Dish)

    if category:
        query = query.filter(models.Dish.category == category)
    if tag:
        query = query.filter(models.Dish.tag == tag)
    if search:
        query = query.filter(models.Dish.name.ilike(f"%{search}%"))
    if min_price is not None:
        query = query.filter(models.Dish.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Dish.price <= max_price)
    if is_available is not None:
        query = query.filter(models.Dish.is_available == is_available)

    sort_column = {
        "name": models.Dish.name,
        "price": models.Dish.price,
        "rating": models.Dish.rating,
    }.get(sort_by, models.Dish.name)

    query = query.order_by(desc(sort_column) if order == "desc" else asc(sort_column))

    return query.all()


def get_dish(db: Session, dish_id: int) -> models.Dish | None:
    return db.query(models.Dish).filter(models.Dish.id == dish_id).first()


def create_dish(db: Session, dish: schemas.DishCreate) -> models.Dish:
    db_dish = models.Dish(
        name=dish.name,
        description=dish.description,
        price=dish.price,
        category=dish.category,
        image_url=dish.image_url,
        is_available=dish.is_available,
    )
    if dish.details:
        db_dish.details = models.DishDetail(**dish.details.model_dump())
    db.add(db_dish)
    db.commit()
    db.refresh(db_dish)
    return db_dish


def create_order(db: Session, order: schemas.OrderCreate) -> models.Order:
    db_order = models.Order(
        customer_name=order.customer_name,
        customer_email=order.customer_email,
    )
    db.add(db_order)
    db.flush()

    for item in order.items:
        dish = None
        if item.dish_id is not None:
            dish = get_dish(db, item.dish_id)
        if dish is None and item.name and item.unit_price is not None:
            dish = models.Dish(
                name=item.name,
                price=item.unit_price,
                is_available=True,
            )
            db.add(dish)
            db.flush()
        if dish is None:
            raise ValueError("Dish not found and no fallback details provided")
        db_item = models.OrderItem(
            order_id=db_order.id,
            dish_id=dish.id,
            quantity=item.quantity,
            unit_price=item.unit_price if item.unit_price is not None else dish.price,
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_order)
    return db_order


def get_orders(db: Session) -> list[models.Order]:
    return db.query(models.Order).all()


def get_order(db: Session, order_id: int) -> models.Order | None:
    return db.query(models.Order).filter(models.Order.id == order_id).first()
