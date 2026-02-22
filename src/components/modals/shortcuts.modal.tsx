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

// ─── Shortcuts Modal ──────────────────────────────────────────────────────────

export function ShortcutsModal() {
  const shortcuts = [
    { keys: "Space", desc: "Generate new palette" },
    { keys: "Ctrl+Z", desc: "Undo last generation" },
    { keys: "Escape", desc: "Close modal / cancel" },
    { keys: "?", desc: "Show this shortcuts panel" },
  ];
  const { modal, closeModal, openModal } = useChromaStore();
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
          >
            ?
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {shortcuts.map(({ keys, desc }) => (
            <div
              key={keys}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--ch-t2)" }}>
                {desc}
              </span>
              <kbd
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  border: "1px solid var(--ch-b2)",
                  borderRadius: 3,
                  fontSize: 11,
                  color: "var(--ch-t3)",
                  fontFamily: "var(--ch-fm)",
                  background: "var(--ch-s2)",
                }}
              >
                {keys}
              </kbd>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
