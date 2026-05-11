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
import { useState } from "react";

  
const formatPrice = (value) =>
value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
});


export default function Menu ({addToCart}) {
    const { getDishes } = dishesServices();
    const [dishes, setDishes] = useState([]);
    useEffect(() => {
        const fetchDishes = async () => {
            const dishes = await getDishes();
            setDishes(dishes);
        };
        fetchDishes();
    }, []);
    
    return (
        <section className="menu" id="menu">
        <div className="section-head">
          <div>
            <p className="eyebrow">Beliebte Gerichte</p>
            <h2>Fast &amp; Fresh, inspiriert vom Dribbble Style</h2>
          </div>
          <div className="search">
            <input placeholder="Suche nach Gerichten..." />
            <button className="button primary">Suchen</button>
          </div>
        </div>
        <div className="menu-grid">
          {dishes.map((item) => (
            <Card key={item.id} className="menu-card">
            <CardMedia
              component="img"
              image={item.image_url}
              alt={item.title}
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
                ⭐ {item.rating} · 300+ reviews
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
                Add to cart
              </Button>
            </CardActions>
          </Card>
          ))}
        </div>
      </section>
    )
}