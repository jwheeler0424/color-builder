import { create } from "zustand";

export type DrawerStore = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

export const useDrawerStore = create<DrawerStore>()((set) => ({
  state: "expanded",
  open: true,
  setOpen: (open) => set({ open }),
  openMobile: false,
  setOpenMobile: (open) => set({ openMobile: open }),
  isMobile: false,
  toggleSidebar: () =>
    set((state) => ({
      state: state.state === "expanded" ? "collapsed" : "expanded",
    })),
}));
