import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "./ui/button";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import { setThemeServerFn } from "@/lib/theme";

export function ThemeToggle() {
  const { theme } = useRouteContext({ from: "__root__" });
  const router = useRouter();

  function toggleTheme() {
    const themes = ["light", "dark", "auto"] as const;
    const nextTheme = themes[(themes.indexOf(theme) + 1) % themes.length];
    setThemeServerFn({ data: nextTheme }).then(() => router.invalidate());
  }

  return (
    <Button variant="outline" size={"icon"} aria-label="Toggle theme">
      {theme === "dark" ? <Moon /> : theme === "light" ? <Sun /> : <Monitor />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
