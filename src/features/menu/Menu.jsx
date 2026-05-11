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

  
export default function Menu ({addToCart}) {
    const { t, i18n } = useTranslation();
    const { getDishes } = dishesServices();
    const [dishes, setDishes] = useState([]);
    useEffect(() => {
        const fetchDishes = async () => {
            const dishes = await getDishes();
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
          {dishes.map((item) => (
            <Card key={item.id} className="menu-card">
            <CardMedia
              component="img"
              image={item.image_url}
              alt={item.name}
            />
        
            <CardContent className="menu-card-container">
              <div className="menu-tag">{item.category}</div>
              <Typography variant="h6" component="h3">
                {item.name}
              </Typography>
              <Tooltip title={item.description}>
                <Typography className="menu-description" variant="h6" component="h3">
                  {item.description}
                </Typography>
              </Tooltip>
        
        
              <Typography variant="body2">
                ⭐ {item.rating} · {t("menu.ratingSuffix")}
              </Typography>
            </CardContent>
        
            <CardActions className="menu-card-footer">
              <span className="menu-price">
                {formatPrice(item.price)}
              </span>
        
              <Button
                variant="contained"
                onClick={() => addToCart(item)}
              >
                {t("menu.addToCart")}
              </Button>
            </CardActions>
          </Card>
          ))}
        </div>
      </section>
    )
}