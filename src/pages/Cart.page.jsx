import { useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Link, useNavigate } from "react-router-dom";

const formatPrice = (value) =>
  value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

function CheckoutForm({ total, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

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
      setError(result.error.message || "Payment failed. Try again.");
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
            Processing...
          </span>
        ) : (
          `Pay ${formatPrice(total)}`
        )}
      </button>
      {status === "error" && <p className="payment-error">{error}</p>}
    </form>
  );
}

function PaymentModal({ total, onClose, onSuccess }) {
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";

  useEffect(() => {
    const createIntent = async () => {
      try {
        setLoading(true);
        setError("");
        if (!stripeKey) {
          setError("Add VITE_STRIPE_PUBLISHABLE_KEY to enable Stripe checkout.");
          return;
        }
        const response = await fetch(`${apiUrl}/create-payment-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Math.round(total * 100) }),
        });
        if (!response.ok) {
          throw new Error("Unable to start Stripe checkout.");
        }
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(err.message || "Stripe setup failed.");
      } finally {
        setLoading(false);
      }
    };
    createIntent();
  }, [apiUrl, stripeKey, total]);

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
              <p className="eyebrow">Stripe checkout</p>
              <h3>Complete your payment</h3>
            </div>
            <button
              className="payment-close"
              type="button"
              onClick={onClose}
              aria-label="Close payment"
            >
              ×
            </button>
          </div>
        )}
        <div className="payment-body">
          {!showSuccess && (
            <div className="payment-summary">
              <span>Total</span>
              <strong>{formatPrice(total)}</strong>
            </div>
          )}
          {showSuccess ? (
            <div className="payment-success-card">
              <div className="payment-success">
                <span className="success-check" aria-hidden="true" />
                <span>Payment received. Thank you!</span>
              </div>
              <p className="payment-redirect">Taking you back to the menu…</p>
              <button className="button primary" type="button" onClick={onClose}>
                Close
              </button>
            </div>
          ) : loading ? (
            <p className="payment-note">Preparing Stripe checkout…</p>
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
              Stripe test mode is enabled. Use a test card like 4242 4242 4242 4242.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CartPage({ cartItems, subtotal, createOrder, clearCart }) {
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

  return (
    <section className="cart" id="cart">
      <div className="section-head">
        <div>
          <p className="eyebrow">Your cart</p>
          <h2>Order summary</h2>
        </div>
        <Link className="cart-back" to="/">
          Continue shopping
        </Link>
      </div>
      <div className="cart-grid">
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <p className="cart-empty">Your cart is empty. Add dishes first.</p>
          ) : (
            cartItems.map((item) => (
              <div key={item.title} className="cart-row">
                <div className="cart-row-info">
                  <h4>{item.title}</h4>
                  <span>
                    {formatPrice(item.price)} · Qty {item.quantity}
                  </span>
                </div>
                <strong>{formatPrice(item.price * item.quantity)}</strong>
              </div>
            ))
          )}
        </div>
        <aside className="cart-summary">
          <h3>Summary</h3>
          <label className="cart-field">
            Name
            <input
              type="text"
              placeholder="Alex Doe"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </label>
          <label className="cart-field">
            Email
            <input
              type="email"
              placeholder="alex@example.com"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
          </label>
          <div className="cart-summary-row">
            <span>Subtotal</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <div className="cart-summary-row">
            <span>Delivery</span>
            <strong>Free</strong>
          </div>
          <div className="cart-summary-total">
            <span>Total</span>
            <strong>{formatPrice(subtotal)}</strong>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => setIsPaymentOpen(true)}
            disabled={!canCheckout}
          >
            Checkout
          </button>
          {orderStatus === "saving" && <p className="order-status">Saving your order…</p>}
          {orderStatus === "saved" && (
            <p className="order-status success">Payment received. Order saved.</p>
          )}
          {orderStatus === "error" && (
            <p className="order-status error">Could not save order. Please try again.</p>
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

