import { useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import heroDish from "./images/food-hero.jpg";
import product1 from "./images/food-01.jpg";
import product2 from "./images/food-02.jpg";
import product3 from "./images/food-03.jpg";
import product4 from "./images/food-04.jpg";
import product5 from "./images/food-05.jpg";
import product6 from "./images/food-06.jpg";

const products = [
  {
    id: 1,
    title: "Citrus Chicken Bowl",
    tag: "High-Protein",
    rating: "4.9",
    price: 9.5,
    image: product1,
  },
  {
    id: 2,
    title: "Avocado Crunch Salad",
    tag: "Vegan",
    rating: "4.8",
    price: 8.9,
    image: product2,
  },
  {
    id: 3,
    title: "Miso Salmon Plate",
    tag: "Glutenfrei",
    rating: "4.7",
    price: 11.4,
    image: product3,
  },
  {
    id: 4,
    title: "Herbed Falafel Wrap",
    tag: "Veggie",
    rating: "4.8",
    price: 8.2,
    image: product4,
  },
  {
    id: 5,
    title: "Teriyaki Poke",
    tag: "Halal",
    rating: "4.9",
    price: 10.6,
    image: product5,
  },
  {
    id: 6,
    title: "Baked Sweet Potato",
    tag: "Low Carb",
    rating: "4.6",
    price: 7.6,
    image: product6,
  },
];

const formatPrice = (value) =>
  value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ""
);

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
      <button className="button primary" type="submit" disabled={!stripe || status === "processing"}>
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
              <p className="payment-redirect">
                Taking you back to the menu…
              </p>
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

