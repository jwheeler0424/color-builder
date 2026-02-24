import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import * as z from "zod";

export type Theme = "light" | "dark" | "auto";

const STORAGE_KEY = "chroma-theme";

export const getThemeServerFn = createServerFn().handler(
  (): Theme => (getCookie(STORAGE_KEY) as Theme | undefined) ?? "auto",
);

const themeValidator = z.enum(["light", "dark", "auto"]);

export const setThemeServerFn = createServerFn()
  .inputValidator(themeValidator)
  .handler(({ data }) =>
    setCookie(STORAGE_KEY, data, {
      httpOnly: false, // readable client-side if ever needed
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    }),
  );
