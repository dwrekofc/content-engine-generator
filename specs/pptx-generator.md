# PPTX Generator

## Source
JTBD 5: Multi-Format Asset Generation

## Purpose
Generates PowerPoint (PPTX) files from template + theme + content inputs. Uses the layout engine's computed bounding boxes to place shapes at exact coordinates via PptxGenJS. PPTX is the hero asset — the hardest output target. If the engine nails PPTX, everything else follows.

## Requirements
- Accept template JSON, theme JSON, and content JSON as inputs
- Use the layout engine to compute absolute positions for the PPTX canvas (10x7.5 inches default, configurable)
- Create slides from the template's page/slide boundaries
- Place shapes (text boxes, images, rectangles) at the layout engine's computed coordinates using PptxGenJS
- Apply brand theme tokens to shapes: fonts (family, size, weight, color), colors (fill, border, background), spacing
- Apply per-section theme overrides when the section matches a named override in the theme
- Render all 7 field types as appropriate PPTX elements:
  - Title/Subtitle → text boxes with heading styles
  - Paragraph → text boxes with body styles
  - Button → styled text box or shape with link
  - Featured Content → image placeholder
  - Featured Content Caption → text box
  - Background → slide/shape background fill (color, gradient, or image)
- Output a valid .pptx file

## Constraints
- Uses PptxGenJS (TypeScript-native, zero dependencies)
- Positioning comes from the layout engine — the generator does NOT compute layout
- Must produce output visually matching the HTML preview for the same inputs
- Inch-based coordinate system (PptxGenJS native)
- No slide master/template support needed in Phase 1 (future enhancement)

## Acceptance Criteria
1. A function accepts template + theme + content JSON and produces a .pptx file
2. Slides correspond to page/slide boundaries in the template
3. Shapes are positioned at layout engine coordinates (visual match to HTML preview)
4. Theme tokens (fonts, colors, spacing) are applied to all shapes
5. Section-level theme overrides produce visually distinct sections
6. All 7 field types are rendered as appropriate PPTX elements
7. Generated .pptx opens correctly in PowerPoint/LibreOffice
8. Side-by-side comparison of HTML preview and PPTX slide shows matching layout

## References
- JTBD 5 and Architecture sections of `reqs-001.md`
- `specs/design-principles.md` — visual fidelity across formats; fixed canvas per format
- `specs/layout-engine-core.md` — provides the bounding boxes this generator consumes
- `specs/html-renderer.md` — reference implementation for visual fidelity comparison
- `specs/brand-theme.md` — theme token format applied to shapes