function HomePage({ addToCart }) {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="pill">Fast &amp; Fresh UI inspiration</span>
          <h1>Smart Lunch fürs Team, delivered fast &amp; fresh.</h1>
          <p>
            30+ Gerichte pro Woche, passend für alle Ernährungsformen. Bestelle
            per App und stärke Teamspirit mit steuerfreiem Essenszuschuss.
          </p>
          <div className="hero-actions">
            <button className="button primary">Gratis Team-Lunch buchen</button>
            <button className="button ghost">Menü herunterladen</button>
          </div>
        </div>
        <div className="hero-visual">
          <img src={heroDish} alt="Hero dish" />
          <div className="hero-stats">
            <div>
              <strong>200+</strong>
              <span>active teams</span>
            </div>
            <div>
              <strong>9/10</strong>
              <span>satisfaction</span>
            </div>
            <div>
              <strong>€7.50</strong>
              <span>tax-free per dish</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust">
        <div className="trust-card">
          <h3>Trusted by 200+ Companies</h3>
          <p>Mehr Anwesenheit &amp; weniger Admin durch automatisiertes Lunching.</p>
          <button className="button ghost">Angebot anfordern</button>
        </div>
        <div className="trust-stats">
          <div>
            <strong>30-40%</strong>
            <span>mehr Leute im Büro</span>
          </div>
          <div>
            <strong>92%</strong>
            <span>nutzen es täglich</span>
          </div>
          <div>
            <strong>1,9 Mio</strong>
            <span>gelieferte Gerichte</span>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-head">
          <div>
            <p className="eyebrow">Warum Cella&amp;Cona</p>
            <h2>Lunch für Teams, die schnell wachsen</h2>
          </div>
          <button className="button ghost">Mehr erfahren</button>
        </div>
        <div className="feature-grid">
          <article>
            <h3>Personalisiert pro Mitarbeitenden</h3>
            <p>Individuelle Auswahl, Allergene &amp; Halal-Labels inklusive.</p>
          </article>
          <article>
            <h3>Lieferung bis 9:00 bestellen</h3>
            <p>Frisch gekocht, same-day geliefert, jederzeit skalierbar.</p>
          </article>
          <article>
            <h3>Automatisierte Abrechnung</h3>
            <p>Steuerkonform, eine Monatsrechnung, volle Budgetkontrolle.</p>
          </article>
        </div>
      </section>

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
          {products.map((item) => (
            <article key={item.title} className="menu-card">
              <img src={item.image} alt={item.title} />
              <div className="menu-tag">{item.tag}</div>
              <h3>{item.title}</h3>
              <p>⭐ {item.rating} · 300+ reviews</p>
              <div className="menu-card-footer">
                <span className="menu-price">{formatPrice(item.price)}</span>
                <button
                  className="button primary"
                  type="button"
                  onClick={() => addToCart(item)}
                >
                  Add to cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="solutions" id="solutions">
        <div className="solutions-text">
          <p className="eyebrow">In 3 Schritten</p>
          <h2>Vom Test-Lunch zu einem täglichen Ritual</h2>
          <ol>
            <li>Lieferintervall &amp; Budget festlegen.</li>
            <li>Team bestellt in der App bis 9:00.</li>
            <li>Dashboard zeigt Nutzung und Zufriedenheit.</li>
          </ol>
          <button className="button primary">Kostenlosen Test-Lunch buchen</button>
        </div>
        <div className="solutions-cards">
          <div className="solution-card">
            <h4>ESG Ready</h4>
            <p>100% Mehrweg, weniger Verpackungsmüll.</p>
          </div>
          <div className="solution-card light">
            <h4>Hybrid Teams</h4>
            <p>Du bestimmst die Tage, wir liefern.</p>
          </div>
          <div className="solution-card">
            <h4>Support</h4>
            <p>Persönliche Beratung, schnelles Setup.</p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div>
          <h2>Frisches Mittagessen für alle – günstiger dank Essenszuschuss</h2>
          <p>Buche einen kostenlosen Test-Lunch für bis zu 50 Personen.</p>
        </div>
        <button className="button primary">Jetzt starten</button>
      </section>
    </>
  );
}

function CartPage({ cartItems, subtotal, createOrder, clearCart }) {
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
          {orderStatus === "saving" && (
            <p className="order-status">Saving your order…</p>
          )}
          {orderStatus === "saved" && (
            <p className="order-status success">Payment received. Order saved.</p>
          )}
          {orderStatus === "error" && (
            <p className="order-status error">
              Could not save order. Please try again.
            </p>
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

export default function App() {
  const [cartItems, setCartItems] = useState([]);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const addToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((entry) => entry.title === item.title);
      if (existing) {
        return prev.map((entry) =>
          entry.title === item.title
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const clearCart = () => setCartItems([]);

  const createOrder = async ({ name, email, items }) => {
    try {
      const response = await fetch(`${apiUrl}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_email: email,
          items: items.map((item) => ({
            dish_id: item.id,
            name: item.title,
            unit_price: item.price,
            tag: item.tag,
            quantity: item.quantity,
          })),
        }),
      });
      return response.ok;
    } catch (error) {
      console.error("Order creation failed", error);
      return false;
    }
  };

  return (
    <div className="page">
      <header className="site-header">
        <nav className="nav">
          <div className="logo">Cella<span>&amp;</span>Cona</div>
          <div className="nav-links">
            <a href="#menu">Daily Lunch</a>
            <a href="#features">Business Catering</a>
            <a href="#solutions">Unser Menü</a>
            <a href="#footer">Mehr</a>
          </div>
          <div className="nav-actions">
            <button className="button ghost">Gratis testen</button>
            <button className="button primary">Anmelden</button>
          </div>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage addToCart={addToCart} />} />
          <Route
            path="/cart"
            element={
              <CartPage
                cartItems={cartItems}
                subtotal={subtotal}
                createOrder={createOrder}
                clearCart={clearCart}
              />
            }
          />
        </Routes>
        {isHome && (
          <Link className="cart-fab" to="/cart" aria-label="View cart">
            <span className="cart-fab-icon">🛒</span>
            <span className="cart-fab-count">{cartCount}</span>
          </Link>
        )}
      </main>

      <footer className="site-footer" id="footer">
        <div>
          <div className="logo">Cella<span>&amp;</span>Cona</div>
          <p>questions@cellacona.com</p>
        </div>
        <div className="footer-links">
          <a href="#">Impressum</a>
          <a href="#">AGB für Firmenkunden</a>
          <a href="#">Datenschutz</a>
          <a href="#">Karriere</a>
        </div>
      </footer>
    </div>
  );
}
