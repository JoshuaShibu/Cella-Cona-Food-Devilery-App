import { useEffect, useMemo, useRef, useState } from "react";
import { dishesServices } from "../../services/dishes.services";
import {
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Typography,
  Tooltip,
  Button,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import FilterBar from "../../components/filterBar/FilterBar";

const DEFAULT_FILTERS = { sort_by: "name", order: "asc" };

export default function Menu({ addToCart, removeFromCart, cartItems = [] }) {
  const { t, i18n } = useTranslation();
  const [dishes, setDishes] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const quantities = useMemo(
    () =>
      cartItems.reduce((map, entry) => {
        map[entry.id] = entry.quantity;
        return map;
      }, {}),
    [cartItems]
  );

  // Debounce the search box so we aren't firing a request per keystroke.
  const debounceRef = useRef();
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput || undefined }));
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  // Filtering and sorting happen server-side, so this refetches on any change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    dishesServices(filters)
      .then((data) => {
        if (!cancelled) setDishes(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("menu.loadError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, t]);

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
          <input
            placeholder={t("menu.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label={t("menu.searchPlaceholder")}
          />
          {searchInput && (
            <button
              type="button"
              className="button primary"
              onClick={() => setSearchInput("")}
            >
              {t("menu.clear")}
            </button>
          )}
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        resultCount={dishes.length}
      />

      {error && <p className="menu-error">{error}</p>}

      {!loading && !error && dishes.length === 0 && (
        <div className="menu-empty">
          <p>{t("menu.noResults")}</p>
          <Button onClick={() => { setSearchInput(""); setFilters(DEFAULT_FILTERS); }}>
            {t("filters.clearAll")}
          </Button>
        </div>
      )}

      <div className={`menu-grid${loading ? " menu-grid--loading" : ""}`}>
        {dishes.map((item) => {
          const qty = quantities[item.id] || 0;
          const isActive = qty > 0;

          return (
            <Card
              key={item.id}
              className={`menu-card${isActive ? " menu-card--active" : ""}`}
            >
              <CardMedia component="img" image={item.image_url} alt={item.name} />

              <CardContent className="menu-card-container">
                <div className="menu-card-tags">
                  <div className="menu-tag">{item.category}</div>
                  {item.is_vegan && (
                    <div className="menu-tag menu-tag--diet">{t("filters.vegan")}</div>
                  )}
                  {!item.is_vegan && item.is_vegetarian && (
                    <div className="menu-tag menu-tag--diet">
                      {t("filters.vegetarian")}
                    </div>
                  )}
                  {item.spice_level >= 4 && (
                    <div className="menu-tag menu-tag--spicy">
                      {t("filters.spicy")}
                    </div>
                  )}
                </div>

                <div className="menu-card-header">
                  <Typography variant="h6" component="h3">
                    {item.name}
                  </Typography>
                  <span className="menu-price">{formatPrice(item.price)}</span>
                </div>

                <Tooltip title={item.description}>
                  <Typography
                    className="menu-description"
                    variant="h6"
                    component="h3"
                  >
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
                <div
                  className={`menu-cart-row${
                    isActive ? "" : " menu-cart-row--hidden"
                  }`}
                >
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
                    <span key={qty} className="menu-added-icon">
                      🛒
                    </span>
                    {t("menu.addedToCart")}
                  </div>
                </div>
              </CardActions>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
