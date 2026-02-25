import { Monitor, Moon, Sun } from "lucide-react";
import { useRouteContext, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { setThemeServerFn, type Theme } from "@/lib/theme";

const CYCLE: Theme[] = ["light", "dark", "auto"];

const LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  auto: "Auto",
};

const NEXT_LABEL: Record<Theme, string> = {
  light: "Switch to dark mode",
  dark: "Switch to auto mode",
  auto: "Switch to light mode",
};

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "dark") return <Moon className="size-4" />;
  if (theme === "light") return <Sun className="size-4" />;
  return <Monitor className="size-4" />;
}

export function ThemeToggle() {
  const { theme } = useRouteContext({ from: "__root__" });
  const router = useRouter();

  function cycleTheme() {
    const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
    setThemeServerFn({ data: next }).then(() => router.invalidate());
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={NEXT_LABEL[theme]}
      title={`Theme: ${LABELS[theme]} — click to cycle`}
      className="text-muted-foreground"
    >
      <ThemeIcon theme={theme} />
      <span className="sr-only">{NEXT_LABEL[theme]}</span>
    </Button>
  );
}
