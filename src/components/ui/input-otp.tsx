"use client";

import * as React from "react";
import { OTPField as OTPPrimitive } from "@base-ui/react/otp-field";

import { cn } from "@/lib/utils";
import { MinusIcon } from "lucide-react";

const InputOTPContext = React.createContext(6);

function InputOTP({
  className,
  containerClassName,
  maxLength = 6,
  length = maxLength,
  onChange,
  onComplete,
  onValueChange,
  onValueComplete,
  ...props
}: Omit<OTPPrimitive.Root.Props, "length"> & {
  length?: number;
  maxLength?: number;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  containerClassName?: string;
}) {
  return (
    <InputOTPContext.Provider value={length}>
      <OTPPrimitive.Root
        data-slot="input-otp"
        length={length}
        onValueChange={(value, details) => {
          onValueChange?.(value, details);
          onChange?.(value);
        }}
        onValueComplete={(value, details) => {
          onValueComplete?.(value, details);
          onComplete?.(value);
        }}
        className={cn(
          "cn-input-otp flex items-center has-disabled:opacity-50",
          containerClassName,
          className,
        )}
        {...props}
      />
    </InputOTPContext.Provider>
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn(
        "has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive rounded-md has-aria-invalid:ring-[3px] flex items-center",
        className,
      )}
      {...props}
    />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: OTPPrimitive.Input.Props & {
  index: number;
}) {
  const length = React.useContext(InputOTPContext);

  return (
    <OTPPrimitive.Input
      data-slot="input-otp-slot"
      aria-label={`Character ${index + 1} of ${length}`}
      className={cn(
        "relative size-9 border-y border-r border-input bg-transparent text-center text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md focus:z-10 focus:border-ring focus:ring-[3px] focus:ring-ring/50 aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

function InputOTPSeparator({ ...props }: React.ComponentProps<"div">) {
  return (
    <OTPPrimitive.Separator
      data-slot="input-otp-separator"
      className="[&_svg:not([class*='size-'])]:size-4 flex items-center"
      {...props}
    >
      <MinusIcon />
    </OTPPrimitive.Separator>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
