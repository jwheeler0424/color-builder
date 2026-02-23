# Project Structure

```text
src/
  components/
    .gitkeep                                    // keeps the folder tracked when temporarily empty
    color-wheel.tsx                             // renders the interactive color wheel control
    default-catch-boundary.tsx                  // shared fallback UI for route/render errors
    elements/
      index.ts                                  // barrel exports for element-level components
      palette.panel.tsx                         // panel container for palette tools and actions
    gradient-stop-bar.tsx                       // draggable gradient stop editor strip
    hex-input.tsx                               // controlled input for HEX color values
    layout/
      header.tsx                                // app header with navigation/actions
    modals/
      color-picker.modal.tsx                    // modal wrapper for color picker interactions
      export.modal.tsx                          // modal for exporting palettes/assets
      index.ts                                  // barrel exports for modal components
      save.modal.tsx                            // modal for saving palettes locally
      share.modal.tsx                           // modal for share links or shareable output
      shortcuts.modal.tsx                       // modal listing keyboard shortcuts
    not-found.tsx                               // UI shown for unknown routes/pages
    theme-toggle.tsx                            // toggle control for light/dark/system theme
    ui/
      accordion.tsx                             // collapsible stacked content sections
      alert-dialog.tsx                          // confirm/destructive action dialog component
      alert.tsx                                 // inline status/feedback alert component
      aspect-ratio.tsx                          // enforces width-to-height ratios for content
      avatar.tsx                                // user/avatar image with fallback rendering
      badge.tsx                                 // compact status or label badge element
      breadcrumb.tsx                            // hierarchical navigation breadcrumb trail
      button-group.tsx                          // grouped button layout and behavior wrapper
      button.tsx                                // base button component variants
      calendar.tsx                              // calendar/date selection UI component
      card.tsx                                  // card surface/container UI primitive
      carousel.tsx                              // horizontally navigable carousel component
      chart.tsx                                 // chart wrapper utilities and shared styling
      checkbox.tsx                              // checkbox input component
      collapsible.tsx                           // expandable/collapsible content primitive
      command.tsx                               // command palette style input/list UI
      context-menu.tsx                          // right-click context menu component
      dialog.tsx                                // modal dialog primitive
      drawer.tsx                                // slide-in panel/drawer component
      dropdown-menu.tsx                         // triggerable dropdown menu component
      empty.tsx                                 // empty-state presentation component
      field.tsx                                 // standardized form field wrapper
      hover-card.tsx                            // preview card shown on hover/focus
      input-debounced.tsx                       // text input with debounced change events
      input-group.tsx                           // grouped input and addon layout component
      input-otp.tsx                             // segmented one-time-passcode input
      input.tsx                                 // base text input component
      item.tsx                                  // generic list/item row primitive
      kbd.tsx                                   // keyboard keycap display component
      label.tsx                                 // accessible form label component
      menubar.tsx                               // desktop-style menubar navigation component
      navigation-menu.tsx                       // structured navigation menu component
      pagination.tsx                            // paginated navigation controls
      popover.tsx                               // anchored floating content container
      progress.tsx                              // progress indicator/bar component
      radio-group.tsx                           // grouped radio input component
      resizable.tsx                             // resizable panel primitives
      router-dialog.tsx                         // route-aware dialog wrapper
      router-sheet.tsx                          // route-aware sheet/drawer wrapper
      scroll-area.tsx                           // styled/custom scrollable area component
      select.tsx                                // select/dropdown form control
      separator.tsx                             // visual divider/separator primitive
      sheet.tsx                                 // side/bottom sheet component
      sidebar.tsx                               // sidebar layout/navigation component
      skeleton.tsx                              // skeleton loading placeholder component
      slider.tsx                                // range slider input component
      sonner.tsx                                // toast notification host/component
      spinner.tsx                               // loading spinner indicator
      switch.tsx                                // boolean toggle switch component
      table.tsx                                 // table layout and utility primitives
      tabs.tsx                                  // tabbed interface component
      textarea-debounced.tsx                    // textarea with debounced updates
      textarea.tsx                              // multiline text input component
      toggle-group.tsx                          // grouped toggle button controls
      toggle.tsx                                // single toggle button component
      tooltip.tsx                               // hover/focus tooltip component
    views/
      accessibility-view.tsx                    // accessibility tools and WCAG-focused workflows
      brand-compliance-view.tsx                 // brand rule checks for selected palettes
      color-blind-view.tsx                      // color-vision deficiency simulation view
      color-mixer.tsx                           // blend/mix colors with adjustable inputs
      color-picker-view.tsx                     // main color picking and adjustment workspace
      contrast-checker.tsx                      // contrast ratio checker between color pairs
      converter-view.tsx                        // converts colors across supported formats
      css-preview.tsx                           // previews generated CSS variables/styles
      design-system-view.tsx                    // design-token/system oriented color view
      gradient-view.tsx                         // gradient creation and editing workspace
      image-extract-view.tsx                    // extracts palette colors from images
      multi-scale-view.tsx                      // generates multiple related color scales
      oklch-scatter-view.tsx                    // scatter visualization in OKLCH space
      p3-gamut-view.tsx                         // Display-P3 gamut visualization/checking view
      palette-comparison-view.tsx               // compares multiple palettes side by side
      palette-scoring.tsx                       // scores palettes against quality heuristics
      palette-view.tsx                          // primary palette organization and presentation view
      saved-view.tsx                            // lists and manages saved palettes
      theme-generator-view.tsx                  // generates UI themes from palette inputs
      tint-scale-view.tsx                       // builds tints/shades scales from base colors
      utility-colors-view.tsx                   // utility/state color set generation tools
  docs/
    PROJECT_STRUCTURE.md                        // living map of the src directory layout
    ROADMAP.md                                  // planned features and implementation phases
  hooks/
    use-chroma-store.ts                         // shared application state hook for chroma data
    use-theme.tsx                               // hook for reading/updating active theme
  lib/
    constants/
      chroma.ts                                 // color-related constants used across the app
      named-colors/
        color-names.csv                         // tabular named-color source dataset
        color-names.js                          // named-color data consumable in JS runtime
        color-names.json                        // structured named-color lookup data
        color-names.scss                        // SCSS variables/map for named colors
    tools/
      .gitkeep                                  // keeps tools folder committed until populated
    utils/
      color-math-export.utils.ts                // color math helpers used during exports
      color-math-scale.utils.ts                 // scale/tint shade computation utilities
      color-math.utils.ts                       // core color conversion/math helper functions
      index.ts                                  // barrel exports for utility modules
      palette.utils.ts                          // palette creation/transformation helper functions
      seo.ts                                    // SEO metadata helper utilities
      svg-export.ts                             // SVG generation/export helper functions
      tw.ts                                     // Tailwind-focused utility helpers
  providers/
    hotkey.provider.tsx                         // global keyboard shortcut provider
    theme.provider.tsx                          // theme context/provider for the app
  routes/
    _chroma/
      accessibility.tsx                         // route module for accessibility tools view
      brand.tsx                                 // route module for brand compliance view
      colorblind.tsx                            // route module for color-blind simulation view
      comparison.tsx                            // route module for palette comparison view
      contrast.tsx                              // route module for contrast checker view
      converter.tsx                             // route module for converter view
      designsystem.tsx                          // route module for design system view
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
      hello.$name.ts                            // parameterized sample API endpoint
      hello.ts                                  // basic sample API endpoint
      palette.tsx                               // API endpoint for palette-related operations
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
