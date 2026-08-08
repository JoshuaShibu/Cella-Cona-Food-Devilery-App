from datetime import datetime

from sqlalchemy import ForeignKey, String, Integer, Float, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Dish(Base):
    __tablename__ = "dishes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Float)
    category: Mapped[str | None] = mapped_column(String(80), index=True)
    image_url: Mapped[str | None] = mapped_column(String(500))
    tag: Mapped[str | None] = mapped_column(String(80))
    rating: Mapped[float | None] = mapped_column(Float)
    is_available: Mapped[bool] = mapped_column(default=True)

    # --- Recommendation feature columns ---
    cuisine: Mapped[str | None] = mapped_column(String(80), index=True)
    tags: Mapped[str | None] = mapped_column(String(255))          # comma-separated
    spice_level: Mapped[int] = mapped_column(Integer, default=1)   # 1 (mild) - 5 (very hot)
    is_vegetarian: Mapped[bool] = mapped_column(Boolean, default=False)
    is_vegan: Mapped[bool] = mapped_column(Boolean, default=False)
    is_gluten_free: Mapped[bool] = mapped_column(Boolean, default=False)
    meal_times: Mapped[str | None] = mapped_column(String(120))    # comma-separated
    temp_affinity: Mapped[str | None] = mapped_column(String(20))  # warm | light | neutral
    order_count: Mapped[int] = mapped_column(Integer, default=0)   # popularity signal

    details: Mapped["DishDetail"] = relationship(
        back_populates="dish", uselist=False, cascade="all, delete-orphan"
    )
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="dish")

    def tag_list(self) -> list[str]:
        return [t for t in (self.tags or "").split(",") if t]

    def meal_time_list(self) -> list[str]:
        return [m for m in (self.meal_times or "").split(",") if m]


class DishDetail(Base):
    __tablename__ = "dish_details"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dish_id: Mapped[int] = mapped_column(ForeignKey("dishes.id"), unique=True)
    calories: Mapped[int | None] = mapped_column(Integer)
    ingredients: Mapped[str | None] = mapped_column(Text)
    allergens: Mapped[str | None] = mapped_column(String(255))
    prep_time_minutes: Mapped[int | None] = mapped_column(Integer)

    dish: Mapped[Dish] = relationship(back_populates="details")


class User(Base):
    """A diner. Preferences here drive personalised recommendations."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)

    # Hard constraints — always applied as filters, never just down-weighted.
    is_vegetarian: Mapped[bool] = mapped_column(Boolean, default=False)
    is_vegan: Mapped[bool] = mapped_column(Boolean, default=False)
    needs_gluten_free: Mapped[bool] = mapped_column(Boolean, default=False)
    allergens: Mapped[str | None] = mapped_column(String(255))  # comma-separated

    # Soft preferences — used as scoring signals.
    spice_tolerance: Mapped[int] = mapped_column(Integer, default=3)  # 1-5
    avg_budget: Mapped[float] = mapped_column(Float, default=11.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    interactions: Mapped[list["Interaction"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def allergen_list(self) -> list[str]:
        return [a.strip() for a in (self.allergens or "").split(",") if a.strip()]


class Interaction(Base):
    """
    A single user-dish event. This is the training signal for collaborative
    filtering: who ate what, when, and how much they liked it.
    """

    __tablename__ = "interactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    dish_id: Mapped[int] = mapped_column(ForeignKey("dishes.id"), index=True)

    rating: Mapped[float | None] = mapped_column(Float)  # 1-5, user's own rating
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    # Context captured at order time — powers the contextual layer.
    ordered_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    meal_time: Mapped[str | None] = mapped_column(String(20))   # breakfast|lunch|dinner|snack
    day_of_week: Mapped[int | None] = mapped_column(Integer)    # 0=Mon .. 6=Sun
    weather: Mapped[str | None] = mapped_column(String(20))     # cold|mild|hot

    user: Mapped[User] = relationship(back_populates="interactions")
    dish: Mapped[Dish] = relationship()


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(120))
    customer_email: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(40), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"))
    dish_id: Mapped[int] = mapped_column(ForeignKey("dishes.id"))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float)

    order: Mapped[Order] = relationship(back_populates="items")
    dish: Mapped[Dish] = relationship(back_populates="order_items")
