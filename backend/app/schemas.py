from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


# ----------------------------------------------------------------------
# Dish
# ----------------------------------------------------------------------

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
    cuisine: Optional[str] = None
    rating: Optional[float] = None
    tag: Optional[str] = None
    tags: Optional[str] = None
    image_url: Optional[str] = None
    is_available: bool = True
    spice_level: int = 1
    is_vegetarian: bool = False
    is_vegan: bool = False
    is_gluten_free: bool = False
    meal_times: Optional[str] = None
    temp_affinity: Optional[str] = None
    order_count: int = 0


class DishCreate(DishBase):
    details: Optional[DishDetailCreate] = None


class Dish(DishBase):
    id: int
    details: Optional[DishDetail] = None

    class Config:
        from_attributes = True


# ----------------------------------------------------------------------
# User
# ----------------------------------------------------------------------

class UserBase(BaseModel):
    name: str
    email: EmailStr
    is_vegetarian: bool = False
    is_vegan: bool = False
    needs_gluten_free: bool = False
    allergens: Optional[str] = None
    spice_tolerance: int = 3
    avg_budget: float = 11.0


class UserCreate(UserBase):
    pass


class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ----------------------------------------------------------------------
# Interaction
# ----------------------------------------------------------------------

class InteractionCreate(BaseModel):
    user_id: int
    dish_id: int
    rating: Optional[float] = None
    quantity: int = 1
    meal_time: Optional[str] = None
    weather: Optional[str] = None


class Interaction(BaseModel):
    id: int
    user_id: int
    dish_id: int
    rating: Optional[float] = None
    quantity: int
    ordered_at: datetime
    meal_time: Optional[str] = None
    day_of_week: Optional[int] = None
    weather: Optional[str] = None

    class Config:
        from_attributes = True


# ----------------------------------------------------------------------
# Recommendations
# ----------------------------------------------------------------------

class RecommendationSignals(BaseModel):
    content: float
    collaborative: float
    popularity: float
    context_multiplier: float


class Recommendation(BaseModel):
    dish: Dish
    score: float
    reasons: List[str]
    signals: RecommendationSignals


class RecommendationResponse(BaseModel):
    context: dict
    strategy: str
    results: List[Recommendation]


class SimilarDish(BaseModel):
    dish: Dish
    score: float

class ChatQuery(BaseModel):
    query: str
    user_id: Optional[int] = None
    limit: int = 8
    offset: int = 0


class ChatRecommendationResponse(BaseModel):
    query: str
    understood: List[str]
    context: dict
    results: List[Recommendation]


# ----------------------------------------------------------------------
# Orders
# ----------------------------------------------------------------------

class OrderItemBase(BaseModel):
    dish_id: Optional[int] = None
    name: Optional[str] = None
    unit_price: float = 0.0
    quantity: int = 1


class OrderItemCreate(OrderItemBase):
    pass


class OrderItem(OrderItemBase):
    id: int
    unit_price: float = 0.0

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


class PaymentIntentCreate(BaseModel):
    amount: int
