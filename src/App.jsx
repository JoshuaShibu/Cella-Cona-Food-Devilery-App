import { useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./pages/Home.page";
import CartPage from "./pages/Cart.page";
import ThemeToggle from "./components/ThemeToggle";

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

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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
            <ThemeToggle />
            <button className="button ghost">Gratis testen</button>
            <button className="button primary">Anmelden</button>
          </div>
          <Link className="nav-cart" to="/cart" aria-label="View cart">
            <span className="nav-cart-icon">🛒</span>
            <span className="nav-cart-count">{cartCount}</span>
          </Link>
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
