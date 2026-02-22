import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import { savePalette } from "@/lib/utils/paletteUtils";
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

// ─── Save Modal ───────────────────────────────────────────────────────────────

export function SaveModal() {
  const { modal, slots, mode, saveName, setSaveName, closeModal, openModal } =
    useChromaStore();
  const hexes = slots.map((s) => s.color.hex);

  const handleSave = () => {
    savePalette(saveName.trim() || "Unnamed", hexes, mode);
    closeModal();
  };

  return (
    <Dialog
      open={modal === "save"}
      onOpenChange={(open) => !open && closeModal()}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSaveName("");
              openModal("save");
            }}
            title="Save palette"
          >
            ♡
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save Palette</DialogTitle>
        </DialogHeader>
        <div
          style={{
            display: "flex",
            height: 36,
            borderRadius: 3,
            overflow: "hidden",
            gap: 2,
            marginBottom: 12,
          }}
        >
          {hexes.map((h, i) => (
            <div key={i} style={{ flex: 1, background: h }} />
          ))}
        </div>
        <input
          className="ch-inp"
          value={saveName}
          onChange={(e) => setSaveName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="Name your palette…"
          maxLength={40}
          autoFocus
          autoComplete="off"
        />
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <Button variant="default" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
