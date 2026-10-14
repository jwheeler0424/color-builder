# Project Structure

The application is a Bun-served client SPA with file-based TanStack React Router. `bun run dev`
generates routes and runs a managed route watcher alongside Bun HMR. `bun run start` serves source
in production mode; `bun run build` creates a separate static export in `dist/`, including public
files. Tests use Bun and Happy DOM; Oxlint and Oxfmt handle linting and formatting.

```text
src/
  index.ts                                      // Bun HTML server, public assets, development route watcher
  index.html                                    // document shell and CSS/module entrypoint
  main.tsx                                      // React client bootstrap, initial theme, RouterProvider
  components/
    auth/                                       // authentication screens
    common/                                     // reusable color controls and domain-specific inputs
      color-picker.panel.tsx
      color-wheel.tsx
      hex-input.tsx
      sliders/
    desktop/                                    // desktop shell, header, rails, and navigation
    global/                                     // app-wide components; ui/ remains the low-level primitive layer
      copy-value-row.tsx                        // copyable labeled value row shared across color pickers
      panel-section.tsx                         // bordered panel section shared by side panels
      section-label.tsx                         // shared compact uppercase section label
      tool-empty-state.tsx                      // configurable empty content for palette-dependent tools
      tool-section.tsx                           // shared section wrapper for tool controls
    layout/                                     // responsive shells, navigation, palette tools, and slot controls
      generate-controls.tsx
      mobile-shell.tsx
      palette-sheet.tsx
      slot-card.tsx
      tablet-shell.tsx
    marketing/                                  // public pages and marketing-specific composition
    modals/                                     // application dialogs and modal workflows
    ui/                                         // customized shadcn/Base UI primitives; avoid bulk regeneration
      button.tsx
      card.tsx
      dialog.tsx
      input.tsx
      navigation-menu.tsx
    views/                                      // feature screens and their view-specific composition
      accessibility.view.tsx
      hooks/                                        // application hooks for state, viewport, hotkeys, and focus behavior
      lib/
        constants/                                  // chroma, color-name, and color database constants/data
        engine/                                     // color math, palettes, accessibility, transforms, and exports
          browser.ts                                // browser-safe public engine API
          runtime/                                  // runtime-specific palette generation modules
          colors/                                   // named-color lookup and database adapters
          gamuts/, math/, spaces/                   // focused color-domain modules
        theme.ts                                    // theme mode persistence and helpers
        tools/palette-charts.ts                     // chart definitions for palette analysis views
        utils/                                      // app utilities, Tailwind merge, SEO, and theme variants
      providers/                                    // hotkey, shell, and theme providers
      routes/
        __root.tsx                                  // root route providers and metadata
        _chroma.tsx                                 // studio shell route
        _chroma/                                    // studio feature routes
          analyze/                                  // accessibility, brand, scoring, visualization
          build/                                    // extract, gradients, mixer, theme tools
          export/                                   // design system, scale, theme, utility exports
        _marketing.tsx                              // marketing shell route
        _marketing/                                 // public product, support, legal, and documentation pages
        api/palette.tsx                             // interactive palette API page
        sign-in.tsx, sign-up.tsx                    // authentication routes
        forgot-password.tsx, verify-email.tsx       // account recovery and verification routes
      stores/chroma.store.ts                        // central palette and tool state
      extract.tsx                               // route module for image extract view
      gradient.tsx                              // route module for gradient editor view
      mixer.tsx                                 // route module for color mixer view
      multiscale.tsx                            // route module for multi-scale generator view
      oklch-scatter.tsx                         // route module for OKLCH scatter visualization
      p3.tsx                                    // route module for P3 gamut tools
      palette.tsx                               // route module for core palette workspace
      picker.tsx                                // route module for color picker workspace
      preview.tsx                               // route module for CSS/theme preview view
      saved.tsx                                 // route module for saved palettes view
      scale.tsx                                 // route module for tint/scale generation view
      scoring.tsx                               // route module for palette scoring view
      theme.tsx                                 // route module for theme generator view
      utility.tsx                               // route module for utility colors view
    api/
      palette.tsx                               // client-side palette API documentation/tool page
    __root.tsx                                  // root route shell/providers for the router tree
    _chroma.tsx                                 // layout route wrapper for chroma sub-routes
    index.tsx                                   // index/home route module
  stores/
    .gitkeep                                    // keeps stores folder tracked when sparse
    chroma-store/
      chroma.store.ts                           // central store logic/state for chroma features
  styles/
    globals.css                                 // global styles, base layers, and theme tokens
  types/
    chroma.ts                                   // domain types/interfaces for chroma entities
    index.ts                                    // barrel exports for shared type definitions
  routeTree.gen.ts                              // generated route tree map for TanStack Router
  router.tsx                                    // router instance/configuration entry point
```

`routeTree.gen.ts` is generated by the TanStack Router CLI, not edited manually. The root route
supplies application providers and metadata; document markup lives in `index.html`. The theme
provider applies light/dark/auto mode classes, while `styles/globals.css` owns theme tokens,
Tailwind utilities, custom animations, and shared visual recipes.
