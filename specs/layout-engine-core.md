# Layout Engine — Core Framework

## Source
JTBD 5: Multi-Format Asset Generation (cross-cutting)

## Purpose
The foundational framework for the layout engine. Defines the input/output contract, the recursive traversal that walks the template tree, and the Section layout primitive (the simplest case: full-width blocks stacking vertically). Other specs build on this to add Flex, Grid, Stack, and Free-position algorithms.

## Requirements
- Accept a template JSON and a target canvas size (width, height) as inputs
- Output a flat list of positioned elements, each with: element ID, x, y, width, height, element type, and parent reference
- Recursively traverse the template tree (Document → Pages → Sections → children)
- Compute Section layout: top-level block containers that stack vertically, full-width within the page canvas
- Respect padding and spacing defined on containers
- Produce a separate layout pass per output format (each with its own canvas size): PPTX=10×7.5in, PDF=A4 (8.27×11.69in), HTML=fixed width (configurable, e.g. 1440px)
- Provide an extensible architecture where layout primitives (Flex, Grid, etc.) plug in as strategies

## Constraints
- Pure computation — no rendering, no DOM, no CSS engine dependency
- Must be deterministic: same inputs always produce same outputs
- Does NOT read theme data (themes affect styling, not layout positioning)
- Does NOT read content data (content fills positions, doesn't change them)
- TypeScript, runnable in Bun without browser APIs

## Acceptance Criteria
1. A function accepts template JSON + canvas size and returns positioned bounding boxes
2. Section containers stack vertically and fill the page width
3. Nested children receive correct parent-relative positioning
4. Padding/spacing is applied correctly to container bounds
5. The framework supports plugging in additional layout strategies (Flex, Grid, Stack, Free-position)
6. Layout engine runs in pure TypeScript without DOM/browser dependencies

## References
- Architecture → Shared Layout Engine section of `reqs-001.md`
- `specs/layout-engine-primitives.md` — Flex, Grid, Stack, Free-position strategies that plug into this framework
- `specs/design-principles.md` — fixed canvas per format, visual fidelity guarantee
