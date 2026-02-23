import { createFileRoute, Outlet } from "@tanstack/react-router";
import Header from "@/components/layout/header";
import {
  ExportModal,
  SaveModal,
  ShareModal,
  ShortcutsModal,
} from "@/components/modals";
import { useChromaStore } from "@/stores/chroma-store/chroma.store";

// Pathless layout route — wraps all /palette, /picker, etc. routes
// with the ChromaShell (header nav + modal layer) without adding a URL segment.
export const Route = createFileRoute("/_chroma")({
  component: ChromaShell,
});

function ChromaShell() {
  const { modal } = useChromaStore();

  return (
    <div className="ch-app">
      <Header />

      <div className="ch-views">
        <Outlet />
      </div>

      {modal === "export" && <ExportModal />}
      {modal === "share" && <ShareModal />}
      {modal === "save" && <SaveModal />}
      {modal === "shortcuts" && <ShortcutsModal />}
    </div>
  );
}
