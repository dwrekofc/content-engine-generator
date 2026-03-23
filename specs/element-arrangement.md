# Element Arrangement, Alignment & Layer Order

## Source
JTBD 1: Visual Template Creation

## Purpose
Provides the spatial manipulation tools that template authors expect from any layout editor — aligning elements, distributing spacing evenly, controlling z-order stacking, and grouping. These operations apply within the template builder and are persisted in the template JSON. Without these, precise layout control requires manual coordinate entry or trial-and-error.

## Requirements

### Alignment (multi-select) [inferred]
- Align selected elements: left, center, right (horizontal axis)
- Align selected elements: top, middle, bottom (vertical axis)
- Align relative to parent container OR relative to selection (user-togglable)
- Align to page/slide canvas edges

### Distribution (multi-select) [inferred]
- Distribute selected elements with equal horizontal spacing
- Distribute selected elements with equal vertical spacing
- Distribute spacing between edges (not centers) for consistent visual gaps

### Layer Order (z-index) [inferred]
- Bring to front (top of stack)
- Send to back (bottom of stack)
- Bring forward one layer
- Send backward one layer
- Display layer order visually (e.g., layer panel or z-index indicators)
- Layer order applies within a container scope — not globally across the entire page

### Grouping [inferred]
- Group selected elements into a logical unit that moves/resizes together
- Ungroup a group back to individual elements
- Groups are nestable (a group can contain groups)
- Groups are represented in the template JSON as a container node

### Snapping & Guides [inferred]
- Snap to grid (configurable grid size)
- Snap to other element edges and centers (smart guides)
- Show alignment guide lines when dragging near snap targets
- Toggle snapping on/off

### Precise Positioning [inferred]
- Property panel showing x, y, width, height for selected element
- Direct numeric input for position and size values
- Nudge selected elements with arrow keys (configurable step size)
- Shift+arrow for larger nudge increments

### Size Matching (multi-select) [inferred]
- Match width across selected elements
- Match height across selected elements
- Match both width and height

## Constraints
- These tools operate within the Puck-based template builder (see template-builder-containers)
- Alignment and distribution apply to elements within the same parent container
- Layer order is scoped per container (not a flat global z-index)
- All arrangement operations must update the template JSON in real time
- Snapping is a builder UI behavior only — snap grid is NOT persisted in the template JSON
- Grouping creates a real container node in the template schema (not just a UI-only grouping)

## Acceptance Criteria
1. User can multi-select elements and align them (left/center/right/top/middle/bottom)
2. User can distribute selected elements with equal spacing (horizontal and vertical)
3. User can change layer order: bring to front, send to back, forward one, backward one
4. Layer order is visually reflected in the wireframe preview
5. User can group and ungroup elements; groups move and resize as a unit
6. Smart guides appear when dragging elements near alignment targets
7. Property panel shows and accepts numeric x/y/width/height values
8. Arrow keys nudge selected elements by a configurable step size
9. User can match width/height across a multi-selection

## References
- JTBD 1 of `reqs-001.md`
- `specs/design-principles.md` — structured by default; free-positioning is the escape hatch
- `specs/template-builder-containers.md` — the editor these tools integrate into
- `specs/template-builder-wireframe.md` — wireframe must reflect layer order and alignment visually
- `specs/template-schema.md` — groups become container nodes; z-order is persisted per container
