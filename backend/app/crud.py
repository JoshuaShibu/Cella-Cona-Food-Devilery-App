from sqlalchemy.orm import Session

from . import models, schemas


def get_dishes(db: Session) -> list[models.Dish]:
    return db.query(models.Dish).all()


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
                category=item.tag,
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
