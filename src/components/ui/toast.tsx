import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CircleCheck, CircleAlert, Info, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export const toast = ToastPrimitive.createToastManager();
export const localToast = ToastPrimitive.createToastManager();

export type ToasterProps = Omit<ToastPrimitive.Provider.Props, "children"> & {
  position?: "top-center" | "bottom-right";
  className?: string;
};

const icons = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
  warning: TriangleAlert,
  loading: LoaderCircle,
};

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager();
  return toasts.map((item) => {
    const Icon = icons[item.type as keyof typeof icons];
    return (
      <ToastPrimitive.Root
        key={item.id}
        toast={item}
        data-slot="toast"
        className="pointer-events-auto relative w-full rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg transition-[opacity,transform] duration-200 data-limited:hidden data-starting-style:translate-y-2 data-starting-style:opacity-0 data-ending-style:translate-x-4 data-ending-style:opacity-0"
      >
        <ToastPrimitive.Content className="flex gap-3">
          {Icon && (
            <Icon
              aria-hidden="true"
              className={cn("mt-0.5 size-4 shrink-0", item.type === "loading" && "animate-spin")}
            />
          )}
          <div className="min-w-0 flex-1">
            <ToastPrimitive.Title className="text-sm font-semibold" />
            <ToastPrimitive.Description className="mt-1 text-sm text-muted-foreground" />
            {item.actionProps && (
              <ToastPrimitive.Action
                render={<Button variant="outline" size="sm" />}
                {...item.actionProps}
                className="mt-2"
              />
            )}
          </div>
          <ToastPrimitive.Close
            aria-label="Dismiss notification"
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <X className="size-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Content>
      </ToastPrimitive.Root>
    );
  });
}

function Toaster({
  position = "bottom-right",
  className,
  toastManager = toast,
  ...props
}: ToasterProps) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} {...props}>
      <ToastPrimitive.Portal>
        <ToastPrimitive.Viewport
          aria-label="Notifications"
          className={cn(
            "pointer-events-none fixed z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 outline-none",
            position === "top-center" ? "top-4 left-1/2 -translate-x-1/2" : "right-4 bottom-4",
            className,
          )}
        >
          <ToastList />
        </ToastPrimitive.Viewport>
      </ToastPrimitive.Portal>
    </ToastPrimitive.Provider>
  );
}

function ToasterGlobal(props: ToasterProps) {
  return <Toaster position="top-center" {...props} />;
}

function ToasterLocal(props: ToasterProps) {
  return <Toaster position="bottom-right" toastManager={localToast} {...props} />;
}

export { Toaster, ToasterGlobal, ToasterLocal };
