import Menu from "../features/menu/Menu";
import heroDish from "../images/food-hero.jpg";



export default function HomePage({ addToCart }) {
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

      <Menu  addToCart={addToCart}/>
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

