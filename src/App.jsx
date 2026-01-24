import heroDish from "./images/food-hero.jpg";
import product1 from "./images/food-01.jpg";
import product2 from "./images/food-02.jpg";
import product3 from "./images/food-03.jpg";
import product4 from "./images/food-04.jpg";
import product5 from "./images/food-05.jpg";
import product6 from "./images/food-06.jpg";

const products = [
  {
    title: "Citrus Chicken Bowl",
    tag: "High-Protein",
    rating: "4.9",
    image: product1,
  },
  {
    title: "Avocado Crunch Salad",
    tag: "Vegan",
    rating: "4.8",
    image: product2,
  },
  {
    title: "Miso Salmon Plate",
    tag: "Glutenfrei",
    rating: "4.7",
    image: product3,
  },
  {
    title: "Herbed Falafel Wrap",
    tag: "Veggie",
    rating: "4.8",
    image: product4,
  },
  {
    title: "Teriyaki Poke",
    tag: "Halal",
    rating: "4.9",
    image: product5,
  },
  {
    title: "Baked Sweet Potato",
    tag: "Low Carb",
    rating: "4.6",
    image: product6,
  },
];

export default function App() {
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
