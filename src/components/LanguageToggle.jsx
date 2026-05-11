import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", labelKey: "language.en" },
  { code: "de", labelKey: "language.de" },
];

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();

  return (
    <div className="language-toggle" role="group" aria-label={t("language.label")}>
      {LANGUAGES.map((language) => {
        const isActive = i18n.language === language.code;
        return (
          <button
            key={language.code}
            type="button"
            className={`language-toggle-button${isActive ? " active" : ""}`}
            onClick={() => i18n.changeLanguage(language.code)}
            aria-pressed={isActive}
          >
            {t(language.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
