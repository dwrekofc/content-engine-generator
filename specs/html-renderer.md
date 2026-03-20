# HTML Renderer

## Source
JTBD 4: Content Preview with Live Reload

## Purpose
The reference rendering implementation. Takes template + theme + content JSON and produces styled HTML using native CSS grid/flex. This is the source of truth for visual correctness — the layout engine and PPTX generator must match what this renderer produces.

## Requirements
- Render a template's layout structure using native CSS grid and flexbox (not absolute positioning)
- Map layout primitives to CSS: Section → block, Flex → `display: flex`, Grid → `display: grid`, Stack → positioned overlay, Free-position → `position: absolute`
- Apply brand theme tokens as CSS custom properties (e.g., `--color-primary`, `--font-heading`)
- Apply per-section theme overrides when a section matches a named override in the theme
- Fill field slots with values from a content JSON file
- Render all 7 field types with appropriate HTML elements:
  - Title/Subtitle → heading elements
  - Paragraph → paragraph/rich text elements
  - Button → anchor/button elements with link
  - Featured Content → image/media elements
  - Featured Content Caption → figure caption element
  - Background → CSS background (color, gradient, or image)
- Render page/slide boundaries as visual separators
- Render content within the actual layout grid with the brand theme applied, so what the user sees matches the final generated output

## Constraints
- Uses native CSS grid/flex — NOT computed absolute positions from the layout engine
- Serves as the reference implementation for layout fidelity testing
- PDF generation uses this output via Playwright (see pdf-generator spec)
- HTML output uses a fixed-width canvas (not responsive) to match the fixed-canvas-per-format principle

## Acceptance Criteria
1. Loading template + theme + content produces a fully styled HTML page
2. CSS grid/flex containers match the template's layout primitives
3. Theme tokens are applied as CSS custom properties and visually affect the output
4. Section-level theme overrides produce distinct visual treatments per section
5. All 7 field types render with appropriate HTML elements
6. Page/slide boundaries are visually distinct

## References
- JTBD 4 and Architecture → Shared Layout Engine section of `reqs-001.md`
- `specs/design-principles.md` — HTML renderer is the reference implementation for visual correctness
- `specs/html-preview-dev.md` — dev server that wraps this renderer with hot reload
- `specs/pdf-generator.md` — uses this renderer's output via Playwright
