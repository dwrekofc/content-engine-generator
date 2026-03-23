# Template Builder — Field Slots & Metadata

## Source
JTBD 1: Visual Template Creation

## Purpose
Adds content field slot components to the template builder, allowing users to drop field types into containers, mark them as required/optional, and define page/slide boundaries.

## Requirements
- Provide draggable content field slot components for all 7 field types: Title, Subtitle, Paragraph, Button (Text + Link), Featured Content (media), Featured Content Caption, Background
- Support dropping field slots into any container
- Support drag-to-reorder field slots within a container
- Support marking sections and fields as required or optional (via a property panel or inline toggle)
- Support defining explicit page/slide boundaries within a template (canvas break points)

## Constraints
- Field slot components integrate into the Puck editor established by template-builder-containers
- Cards support only 6 field types (no Featured Content Caption)
- Paragraph and Button fields can have multiple instances per container
- Free-positioning is a container-level layout type (see template-builder-containers), not a per-element flag

## Acceptance Criteria
1. All 7 field types are available as draggable components in the editor
2. User can drop field slots into any container
3. User can reorder field slots within a container
4. User can mark fields and sections as required or optional
5. User can define page/slide boundaries
6. Exported JSON includes field metadata (required/optional markers)

## References
- JTBD 1 of `reqs-001.md`
- `specs/design-principles.md` — fixed content model (7 field types sections, 6 cards)
- `specs/template-builder-containers.md` — the editor this spec extends with field slot components
- `specs/template-schema.md` — the JSON schema that must include field metadata
