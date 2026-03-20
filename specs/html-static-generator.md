# HTML Static Site Generator

## Source
JTBD 5: Multi-Format Asset Generation

## Purpose
Generates a deployable static HTML site from the preview output. Multi-page templates produce multiple HTML files with navigation/routing. This is the simplest output format — save the preview as static files.

## Requirements
- Accept template JSON, theme JSON, and content JSON as inputs
- Produce a directory of static files: HTML, CSS, and referenced assets (images, fonts)
- Single-page templates produce a single `index.html`
- Multi-page templates (multiple pages in the JSON) produce separate HTML files with inter-page links
- Inline or bundle CSS (no external CDN dependencies in output)
- Include referenced images/media as local files in the output directory
- Output is self-contained and deployable to any static hosting (Netlify, S3, GitHub Pages, etc.)

## Constraints
- Output is the HTML preview saved as static files — no separate rendering path
- No JavaScript in output unless required for interactivity (Phase 1 output is static)
- No build step required to deploy the output

## Acceptance Criteria
1. A function accepts template + theme + content inputs and produces a directory of static files
2. Opening `index.html` in a browser shows the same output as the live preview
3. Multi-page templates produce correctly linked HTML files
4. Output has no external dependencies (self-contained)
5. Output directory can be deployed to static hosting and renders correctly

## References
- JTBD 5 of `reqs-001.md`
- `specs/html-renderer.md` — the rendering engine whose output is saved as static files
