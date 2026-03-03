import { create } from "zustand";

export type PanelState = {
  open: boolean;
  openMobile: boolean;
};

export type PanelStore = {
  panels: Record<string, PanelState>;
  createPanel: (id?: string) => void;
  closeAll: () => void;
  openPanel: (id?: string) => void;
  closePanel: (id?: string) => void;
  togglePanel: (id?: string) => void;
  openMobilePanel: (id?: string) => void;
  closeMobilePanel: (id?: string) => void;
  toggleMobilePanel: (id?: string) => void;
  open: (id?: string) => boolean;
  openMobile: (id?: string) => boolean;
};

export function createNewPanel(newId?: string): {
  id: string;
  panel: PanelState;
} {
  const panelId = newId || "default";
  const id = `panel-${panelId}`;
  return {
    id,
    panel: {
      open: false,
      openMobile: false,
    },
  };
}

export const usePanelStore = create<PanelStore>()((set, get) => ({
  panels: {},
  createPanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      if (state.panels[panelId]) {
        return {};
      }
      const newPanels = { ...state.panels };
      const { panel } = createNewPanel(id);
      newPanels[panelId] = { ...panel };
      return { panels: newPanels };
    }),

  closeAll: () =>
    set((state) => {
      const newPanels = { ...state.panels };
      Object.keys(newPanels).forEach((key) => {
        newPanels[key] = { ...newPanels[key], open: false, openMobile: false };
      });
      return { panels: newPanels };
    }),
  openPanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, open: true };
      return { panels: newPanels };
    }),
  closePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, open: false };
      return { panels: newPanels };
    }),
  togglePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, open: !panel.open };
      return { panels: newPanels };
    }),
  openMobilePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, openMobile: true };
      return { panels: newPanels };
    }),
  closeMobilePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, openMobile: false };
      return { panels: newPanels };
    }),
  toggleMobilePanel: (id?: string) =>
    set((state) => {
      const panelId = `panel-${id || "default"}`;
      let panel = state.panels[panelId];
      if (!state.panels[panelId]) {
        panel = createNewPanel(id).panel;
      }
      const newPanels = { ...state.panels };
      newPanels[panelId] = { ...panel, openMobile: !panel.openMobile };
      return { panels: newPanels };
    }),
  open: (id?: string) => {
    const panelId = `panel-${id || "default"}`;
    const panel = get().panels[panelId];
    return panel ? panel.open : false;
  },
  openMobile: (id?: string) => {
    const panelId = `panel-${id || "default"}`;
    const panel = get().panels[panelId];
    return panel ? panel.openMobile : false;
  },
}));
