"""Database CRUD operations for dishes and orders."""

from sqlalchemy import asc, desc, func
from sqlalchemy.orm import Session

from . import models, schemas


# ----------------------------------------------------------------------
# Dishes
# ----------------------------------------------------------------------

SORT_COLUMNS = {
    "name": models.Dish.name,
    "price": models.Dish.price,
    "rating": models.Dish.rating,
    "order_count": models.Dish.order_count,
}


def get_dishes(
    db: Session,
    category: str | None = None,
    cuisine: str | None = None,
    tag: str | None = None,
    search: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_rating: float | None = None,
    max_spice: int | None = None,
    is_vegetarian: bool | None = None,
    is_vegan: bool | None = None,
    is_gluten_free: bool | None = None,
    is_available: bool | None = None,
    sort_by: str = "name",
    order: str = "asc",
    limit: int = 50,
    offset: int = 0,
) -> list[models.Dish]:
    query = db.query(models.Dish)

    if category:
        query = query.filter(models.Dish.category == category)
    if cuisine:
        query = query.filter(models.Dish.cuisine == cuisine)
    if tag:
        # tags is a comma-separated string; match the tag as a whole token.
        query = query.filter(models.Dish.tags.ilike(f"%{tag}%"))
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            models.Dish.name.ilike(pattern) | models.Dish.description.ilike(pattern)
        )
    if min_price is not None:
        query = query.filter(models.Dish.price >= min_price)
    if max_price is not None:
        query = query.filter(models.Dish.price <= max_price)
    if min_rating is not None:
        query = query.filter(models.Dish.rating >= min_rating)
    if max_spice is not None:
        query = query.filter(models.Dish.spice_level <= max_spice)
    if is_vegetarian is not None:
        query = query.filter(models.Dish.is_vegetarian == is_vegetarian)
    if is_vegan is not None:
        query = query.filter(models.Dish.is_vegan == is_vegan)
    if is_gluten_free is not None:
        query = query.filter(models.Dish.is_gluten_free == is_gluten_free)
    if is_available is not None:
        query = query.filter(models.Dish.is_available == is_available)

    sort_column = SORT_COLUMNS.get(sort_by, models.Dish.name)
    query = query.order_by(desc(sort_column) if order == "desc" else asc(sort_column))

    return query.offset(offset).limit(limit).all()


def get_facets(db: Session) -> dict:
    """Distinct filter values plus price bounds — used to build the UI filter bar."""
    categories = [
        r[0] for r in db.query(models.Dish.category)
        .filter(models.Dish.category.isnot(None)).distinct().order_by(models.Dish.category)
    ]
    cuisines = [
        r[0] for r in db.query(models.Dish.cuisine)
        .filter(models.Dish.cuisine.isnot(None)).distinct().order_by(models.Dish.cuisine)
    ]

    tag_rows = db.query(models.Dish.tags).filter(models.Dish.tags.isnot(None)).all()
    tags = sorted({t for (row,) in tag_rows for t in row.split(",") if t})

    price_min, price_max = db.query(
        func.min(models.Dish.price), func.max(models.Dish.price)
    ).first()

    return {
        "categories": categories,
        "cuisines": cuisines,
        "tags": tags,
        "price_range": {
            "min": round(price_min or 0, 2),
            "max": round(price_max or 0, 2),
        },
        "spice_levels": [1, 2, 3, 4, 5],
        "sort_options": list(SORT_COLUMNS.keys()),
        "total_dishes": db.query(func.count(models.Dish.id)).scalar(),
    }


def get_dish(db: Session, dish_id: int) -> models.Dish | None:
    return db.query(models.Dish).filter(models.Dish.id == dish_id).first()


def create_dish(db: Session, dish: schemas.DishCreate) -> models.Dish:
    payload = dish.model_dump(exclude={"details"})
    db_dish = models.Dish(**payload)
    if dish.details:
        db_dish.details = models.DishDetail(**dish.details.model_dump())
    db.add(db_dish)
    db.commit()
    db.refresh(db_dish)
    return db_dish


# ----------------------------------------------------------------------
# Orders
# ----------------------------------------------------------------------

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

        # Keep the popularity signal fresh for the recommender.
        dish.order_count = (dish.order_count or 0) + item.quantity

    db.commit()
    db.refresh(db_order)
    return db_order


def get_orders(db: Session) -> list[models.Order]:
    return db.query(models.Order).all()


def get_order(db: Session, order_id: int) -> models.Order | None:
    return db.query(models.Order).filter(models.Order.id == order_id).first()
