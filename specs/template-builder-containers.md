# Template Builder — Containers & Editor Setup

## Source
JTBD 1: Visual Template Creation

## Purpose
Sets up the Puck-based visual editor and implements the core container editing experience: adding sections, choosing container layouts, nesting containers, and reordering. This is the structural skeleton of the template builder.

## Requirements
- Initialize Puck as the editor framework within the app shell's Template Builder mode
- Provide a drag-and-drop interface for adding sections to a page/slide
- Support choosing container layout for each section: Flex (row/column), Grid (NxM), Stack, Free-position (escape hatch)
- Support nesting containers within containers (e.g., Section → Grid → Card containers)
- Support drag-to-reorder for sections and containers
- Output a valid JSON template schema (conforming to template-schema spec) that updates in real time as the user edits
- Save and load template JSON files from the filesystem

## Constraints
- Built using Puck (React page editor framework)
- The exact mapping between Puck's component model and the canonical template schema is an implementation detail — to be decided during prototyping
- Puck must produce output conforming to the template-schema spec (directly or via transformation)
- Layout primitives are composable — no fixed menu of "layout types"

## Acceptance Criteria
1. Puck editor loads within the Template Builder mode
2. User can add sections to a page
3. User can choose container layout (Flex, Grid, Stack, Free-position) for each section
4. User can nest containers at least 3 levels deep (Section → Sub Section → Card)
5. User can drag-to-reorder sections and containers
6. JSON schema updates in real time as the user edits
7. User can save a template to a JSON file and reload it

## References
- JTBD 1 of `reqs-001.md`
- `specs/design-principles.md` — structured by default, freeform by exception; composable layout primitives
- `specs/template-schema.md` — the JSON schema the builder must produce
- `specs/template-builder-fields.md` — extends this editor with field slot components
- `specs/template-builder-wireframe.md` — the live wireframe preview within this editor
