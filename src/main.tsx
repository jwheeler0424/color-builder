import "../node_modules/@tanstack/router-core/dist/esm/router.js";

import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { applyTheme, getTheme } from "@/lib/theme";

import { getRouter } from "./router";

applyTheme(getTheme());

const element = document.getElementById("root");
if (!element) throw new Error('Missing application root element "#root".');

const router = import.meta.hot ? (import.meta.hot.data.router ??= getRouter()) : getRouter();
const app = (
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);

if (import.meta.hot) {
  (import.meta.hot.data.root ??= createRoot(element)).render(app);
} else {
  createRoot(element).render(app);
}
