# App Shell

## Source
JTBD 1: Visual Template Creation | JTBD 4: Content Preview with Live Reload | JTBD 5: Multi-Format Asset Generation

## Purpose
The top-level application structure that hosts all three modes of the content engine: Template Builder, Content/Preview, and Generate. Provides navigation, shared state management, and the runtime environment.

## Requirements
- Provide three distinct app modes accessible via navigation:
  1. **Template Builder** — visual editor for creating/editing layout templates (see template-builder spec)
  2. **Content/Preview** — select a template + theme + content, view live HTML preview (see html-preview spec)
  3. **Generate** — select output format (PPTX, PDF, HTML static site) and produce the final asset (see generator specs)
- Support loading/saving template, theme, and content JSON files from the filesystem
- Provide a file picker or sidebar for selecting which template, theme, and content to work with
- Share the active template/theme/content selection across modes (switching modes preserves context)
- Display status/progress for generation operations

## Constraints
- Runtime: Bun
- Language: TypeScript (strict mode)
- UI: React with shadcn/ui components + Tailwind CSS
- Template builder uses Puck (React-based)
- Phase 1 is a local development tool — no authentication, no multi-user, no cloud deployment
- File I/O is local filesystem (Bun APIs)

## Acceptance Criteria
1. App launches via `bun run dev` and opens in a browser
2. Three modes are accessible via navigation (Template Builder, Content/Preview, Generate)
3. User can select a template, theme, and content file
4. Switching between modes preserves the active file selection
5. Template Builder mode loads the Puck editor
6. Content/Preview mode shows the live HTML preview with hot reload
7. Generate mode allows choosing an output format and produces a downloadable file
8. `bun run build` produces a production build without errors

## References
- JTBD 1, 4, 5 and Tech Stack section of `reqs-001.md`
- `specs/template-builder-containers.md` — Template Builder mode
- `specs/html-preview-dev.md` — Content/Preview mode
- `specs/pptx-generator.md`, `specs/pdf-generator.md`, `specs/html-static-generator.md` — Generate mode outputs
