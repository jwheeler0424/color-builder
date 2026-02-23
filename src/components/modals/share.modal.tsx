import { useMemo, useState } from "react";
import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import { encodeUrl } from "@/lib/utils";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

// ─── Share Modal ──────────────────────────────────────────────────────────────

export function ShareModal() {
  const modal = useChromaStore((s) => s.modal);
  const slots = useChromaStore((s) => s.slots);
  const mode = useChromaStore((s) => s.mode);
  const closeModal = useChromaStore((s) => s.closeModal);
  const openModal = useChromaStore((s) => s.openModal);

  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    const hexes = slots.map((s) => s.color.hex);
    return encodeUrl(hexes, mode);
  }, [slots, mode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Dialog
      open={modal === "share"}
      onOpenChange={(open) => !open && closeModal()}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title="Share URL"
            onClick={() => openModal("share")}
          >
            ⤴
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share Palette</DialogTitle>
          <DialogDescription>
            Anyone with this URL can load your exact palette.
          </DialogDescription>
        </DialogHeader>
        <textarea
          readOnly
          value={url}
          rows={2}
          onFocus={(e) => e.target.select()}
          className="w-full bg-muted border border-border rounded px-2.5 py-2 text-[11px] text-secondary-foreground font-mono leading-relaxed resize-none outline-none focus:border-ring transition-colors"
        />

        <div className="flex h-6 rounded overflow-hidden gap-px">
          {slots.map((s, i) => (
            <div
              key={`${s.color.hex}-${i}`}
              className="flex-1"
              style={{ background: s.color.hex }}
            />
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Close</Button>} />
          <Button variant="default" onClick={handleCopy}>
            {copied ? "✓ Copied" : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
