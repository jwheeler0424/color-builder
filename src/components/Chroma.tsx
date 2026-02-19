import { useEffect } from "react";
import type { ViewId } from "@/types";
import { useChromaStore } from "@/hooks/useChromaStore";
import PaletteView from "./views/PaletteView";
import ColorPickerView from "./views/ColorPickerView";
import TintScaleView from "./views/TintScaleView";
import ColorBlindView from "./views/ColorBlindView";
import GradientView from "./views/GradientView";
import ConverterView from "./views/ConverterView";
import AccessibilityView from "./views/AccessibilityView";
import ImageExtractView from "./views/ImageExtractView";
import SavedView from "./views/SavedView";
import ContrastChecker from "./ContrastChecker";
import ColorMixer from "./ColorMixer";
import CssPreview from "./CssPreview";
import PaletteScoring from "./PaletteScoring";
import UtilityColorsView from "./views/UtilityColorsView";
import ThemeGeneratorView from "./views/ThemeGeneratorView";
import { ExportModal, ShareModal, SaveModal, ShortcutsModal } from "./Modals";
import Button from "./Button";
import "@/styles/chroma.css";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "pal", label: "Palette" },
  { id: "pick", label: "Picker" },
  { id: "utility", label: "Utility" },
  { id: "theme", label: "Theme" },
  { id: "scale", label: "Tint Scale" },
  { id: "grad", label: "Gradients" },
  { id: "mixer", label: "Mixer" },
  { id: "preview", label: "CSS Preview" },
  { id: "a11y", label: "Accessibility" },
  { id: "contrast", label: "Contrast" },
  { id: "sim", label: "Color Blind" },
  { id: "scoring", label: "Scoring" },
  { id: "conv", label: "Converter" },
  { id: "img", label: "Image Extract" },
  { id: "saved", label: "Saved" },
];

export default function Chroma() {
  const { state, dispatch, generate, undo } = useChromaStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (state.modal) {
        if (e.key === "Escape") dispatch({ type: "CLOSE_MODAL" });
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        generate();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if (e.key === "?") dispatch({ type: "OPEN_MODAL", modal: "shortcuts" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.modal, generate, undo, dispatch]);

  const setView = (view: ViewId) => dispatch({ type: "SET_VIEW", view });

  return (
    <div className="ch-app">
      <header className="ch-hdr">
        <div className="ch-brand">
          Chroma<sup>v3</sup>
        </div>
        <nav className="ch-nav">
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              className={`ch-nb${state.view === id ? " on" : ""}`}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="ch-hbtns">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            title="Undo (Ctrl+Z)"
          >
            ↩
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "OPEN_MODAL", modal: "share" })}
            title="Share URL"
          >
            ⤴
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              dispatch({ type: "SET_SAVE_NAME", name: "" });
              dispatch({ type: "OPEN_MODAL", modal: "save" });
            }}
            title="Save palette"
          >
            ♡
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "OPEN_MODAL", modal: "export" })}
            title="Export"
          >
            ↗
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "OPEN_MODAL", modal: "shortcuts" })}
            title="Keyboard shortcuts"
          >
            ?
          </Button>
        </div>
      </header>

      <div className="ch-views">
        {state.view === "pal" && (
          <PaletteView state={state} dispatch={dispatch} generate={generate} />
        )}
        {state.view === "pick" && (
          <ColorPickerView
            state={state}
            dispatch={dispatch}
            generate={generate}
          />
        )}
        {state.view === "utility" && (
          <UtilityColorsView state={state} dispatch={dispatch} />
        )}
        {state.view === "theme" && (
          <ThemeGeneratorView state={state} dispatch={dispatch} />
        )}
        {state.view === "scale" && (
          <TintScaleView
            state={state}
            dispatch={dispatch}
            generate={generate}
          />
        )}
        {state.view === "sim" && <ColorBlindView state={state} />}
        {state.view === "grad" && (
          <GradientView state={state} dispatch={dispatch} />
        )}
        {state.view === "conv" && (
          <ConverterView state={state} dispatch={dispatch} />
        )}
        {state.view === "a11y" && <AccessibilityView state={state} />}
        {state.view === "contrast" && (
          <ContrastChecker state={state} dispatch={dispatch} />
        )}
        {state.view === "mixer" && (
          <ColorMixer state={state} dispatch={dispatch} generate={generate} />
        )}
        {state.view === "preview" && <CssPreview state={state} />}
        {state.view === "scoring" && (
          <PaletteScoring state={state} dispatch={dispatch} />
        )}
        {state.view === "img" && (
          <ImageExtractView
            state={state}
            dispatch={dispatch}
            generate={generate}
          />
        )}
        {state.view === "saved" && (
          <SavedView state={state} dispatch={dispatch} />
        )}
      </div>

      {state.modal === "export" && (
        <ExportModal state={state} dispatch={dispatch} />
      )}
      {state.modal === "share" && (
        <ShareModal state={state} dispatch={dispatch} />
      )}
      {state.modal === "save" && (
        <SaveModal state={state} dispatch={dispatch} />
      )}
      {state.modal === "shortcuts" && <ShortcutsModal dispatch={dispatch} />}
    </div>
  );
}
