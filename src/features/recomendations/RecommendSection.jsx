import { useState } from "react";
import { Drawer, Button } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import ChatRecommendations from "./ChatRecommendations";
import { recTheme } from "./recTheme";

/**
 * Homepage teaser for the chat recommendations: a short pitch + a
 * "Recommend me" button that opens ChatRecommendations in a right-hand
 * MUI Drawer instead of taking up space inline on the page.
 */
export default function RecommendSection({
  userId,
  addToCart,
  removeFromCart,
  cartItems,
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <ThemeProvider theme={recTheme}>
      <section className="rec-teaser" id="recommendations">
        <div className="rec-teaser-card">
          <div className="rec-teaser-text">
            <p className="eyebrow">{t("chat.eyebrow")}</p>
            <h2>{t("chat.title")}</h2>
            <p className="rec-chat-sub">{t("chat.subtitle")}</p>
          </div>
          <Button
            variant="contained"
            className="rec-teaser-button"
            onClick={() => setOpen(true)}
          >
            {t("chat.recommendMe")}
          </Button>
        </div>

        <Drawer
          anchor="right"
          open={open}
          onClose={() => setOpen(false)}
          slotProps={{
            paper: {
              className: "rec-drawer",
              // Belt-and-suspenders: sx is resolved through MUI's own
              // style pipeline, so it can't lose a specificity/injection
              // order fight the way the plain className rule just did.
              sx: {
                width: "min(460px, 100vw)",
                maxWidth: "100vw",
                bgcolor: "#181310",
                boxShadow: "-18px 0 44px -20px rgba(0, 0, 0, 0.6)",
              },
            },
          }}
        >
          <ChatRecommendations
            userId={userId}
            addToCart={addToCart}
            removeFromCart={removeFromCart}
            cartItems={cartItems}
            onClose={() => setOpen(false)}
          />
        </Drawer>
      </section>
    </ThemeProvider>
  );
}