from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class DishDetailBase(BaseModel):
    calories: Optional[int] = None
    ingredients: Optional[str] = None
    allergens: Optional[str] = None
    prep_time_minutes: Optional[int] = None


class DishDetailCreate(DishDetailBase):
    pass


class DishDetail(DishDetailBase):
    id: int
    dish_id: int

    class Config:
        from_attributes = True


class DishBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    category: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True


class DishCreate(DishBase):
    details: Optional[DishDetailCreate] = None


class Dish(DishBase):
    id: int
    details: Optional[DishDetail] = None

    class Config:
        from_attributes = True


class OrderItemBase(BaseModel):
    dish_id: int
    quantity: int = 1


class OrderItemCreate(OrderItemBase):
    pass


class OrderItem(OrderItemBase):
    id: int
    unit_price: float

    class Config:
        from_attributes = True


class OrderBase(BaseModel):
    customer_name: str
    customer_email: EmailStr


class OrderCreate(OrderBase):
    items: List[OrderItemCreate]


class Order(OrderBase):
    id: int
    status: str
    created_at: datetime
    items: List[OrderItem]

    class Config:
        from_attributes = True
