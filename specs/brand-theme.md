# Brand Theme

## Source
JTBD 3: Brand Theme Definition

## Purpose
Defines the JSON design token format for brand themes. A theme controls the visual treatment of all rendered output — typography, colors, spacing, and component styling — without changing structural arrangement. Themes work across all output formats.

## Requirements
- Define global design tokens: typography (font families, sizes, weights, line heights), colors (primary, secondary, background, text, accent), spacing (padding, margins, gaps), button styles (shape, fill, border)
- Support named per-section style overrides (e.g., "hero" override with dark background + white text, "cta" override with branded accent color)
- Section overrides inherit from globals — only the overridden properties change
- Provide a clear merge order: global defaults → section override → (future: per-element override)
- Convert JSON tokens to CSS custom properties for the HTML renderer
- PPTX and PDF generators read JSON tokens directly (no CSS intermediary)
- Include theme name and optional metadata (brand name, version)
- Support AI-assisted theme generation from a brand style guide (a coding agent reads the style guide and produces the JSON token file)

## Constraints
- Format is JSON design tokens — no CSS files, no Sass, no proprietary formats
- Phase 1 editing is config file only (hand-edited or agent-edited). No visual theme editor.
- Themes never change structural arrangement — they control visual treatment only
- Token names should follow a consistent naming convention (e.g., `colors.primary`, `typography.heading.fontFamily`)
- Section override names in the theme must match section type/tag names used in templates

## Acceptance Criteria
1. A TypeScript type definition exists for the theme schema
2. A JSON Schema (or Zod schema) exists for theme validation
3. A sample theme JSON file demonstrates globals + at least 2 section overrides
4. A function converts theme JSON to CSS custom properties (for HTML renderer)
5. PPTX generator reads theme tokens and applies them to shapes (fonts, colors, spacing)
6. Changing a theme token visibly changes the HTML preview output
7. The same theme produces consistent visual results across HTML and PPTX

## References
- JTBD 3 of `reqs-001.md`
- `specs/design-principles.md` — themes never change structural arrangement
- `specs/html-renderer.md` — consumes theme tokens as CSS custom properties
- `specs/pptx-generator.md` — reads theme tokens directly for shape styling
