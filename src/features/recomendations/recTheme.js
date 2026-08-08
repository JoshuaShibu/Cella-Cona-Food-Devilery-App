import { createTheme } from "@mui/material/styles";

/**
 * The chat recommend drawer is a fixed-dark surface (near-black, warm
 * undertone) with an orange accent — regardless of whether the site itself
 * is in light/dark mode. MUI components inside it (Typography, Chip,
 * Button) pull text/border colors from this nested theme rather than the
 * app's global theme, so they render correctly no matter what the rest of
 * the site is doing.
 *
 * The homepage teaser card (RecommendSection's "Recommend me" pitch) stays
 * on the light look it always had — filters.css sets explicit ink colors
 * on `.rec-teaser-card` the same way it did before, so wrapping it in this
 * dark theme doesn't change its appearance.
 */
export const recTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#d85a30" },
    background: {
      default: "#181310",
      paper: "#181310",
    },
    text: {
      primary: "#f5f1ec",
      secondary: "rgba(245, 241, 236, 0.62)",
    },
    divider: "rgba(245, 241, 236, 0.14)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  },
});