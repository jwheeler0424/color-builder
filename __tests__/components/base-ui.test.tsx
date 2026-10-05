import { describe, expect, mock, test } from "bun:test";
import { act, fireEvent, render } from "@testing-library/react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast, ToasterGlobal } from "@/components/ui/toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

describe("Base UI drawer", () => {
  test("labels its popup and reports close state", () => {
    const onOpenChange = mock();
    const view = render(
      <Drawer defaultOpen onOpenChange={onOpenChange}>
        <DrawerTrigger>Open tools</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Palette tools</DrawerTitle>
          <DrawerDescription>Choose a palette tool.</DrawerDescription>
          <DrawerClose>Close tools</DrawerClose>
        </DrawerContent>
      </Drawer>,
    );
    const popup = view.getByRole("dialog", { name: "Palette tools" });
    expect(popup).toHaveAttribute("data-swipe-direction", "down");
    fireEvent.click(view.getByRole("button", { name: "Close tools" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything());
  });

  test("supports native side direction and non-modal state", () => {
    const view = render(
      <Drawer defaultOpen swipeDirection="right" modal={false}>
        <DrawerContent>
          <DrawerTitle>Side tools</DrawerTitle>
          <DrawerDescription>Side panel</DrawerDescription>
        </DrawerContent>
      </Drawer>,
    );
    expect(view.getByRole("dialog")).toHaveAttribute("data-swipe-direction", "right");
    expect(document.querySelector('[data-slot="drawer-overlay"]')).not.toBeInTheDocument();
  });
});

test("Base UI OTP renders real input slots with controlled values", () => {
  const view = render(
    <>
      <label htmlFor="verification-code">Verification code</label>
      <InputOTP id="verification-code" maxLength={4} value="1234">
        <InputOTPGroup>
          {[0, 1, 2, 3].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </>,
  );
  expect(view.getAllByRole("textbox").map((input) => (input as HTMLInputElement).value)).toEqual([
    "1",
    "2",
    "3",
    "4",
  ]);
  expect(view.getByRole("textbox", { name: "Verification code" })).toHaveAttribute(
    "autocomplete",
    "one-time-code",
  );
});

test("Base UI popover exposes its label and contents", () => {
  const view = render(
    <Popover defaultOpen>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent aria-label="Tool navigation">
        <a href="/palette">Palette</a>
      </PopoverContent>
    </Popover>,
  );
  expect(view.getByRole("dialog", { name: "Tool navigation" })).toBeInTheDocument();
  expect(view.getByRole("link", { name: "Palette" })).toHaveAttribute("href", "/palette");
});

test("Base UI toast manager renders and dismisses a notification", () => {
  const view = render(<ToasterGlobal timeout={0} />);
  let id = "";
  act(() => {
    id = toast.add({ title: "Palette saved", description: "Saved locally", type: "success" });
  });
  expect(view.getByText("Palette saved")).toBeInTheDocument();
  act(() => {
    view.getByRole("dialog", { name: "Palette saved" }).focus();
  });
  expect(view.getByRole("button", { name: "Dismiss notification" })).toBeInTheDocument();
  act(() => {
    toast.close(id);
  });
});

test("checkbox and switch expose checked and disabled semantics", () => {
  const view = render(
    <>
      <Checkbox defaultChecked aria-label="Lock palette" />
      <Switch defaultChecked disabled aria-label="System theme" />
    </>,
  );
  expect(view.getByRole("checkbox", { name: "Lock palette" })).toBeChecked();
  expect(view.getByRole("switch", { name: "System theme" })).toBeChecked();
  expect(view.getByRole("switch", { name: "System theme" })).toBeDisabled();
});

test("tabs forward vertical orientation and selection", () => {
  const view = render(
    <Tabs defaultValue="rgb" orientation="vertical">
      <TabsList>
        <TabsTrigger value="rgb">RGB</TabsTrigger>
        <TabsTrigger value="hsl">HSL</TabsTrigger>
      </TabsList>
      <TabsContent value="rgb">RGB controls</TabsContent>
      <TabsContent value="hsl">HSL controls</TabsContent>
    </Tabs>,
  );
  expect(view.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
  expect(view.getByRole("tab", { name: "RGB" })).toHaveAttribute("aria-selected", "true");
  expect(view.getByText("RGB controls")).toBeInTheDocument();
});

test("toggle groups expose native pressed state", () => {
  const view = render(
    <ToggleGroup defaultValue={["rgb"]} orientation="vertical">
      <ToggleGroupItem value="rgb">RGB</ToggleGroupItem>
      <ToggleGroupItem value="hsl">HSL</ToggleGroupItem>
    </ToggleGroup>,
  );
  expect(view.getByRole("button", { name: "RGB" })).toHaveAttribute("aria-pressed", "true");
  expect(view.getByRole("button", { name: "RGB" })).toHaveAttribute("data-pressed");
});

test("select exposes its labelled trigger and current value", () => {
  const view = render(
    <Select defaultValue="oklab" items={[{ value: "oklab", label: "OKLab" }, { value: "rgb", label: "RGB" }]}>
      <SelectTrigger aria-label="Color space">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="oklab">OKLab</SelectItem>
        <SelectItem value="rgb">RGB</SelectItem>
      </SelectContent>
    </Select>,
  );
  expect(view.getByRole("combobox", { name: "Color space" })).toHaveTextContent("OKLab");
});

test("calendar renders the current month grid with Base UI buttons", () => {
  const view = render(<Calendar mode="single" defaultMonth={new Date(2026, 9, 1)} />);
  expect(view.getByRole("grid")).toBeInTheDocument();
  expect(view.container.querySelector('[data-slot="button"]')).toBeInTheDocument();
});

test("command search uses a labelled Base UI dialog", () => {
  const view = render(
    <CommandDialog defaultOpen title="Palette commands">
      <Command>
        <CommandInput placeholder="Search tools" />
        <CommandList>
          <CommandItem value="palette">Palette</CommandItem>
        </CommandList>
      </Command>
    </CommandDialog>,
  );
  expect(view.getByRole("dialog", { name: "Palette commands" })).toBeInTheDocument();
  expect(view.getByRole("combobox")).toBeInTheDocument();
});
