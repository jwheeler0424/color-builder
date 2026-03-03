import { cn } from "@/lib/utils";
import { useDrawerStore } from "@/stores/drawer.store";

export function PanelDrawer() {
  const state = useDrawerStore((state) => state.state);
  return (
    <aside
      className={cn(
        "relative flex flex-col shrink bg-green-950 w-min overflow-hidden transition-transform duration-300",
      )}
    >
      <main
        className={cn(
          "relative h-full grow overflow-hidden bg-amber-500 w-88",
          state === "collapsed" && "translate-x-full",
        )}
      >
        Here is some text Here is some text Here is some text Here is some text
        Here is some text
      </main>
    </aside>
  );
}
