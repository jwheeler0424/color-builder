import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useHotkeyList } from "@/providers/hotkey.provider";

// ─── Shortcuts Modal ──────────────────────────────────────────────────────────

export function ShortcutsModal() {
  const modal = useChromaStore((s) => s.modal);
  const closeModal = useChromaStore((s) => s.closeModal);
  const openModal = useChromaStore((s) => s.openModal);

  const hotkeys = useHotkeyList();

  // Group by .group field
  const groups: Record<string, typeof hotkeys> = {};
  for (const hk of hotkeys) {
    const g = hk.group || "General";
    if (!groups[g]) groups[g] = [];
    groups[g].push(hk);
  }

  function keyLabel(hk: (typeof hotkeys)[0]): string {
    const parts: string[] = [];
    if (hk.ctrl) parts.push("Ctrl");
    if (hk.shift) parts.push("Shift");
    const k = hk.key === "space" ? "Space" : hk.key.toUpperCase();
    parts.push(k);
    return parts.join("+");
  }
  return (
    <Dialog
      open={modal === "shortcuts"}
      onOpenChange={(open) => !open && closeModal()}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title="Shortcuts"
            onClick={() => openModal("shortcuts")}
            className="text-muted-foreground"
          >
            ?
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5 min-w-85">
          {Object.entries(groups).map(([group, keys]) => (
            <div key={group}>
              <div className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 font-display font-semibold">
                {group}
              </div>
              <div className="flex flex-col gap-1.5">
                {keys.map((hk) => (
                  <div
                    key={hk.key + (hk.ctrl ? "c" : "") + (hk.shift ? "s" : "")}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-secondary-foreground text-[12px]">
                      {hk.label}
                    </span>
                    <kbd className="inline-block px-2 py-0.5 border border-input rounded text-[11px] text-muted-foreground font-mono bg-muted whitespace-nowrap shrink-0">
                      {keyLabel(hk)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {hotkeys.length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              Navigate to a view to see its shortcuts.
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
