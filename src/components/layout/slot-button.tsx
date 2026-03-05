// ─── Props ────────────────────────────────────────────────────────────────────

import { useChromaStore } from "@/hooks/use-chroma-store";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils/tw";
import { useState } from "react";
import { PlusIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface SlotButtonProps {
  index: number;
  adjust?: boolean; // Whether this slot is at the start or end of the list (for styling)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SlotButton({ index, adjust }: SlotButtonProps) {
  const hoverSlot = useChromaStore((state) => state.hoverSlot);
  const [isHovering, setIsHovering] = useState(false);
  const isHoveringSlot = hoverSlot === index;
  const insertAt = index + 1;
  const adjustLeft = adjust && index !== -1;
  const adjustRight = adjust && index === -1;
  const { insertSlot } = useChromaStore();

  return (
    <aside
      className={cn(
        "relative flex h-full w-0 shrink-0 flex-col items-center justify-center z-10",
      )}
    >
      <Tooltip>
        <TooltipContent
          onMouseOver={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          Add a color
        </TooltipContent>
        <TooltipTrigger
          onMouseOver={() => setIsHovering(true)}
          render={
            <Button
              variant="secondary"
              size="icon-lg"
              className={cn(
                "rounded-full absolute top-1/2 z-20 size-12",
                "opacity-0 scale-70",
                "transition-all duration-200 ease-in-out",
                (isHovering || isHoveringSlot) && "opacity-100 scale-100",
                adjustLeft && "-translate-x-1/2",
                adjustRight && "translate-x-1/2",
              )}
              onPointerEnter={() => setIsHovering(true)}
              onPointerLeave={() => setIsHovering(false)}
              onClick={() => insertSlot(insertAt)}
            >
              <PlusIcon className="size-6" />
            </Button>
          }
        />
      </Tooltip>
    </aside>
  );
}
