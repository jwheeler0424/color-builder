import { useState } from "react";
import { useChromaStore } from "@/stores/chroma-store/chroma.store";
import { encodeUrl } from "@/lib/utils/paletteUtils";
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
  const { modal, slots, mode, closeModal, openModal } = useChromaStore();
  const hexes = slots.map((s) => s.color.hex);
  const url = encodeUrl(hexes, mode);
  const [copied, setCopied] = useState(false);

  const copy = () => {
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
          style={{
            width: "100%",
            background: "var(--ch-s2)",
            border: "1px solid var(--ch-b1)",
            borderRadius: 2,
            color: "var(--ch-t2)",
            fontFamily: "var(--ch-fm)",
            fontSize: 11,
            padding: 9,
            resize: "none",
            outline: "none",
            lineHeight: 1.6,
          }}
        />
        <div
          style={{
            display: "flex",
            height: 24,
            borderRadius: 2,
            overflow: "hidden",
            gap: 2,
            marginTop: 8,
          }}
        >
          {hexes.map((h, i) => (
            <div key={i} style={{ flex: 1, background: h }} />
          ))}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Close</Button>} />
          <Button variant="default" onClick={copy}>
            {copied ? "✓ Copied" : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
