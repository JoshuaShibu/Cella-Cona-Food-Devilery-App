import { useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

function CheckoutForm({ total, onSuccess }) {
  const { t, i18n } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const formatPrice = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    setStatus("processing");
    setError("");
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + "/cart",
      },
      redirect: "if_required",
    });

    if (result.error) {
      setStatus("error");
      setError(result.error.message || t("cart.paymentFailed"));
      return;
    }
    onSuccess();
  };

  return (
    <form className="payment-form" onSubmit={handleSubmit}>
      <PaymentElement />
      <button
        className="button primary"
        type="submit"
        disabled={!stripe || status === "processing"}
      >
        {status === "processing" ? (
          <span className="payment-processing">
            <span className="spinner" aria-hidden="true" />
            {t("cart.paymentProcessing")}
          </span>
        ) : (
          t("cart.payWithAmount", { amount: formatPrice(total) })
        )}
      </button>
      {status === "error" && <p className="payment-error">{error}</p>}
    </form>
  );
}

function PaymentModal({ total, onClose, onSuccess }) {
  const { t, i18n } = useTranslation();
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const formatPrice = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);

  const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

  useEffect(() => {
    const createIntent = async () => {
      try {
        setLoading(true);
        setError("");
        if (!stripeKey) {
          setError(t("cart.paymentAddKey"));
          return;
        }
        const response = await fetch(`${apiUrl}/create-payment-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Math.round(total * 100) }),
        });
        if (!response.ok) {
          throw new Error(t("cart.paymentStartFailed"));
        }
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(err.message || t("cart.paymentSetupFailed"));
      } finally {
        setLoading(false);
      }
    };
    createIntent();
  }, [apiUrl, stripeKey, t, total]);

  useEffect(() => {
    if (!showSuccess) {
      return;
    }
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onClose, showSuccess]);

  const options = useMemo(
    () => ({
      clientSecret,
      appearance: {
        theme: "stripe",
      },
    }),
    [clientSecret]
  );

  return (
    <div className="payment-overlay" role="dialog" aria-modal="true">
      <div className="payment-modal">
        {!showSuccess && (
          <div className="payment-header">
            <div>
              <p className="eyebrow">{t("cart.paymentEyebrow")}</p>
              <h3>{t("cart.paymentTitle")}</h3>
            </div>
            <button
              className="payment-close"
              type="button"
              onClick={onClose}
              aria-label={t("cart.paymentClose")}
            >
              ×
            </button>
          </div>
        )}
        <div className="payment-body">
          {!showSuccess && (
            <div className="payment-summary">
              <span>{t("cart.total")}</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          )}
          {showSuccess ? (
            <div className="payment-success-card">
              <div className="payment-success">
                <span className="success-check" aria-hidden="true" />
                <span>{t("cart.paymentReceived")}</span>
              </div>
              <p className="payment-redirect">{t("cart.paymentRedirect")}</p>
              <button className="button primary" type="button" onClick={onClose}>
                {t("cart.close")}
              </button>
            </div>
          ) : loading ? (
            <p className="payment-note">{t("cart.paymentPreparing")}</p>
          ) : error ? (
            <p className="payment-error">{error}</p>
          ) : (
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm
                total={total}
                onSuccess={() => {
                  setShowSuccess(true);
                  onSuccess();
                }}
              />
            </Elements>
          )}
          {!showSuccess && (
            <p className="payment-note">
              {t("cart.testModeNote")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CartPage({ cartItems, subtotal, createOrder, clearCart }) {
  const { t, i18n } = useTranslation();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [orderStatus, setOrderStatus] = useState("idle");
  const redirectToMenuRef = useRef(false);
  const navigate = useNavigate();

  const canCheckout = cartItems.length > 0 && customerName && customerEmail;

  const handleClosePayment = () => {
    setIsPaymentOpen(false);
    if (redirectToMenuRef.current) {
      redirectToMenuRef.current = false;
      navigate("/", { replace: true });
      setTimeout(() => {
        requestAnimationFrame(() => {
          document.getElementById("menu")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }, 0);
    }
  };

  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const formatPrice = (value) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(value);

  return (
    <section className="cart" id="cart">
      <div className="section-head">
        <div>
          <p className="eyebrow">{t("cart.yourCart")}</p>
          <h2>{t("cart.orderSummary")}</h2>
        </div>
        <Link className="cart-back" to="/">
          {t("cart.continueShopping")}
        </Link>
      </div>
      <div className="cart-grid">
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <p className="cart-empty">{t("cart.empty")}</p>
          ) : (
            cartItems.map((item) => (
              <div key={item.title} className="cart-row">
                <div className="cart-row-info">
                  <h4>{item.title}</h4>
                  <span>
                    {formatPrice(item.price)} · {t("cart.qtyShort")} {item.quantity}
                  </span>
                </div>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </div>
            ))
          )}
        </div>
        <aside className="cart-summary">
          <h3>{t("cart.summary")}</h3>
          <label className="cart-field">
            {t("cart.name")}
            <input
              type="text"
              placeholder="Alex Doe"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </label>
          <label className="cart-field">
            {t("cart.email")}
            <input
              type="email"
              placeholder="alex@example.com"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
          </label>
          <div className="cart-summary-row">
            <span>{t("cart.subtotal")}</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <div className="cart-summary-row">
            <span>{t("cart.delivery")}</span>
            <strong>{t("cart.free")}</strong>
          </div>
          <div className="cart-summary-total">
            <span>{t("cart.total")}</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => setIsPaymentOpen(true)}
            disabled={!canCheckout}
          >
            {t("cart.checkout")}
          </button>
          {orderStatus === "saving" && <p className="order-status">{t("cart.saving")}</p>}
          {orderStatus === "saved" && (
            <p className="order-status success">{t("cart.saved")}</p>
          )}
          {orderStatus === "error" && (
            <p className="order-status error">{t("cart.saveError")}</p>
          )}
        </aside>
      </div>
      {isPaymentOpen && (
        <PaymentModal
          total={subtotal}
          onClose={handleClosePayment}
          onSuccess={async () => {
            const orderSnapshot = {
              name: customerName,
              email: customerEmail,
              items: cartItems,
            };
            setOrderStatus("saving");
            redirectToMenuRef.current = true;
            clearCart();
            setCustomerName("");
            setCustomerEmail("");
            const saved = await createOrder(orderSnapshot);
            if (saved) {
              setOrderStatus("saved");
            } else {
              setOrderStatus("error");
            }
          }}
        />
      )}
    </section>
  );
}

