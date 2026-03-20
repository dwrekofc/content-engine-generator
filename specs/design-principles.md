# Design Principles

## Purpose
Cross-cutting constraints and principles that govern every spec in the system. These rules enforce consistency across the template builder, layout engine, renderers, and all output generators. Referenced by individual specs rather than repeated.

## Requirements
- Enforce structured, container-based layout by default (Flex, Grid, Stack) for all templates
- Treat free-positioning as an explicit opt-in escape hatch per element, not the default mode
- Limit the content model to 7 field types for sections and 6 for cards to keep templates composable and ensure every output generator handles every field type
- Ensure templates define both structure (field slots) and layout (container hierarchy) — brand themes control visual treatment only, never structural arrangement
- Use the HTML renderer (native CSS grid/flex) as the reference implementation and source of truth for visual correctness
- Require the layout engine to mirror CSS behavior, producing equivalent absolute positions for non-HTML formats (PPTX)
- Define a fixed canvas size per output format (PPTX=10×7.5in, PDF=A4, HTML=fixed width) with no responsive reflow — the layout engine computes positions per-canvas independently
- Use JSON as the universal format for templates, themes, and content — readable/writable by humans, AI agents, and any language
- Treat Phase 1 content as disposable dummy data to exercise the rendering pipeline — content authoring experience is a future phase

## Constraints
- Visual fidelity across formats is non-negotiable — the shared layout engine guarantees that HTML preview and PPTX output produce identical positioning from the same inputs
- Individual format generators may use whatever library produces the best output (currently all TypeScript, but this is a non-constraint)
- No responsive reflow — each format gets its own layout pass against its fixed canvas
- Themes never change structural arrangement

## Acceptance Criteria
1. Every spec in the system references these principles where applicable rather than re-stating them
2. No spec introduces a layout mode that defaults to free-positioning
3. No spec introduces field types beyond the 7 defined in the content model
4. The layout engine and PPTX generator are tested against the HTML renderer for positional fidelity

## References
- Constraints & Principles section of `reqs-001.md`
