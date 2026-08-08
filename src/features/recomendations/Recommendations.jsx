import { useEffect, useState } from "react";
import { Card, CardMedia, CardContent, Typography, Button, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import { recommendationsService } from "../../services/dishes.services";

/**
 * Shows hybrid recommendations. Pass a userId for personalised results;
 * without one the backend falls back to popularity + context, which is still
 * a meaningful ordering for anonymous visitors.
 */
export default function Recommendations({ userId, addToCart, limit = 6 }) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    recommendationsService({ userId, limit })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, limit]);

  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const formatPrice = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);

  if (error) return null;
  if (loading) {
    return (
      <section className="recommendations">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("recommendations.eyebrow")}</p>
            <h2>{t("recommendations.title")}</h2>
          </div>
        </div>
        <div className="recommendations-grid">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="recommendation-card recommendation-card--skeleton" />
          ))}
        </div>
      </section>
    );
  }

  const results = data?.results ?? [];
  if (!results.length) return null;

  const { meal_time: mealTime, weather } = data.context ?? {};

  return (
    <section className="recommendations" id="recommendations">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t("recommendations.eyebrow")}</p>
          <h2>{t("recommendations.title")}</h2>
          <p className="recommendations-context">
            {t("recommendations.contextLine", {
              mealTime: t(`mealTimes.${mealTime}`, mealTime),
              weather: weather ? t(`weather.${weather}`, weather) : "",
            })}
          </p>
        </div>
      </div>

      <div className="recommendations-grid">
        {results.map(({ dish, reasons }) => (
          <Card key={dish.id} className="recommendation-card">
            <CardMedia component="img" image={dish.image_url} alt={dish.name} />
            <CardContent className="recommendation-card-body">
              <div className="menu-card-header">
                <Typography variant="subtitle1" component="h3">
                  {dish.name}
                </Typography>
                <span className="menu-price">{formatPrice(dish.price)}</span>
              </div>

              <div className="recommendation-reasons">
                {reasons.map((reason) => (
                  <Chip key={reason} label={reason} size="small" variant="outlined" />
                ))}
              </div>

              <Button
                variant="contained"
                fullWidth
                size="small"
                onClick={() => addToCart(dish)}
              >
                {t("menu.addToCart")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
