# PDF Generator

## Source
JTBD 5: Multi-Format Asset Generation

## Purpose
Generates PDF files by rendering the HTML preview via Playwright. This is a zero-reimplementation approach — the same HTML/CSS that powers the preview is printed to PDF. Page breaks come from the template's page/slide boundaries.

## Requirements
- Accept template JSON, theme JSON, and content JSON as inputs (or a URL to the running HTML preview)
- Use Playwright to render the HTML preview and print to PDF
- Respect page/slide boundaries from the template as PDF page breaks — explicit boundaries in the JSON are authoritative
- When no explicit page boundaries are defined, use the template's default break points as fallback
- Apply correct page size (A4 default, configurable)
- Preserve all visual styling from the HTML preview (fonts, colors, spacing, backgrounds, images)
- Output a valid .pdf file

## Constraints
- Uses Playwright for HTML → PDF conversion
- No custom PDF layout logic — relies entirely on the HTML renderer
- Playwright must be available as a dependency (headless Chromium)
- Page breaks use CSS `page-break-before`/`break-before` properties mapped from template boundaries

## Acceptance Criteria
1. A function accepts template + theme + content inputs and produces a .pdf file
2. PDF page breaks align with template page/slide boundaries
3. Visual output matches the HTML preview (fonts, colors, layout, images)
4. PDF opens correctly in standard PDF viewers
5. A4 page size is used by default
