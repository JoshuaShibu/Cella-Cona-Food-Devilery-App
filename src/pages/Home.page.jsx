import Menu from "../features/menu/Menu";
import heroDish from "../images/food-hero.jpg";
import { useTranslation } from "react-i18next";

export default function HomePage({ addToCart }) {
  const { t } = useTranslation();

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="pill">{t("home.pill")}</span>
          <h1>{t("home.heroTitle")}</h1>
          <p>{t("home.heroBody")}</p>
          <div className="hero-actions">
            <button className="button primary">{t("home.bookTeamLunch")}</button>
            <button className="button ghost">{t("home.downloadMenu")}</button>
          </div>
        </div>
        <div className="hero-visual">
          <img src={heroDish} alt={t("home.heroImageAlt")} />
          <div className="hero-stats">
            <div>
              <strong>200+</strong>
              <span>{t("home.statActiveTeams")}</span>
            </div>
            <div>
              <strong>9/10</strong>
              <span>{t("home.statSatisfaction")}</span>
            </div>
            <div>
              <strong>€7.50</strong>
              <span>{t("home.statTaxFreePerDish")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust">
        <div className="trust-card">
          <h3>{t("home.trustedTitle")}</h3>
          <p>{t("home.trustedBody")}</p>
          <button className="button ghost">{t("home.requestOffer")}</button>
        </div>
        <div className="trust-stats">
          <div>
            <strong>30-40%</strong>
            <span>{t("home.trustStat1")}</span>
          </div>
          <div>
            <strong>92%</strong>
            <span>{t("home.trustStat2")}</span>
          </div>
          <div>
            <strong>1,9 Mio</strong>
            <span>{t("home.trustStat3")}</span>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-head">
          <div>
            <p className="eyebrow">{t("home.featuresEyebrow")}</p>
            <h2>{t("home.featuresTitle")}</h2>
          </div>
          <button className="button ghost">{t("home.learnMore")}</button>
        </div>
        <div className="feature-grid">
          <article>
            <h3>{t("home.feature1Title")}</h3>
            <p>{t("home.feature1Body")}</p>
          </article>
          <article>
            <h3>{t("home.feature2Title")}</h3>
            <p>{t("home.feature2Body")}</p>
          </article>
          <article>
            <h3>{t("home.feature3Title")}</h3>
            <p>{t("home.feature3Body")}</p>
          </article>
        </div>
      </section>

      <Menu addToCart={addToCart} />
      <section className="solutions" id="solutions">
        <div className="solutions-text">
          <p className="eyebrow">{t("home.stepsEyebrow")}</p>
          <h2>{t("home.stepsTitle")}</h2>
          <ol>
            <li>{t("home.step1")}</li>
            <li>{t("home.step2")}</li>
            <li>{t("home.step3")}</li>
          </ol>
          <button className="button primary">{t("home.bookTestLunch")}</button>
        </div>
        <div className="solutions-cards">
          <div className="solution-card">
            <h4>{t("home.solution1Title")}</h4>
            <p>{t("home.solution1Body")}</p>
          </div>
          <div className="solution-card light">
            <h4>{t("home.solution2Title")}</h4>
            <p>{t("home.solution2Body")}</p>
          </div>
          <div className="solution-card">
            <h4>{t("home.solution3Title")}</h4>
            <p>{t("home.solution3Body")}</p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div>
          <h2>{t("home.ctaTitle")}</h2>
          <p>{t("home.ctaBody")}</p>
        </div>
        <button className="button primary">{t("home.ctaStart")}</button>
      </section>
    </>
  );
}

