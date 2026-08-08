import { useEffect, useMemo, useRef, useState } from "react";
import { Typography, Button, Chip } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import StarIcon from "@mui/icons-material/Star";
import { useTranslation } from "react-i18next";
import { recTheme } from "./recTheme";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

const SUGGESTION_KEYS = [
  "chat.suggestion1",
  "chat.suggestion2",
  "chat.suggestion3",
  "chat.suggestion4",
];

const LOADING_KEYS = [
  "chat.loadingReading",
  "chat.loadingMatching",
  "chat.loadingRanking",
];

const PAGE_SIZE = 8;

/**
 * Chat-style recommendations. The user types a free-text request; the current
 * panel slides out, a loader runs, and the results slide in.
 *
 * Phases: idle -> exiting -> loading -> results
 */
export default function ChatRecommendations({
  userId,
  addToCart,
  removeFromCart,
  cartItems = [],
  onClose,
  onCheckout,
}) {
  const { t, i18n } = useTranslation();
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("idle");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loadingLine, setLoadingLine] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const timers = useRef([]);
  const queryRef = useRef("");

  // Same cartItems -> { [dishId]: quantity } shape Menu.jsx uses, so the
  // stepper here reflects whatever is already in the cart.
  const quantities = useMemo(
    () =>
      cartItems.reduce((map, entry) => {
        map[entry.id] = entry.quantity;
        return map;
      }, {}),
    [cartItems]
  );

  // Drives the sticky cart bar — lets people check out without first
  // closing the drawer and hunting for the header's cart icon, which sits
  // behind the drawer's own backdrop while it's open.
  const cartCount = cartItems.reduce((sum, entry) => sum + entry.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (sum, entry) => sum + entry.price * entry.quantity,
    0
  );

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (phase !== "loading") return;
    const id = setInterval(
      () => setLoadingLine((n) => (n + 1) % LOADING_KEYS.length),
      900
    );
    return () => clearInterval(id);
  }, [phase]);

  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const formatPrice = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);

  const ask = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    queryRef.current = trimmed;
    setError(null);
    setPhase("exiting");
    setLoadingLine(0);
    setHasMore(false);

    const exitDelay = setTimeout(() => setPhase("loading"), 340);
    timers.current.push(exitDelay);

    try {
      const response = await fetch(`${apiUrl}/recommendations/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmed,
          user_id: userId,
          limit: PAGE_SIZE,
          offset: 0,
        }),
      });
      if (!response.ok) throw new Error("Request failed");
      const json = await response.json();

      // Hold the loader briefly so it doesn't flash on a fast response.
      const settle = setTimeout(() => {
        setData(json);
        setHasMore(json.results.length === PAGE_SIZE);
        setPhase("results");
      }, 700);
      timers.current.push(settle);
    } catch {
      const fail = setTimeout(() => {
        setError(t("chat.error"));
        setPhase("idle");
      }, 400);
      timers.current.push(fail);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(`${apiUrl}/recommendations/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryRef.current,
          user_id: userId,
          limit: PAGE_SIZE,
          offset: data?.results.length ?? 0,
        }),
      });
      if (!response.ok) throw new Error("Request failed");
      const json = await response.json();
      setData((prev) => ({ ...json, results: [...prev.results, ...json.results] }));
      setHasMore(json.results.length === PAGE_SIZE);
    } catch {
      setError(t("chat.error"));
    } finally {
      setLoadingMore(false);
    }
  };

  const reset = () => {
    setPhase("exiting");
    const id = setTimeout(() => {
      setData(null);
      setInput("");
      setError(null);
      setHasMore(false);
      setPhase("idle");
    }, 340);
    timers.current.push(id);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    ask(input);
  };

  const busy = phase === "loading" || phase === "exiting";
  const results = data?.results ?? [];

  return (
    <ThemeProvider theme={recTheme}>
    <div className="rec-drawer-content">
    <div className="rec-drawer-scroll">
      <div className="rec-chat-head">
        <div className="rec-chat-head-text">
          <p className="eyebrow">{t("chat.eyebrow")}</p>
          <h2>{t("chat.title")}</h2>
          <p className="rec-chat-sub">{t("chat.subtitle")}</p>
        </div>
        {onClose && (
          <button
            type="button"
            className="rec-drawer-close"
            onClick={onClose}
            aria-label={t("chat.close")}
          >
            ✕
          </button>
        )}
      </div>

      <form className="rec-chat-bar" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          disabled={busy}
        />
        <button
          type="submit"
          className="rec-chat-send"
          disabled={!input.trim() || busy}
        >
          {t("chat.send")}
        </button>
      </form>

      {phase === "idle" && !data && (
        <div className="rec-chat-suggestions">
          {SUGGESTION_KEYS.map((key) => {
            const label = t(key);
            return (
              <button
                key={key}
                type="button"
                className="rec-chat-suggestion"
                onClick={() => {
                  setInput(label);
                  ask(label);
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="menu-error" style={{ marginTop: "1rem" }}>
          {error}
        </p>
      )}

      <div className="rec-stage">
        {phase === "loading" && (
          <div className="rec-panel rec-panel--enter rec-loader">
            <div className="rec-loader-dots">
              <span />
              <span />
              <span />
            </div>
            <p className="rec-loader-text">{t(LOADING_KEYS[loadingLine])}</p>
          </div>
        )}

        {phase === "results" && results.length > 0 && (
          <div className="rec-panel rec-panel--enter">
            <div className="rec-result-head">
              <p className="rec-query-echo">
                {data.query}
                {data.understood?.length > 0 && (
                  <span>{data.understood.join(" · ")}</span>
                )}
              </p>
              <button type="button" className="rec-reset" onClick={reset}>
                {t("chat.newSearch")}
              </button>
            </div>

            <div className="recommendations-list">
              {results.map(({ dish, reasons }) => {
                const qty = quantities[dish.id] || 0;
                const isActive = qty > 0;

                return (
                  <div
                    key={dish.id}
                    className={`rec-dish-row${isActive ? " rec-dish-row--active" : ""}`}
                  >
                    <img
                      className="rec-dish-thumb"
                      src={dish.image_url}
                      alt={dish.name}
                    />
                    <div className="rec-dish-info">
                      <div className="menu-card-header">
                        <Typography variant="subtitle1" component="h3">
                          {dish.name}
                        </Typography>
                        <div className="rec-dish-meta">
                          {dish.rating != null && (
                            <span className="rec-dish-rating">
                              <StarIcon fontSize="inherit" />
                              {dish.rating.toFixed(1)}
                            </span>
                          )}
                          <span className="menu-price">
                            {formatPrice(dish.price)}
                          </span>
                        </div>
                      </div>

                      {reasons.length > 0 && (
                        <div className="recommendation-reasons-block">
                          <p className="rec-why-label">
                            {t("chat.whyLabel")}
                          </p>
                          <div className="recommendation-reasons">
                            {reasons.map((reason) => (
                              <Chip
                                key={reason}
                                label={reason}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="menu-card-footer">
                        {!isActive && (
                          <Button
                            variant="contained"
                            fullWidth
                            size="small"
                            onClick={() => addToCart(dish)}
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
                              onClick={() => removeFromCart(dish)}
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
                              onClick={() => addToCart(dish)}
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="menu-load-more">
                <Button
                  variant="outlined"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t("menu.loadingMore") : t("menu.loadMore")}
                </Button>
              </div>
            )}
          </div>
        )}

        {phase === "results" && results.length === 0 && (
          <div className="rec-panel rec-panel--enter menu-empty">
            <p>{t("chat.noMatches")}</p>
            <button type="button" className="rec-reset" onClick={reset}>
              {t("chat.newSearch")}
            </button>
          </div>
        )}
      </div>
    </div>

    {cartCount > 0 && (
      <div className="rec-cart-bar">
        <div className="rec-cart-bar-info">
          <span key={cartCount} className="rec-cart-bar-count">
            {t("chat.cartItems", { count: cartCount })}
          </span>
          <span key={cartSubtotal} className="rec-cart-bar-total">
            {formatPrice(cartSubtotal)}
          </span>
        </div>
        <Button
          variant="contained"
          className="rec-cart-bar-cta"
          onClick={onCheckout}
        >
          {t("chat.goToCheckout")}
        </Button>
      </div>
    )}
    </div>
    </ThemeProvider>
  );
}