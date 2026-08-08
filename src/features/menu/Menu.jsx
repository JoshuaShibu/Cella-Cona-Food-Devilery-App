import { useEffect } from "react";
import { dishesServices } from "../../services/dishes.services";
import {
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Typography,
    Tooltip,
    Button
  } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useState } from "react";

  
export default function Menu ({addToCart, removeFromCart, cartItems = []}) {
    const { t, i18n } = useTranslation();
    const [dishes, setDishes] = useState([]);
    const [count, setCount] = useState(0);

    const quantities = cartItems.reduce((map, entry) => {
        map[entry.id] = entry.quantity;
        return map;
    }, {});

    useEffect(() => {
        setCount(count+1);
        const fetchDishes = async () => {
            const dishes = await dishesServices();
            setDishes(dishes);
        };
        fetchDishes();
    }, []);

    const locale = i18n.language === "de" ? "de-DE" : "en-US";
    const formatPrice = (value) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }).format(value);
    
    return (
        <section className="menu" id="menu">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("menu.popularDishes")}</p>
            <h2>{t("menu.title")}</h2>
          </div>
          <div className="search">
            <input placeholder={t("menu.searchPlaceholder")} />
            <button className="button primary">{t("menu.search")}</button>
          </div>
        </div>
        <div className="menu-grid">
          {dishes.map((item) => {
            const qty = quantities[item.id] || 0;
            const isActive = qty > 0;

            return (
            <Card key={item.id} className={`menu-card${isActive ? " menu-card--active" : ""}`}>
            <CardMedia
              component="img"
              image={item.image_url}
              alt={item.name}
            />

            <CardContent className="menu-card-container">
              <div className="menu-tag">{item.category}</div>
              <div className="menu-card-header">
                <Typography variant="h6" component="h3">
                  {item.name}
                </Typography>
                <span className="menu-price">{formatPrice(item.price)}</span>
              </div>
              <Tooltip title={item.description}>
                <Typography className="menu-description" variant="h6" component="h3">
                  {item.description}
                </Typography>
              </Tooltip>


              <Typography variant="body2" className="menu-rating">
                ⭐ {item.rating} · {t("menu.ratingSuffix")}
              </Typography>
            </CardContent>

            <CardActions className="menu-card-footer">
              {!isActive && (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => addToCart(item)}
                >
                  {t("menu.addToCart")}
                </Button>
              )}
              <div className={`menu-cart-row${isActive ? "" : " menu-cart-row--hidden"}`}>
                <div className="menu-stepper">
                  <button
                    type="button"
                    className="menu-stepper-btn"
                    onClick={() => removeFromCart(item)}
                    aria-label={t("menu.decreaseQty")}
                  >
                    −
                  </button>
                  <span key={qty} className="menu-stepper-qty">
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="menu-stepper-btn menu-stepper-btn--add"
                    onClick={() => addToCart(item)}
                    aria-label={t("menu.increaseQty")}
                  >
                    +
                  </button>
                </div>
                <div className="menu-added-chip">
                  <span key={qty} className="menu-added-icon">🛒</span>
                  {t("menu.addedToCart")}
                </div>
              </div>
            </CardActions>
          </Card>
            );
          })}
        </div>
      </section>
    )
}