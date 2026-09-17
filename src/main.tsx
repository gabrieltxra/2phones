import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { I18nProvider } from "./i18n";
import App from "./App";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/oswald/400.css";
import "@fontsource/oswald/500.css";
import "./styles.css";
import "./refinements.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode><BrowserRouter><I18nProvider><App /></I18nProvider></BrowserRouter></StrictMode>,
);
