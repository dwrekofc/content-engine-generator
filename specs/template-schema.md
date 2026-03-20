# Template Schema

## Source
JTBD 1: Visual Template Creation

## Purpose
Defines the canonical JSON schema for layout templates — the structural blueprints that describe what content exists (field slots) and how it arranges on the page (container hierarchy). This schema is the contract between the template builder, the HTML renderer, the layout engine, and all output generators.

## Requirements

### Document Hierarchy
- Support a `Document → Page/Slide → Section → [Sub Section] → Card → [Fields]` hierarchy
- Pages/slides are the top-level canvas boundary (not sections)
- A single page/slide can contain multiple sections
- Sections can contain fields, cards, and optional sub sections
- Sub sections can contain fields and cards
- Cards contain fields only
- Nesting depth is capped at 3 levels (Section → Sub Section → Card)

### Content Model (Field Types)
- Support 7 field types for sections: Title, Subtitle, Paragraph, Button (Text + Link), Featured Content (media), Featured Content Caption, Background
- Support 6 field types for cards: Title, Subtitle, Paragraph, Button (Text + Link), Featured Content (media), Background
- Cards do NOT support Featured Content Caption
- Paragraph and Button fields can repeat (multiple instances per container)
- Each field slot has a unique ID within the template

### Layout Model (Container Primitives)
- Support 5 layout primitives: Section, Flex (row/column), Grid (NxM), Stack, Free-position
- Section is the top-level container within a page/slide
- Flex arranges children in a single direction (row or column) with configurable gap/alignment
- Grid arranges children in a defined NxM grid with configurable gap
- Stack layers children vertically (top-down, z-index stacking)
- Free-position enables absolute positioning within a container (explicit opt-in escape hatch)
- Containers are composable: any container can nest inside any other container
- Each container has a unique ID within the template

### Metadata
- Each field slot can be marked as required or optional
- Each page/slide defines explicit boundaries (the canvas break point)
- Templates reference a canvas size per format (or use format defaults)
- Templates include a human-readable name and description

## Constraints
- Schema is JSON — no YAML, no proprietary formats
- Schema must be serializable/deserializable without loss (round-trip safe)
- Schema defines structure and layout only — no visual styling (that's the theme's job), no content values (that's the content JSON's job)
- The Puck visual builder must be able to produce this schema (the mapping strategy is an implementation detail, not locked here)
- Layout primitives are composable CSS concepts — a "hero" is a Section + Stack + Background + fields, not a special type

## Acceptance Criteria
1. A TypeScript type definition exists for the full template schema
2. A JSON Schema (or Zod schema) exists for validation
3. The schema supports all 5 layout primitives nested arbitrarily
4. The schema supports all 7 field types with required/optional markers
5. The schema supports explicit page/slide boundaries
6. A sample template JSON file exercises all primitives and field types
7. The template builder, HTML renderer, layout engine, and PPTX generator all consume this schema

## References
- JTBD 1 and Architecture sections of `reqs-001.md`
- `specs/design-principles.md` — cross-cutting constraints on field types and layout primitives
- `specs/content-schema.md` — content JSON that fills this template's field slots
- `specs/brand-theme.md` — theme JSON that styles this template's visual treatment
