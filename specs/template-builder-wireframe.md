# Template Builder — Wireframe Preview

## Source
JTBD 1: Visual Template Creation

## Purpose
The live wireframe preview within the template builder that shows labeled placeholder boxes rendered in the real CSS container layout. This gives template authors immediate structural feedback as they build — confirming that containers, nesting, and field placement produce the intended layout.

## Requirements
- Display a live wireframe preview that updates as the user edits the template
- Render labeled placeholder boxes for each field slot (e.g., "TITLE", "PARAGRAPH", "CARD 1 → TITLE")
- Render containers using real CSS grid/flex layout (not a flat list or tree view)
- Show nesting visually — nested containers appear inside their parents with distinct boundaries
- Wireframe is structural only — no brand theme styling applied (no colors, fonts, or spacing from theme)
- Show page/slide boundaries as visual separators in the wireframe

## Constraints
- The wireframe preview is part of the Puck editor view (side panel or inline)
- Uses the same CSS layout primitives (Flex, Grid, Stack) that the HTML preview uses — ensuring structural consistency
- Does NOT use the layout engine (wireframe is CSS-rendered, not computed positions)

## Acceptance Criteria
1. Wireframe preview updates in real time as user adds/moves/removes containers and fields
2. Placeholder boxes show labeled field type names
3. Containers render in real CSS grid/flex layout (a 3-column grid shows 3 columns, not a vertical list)
4. Nested containers are visually distinguishable within their parents
5. Page/slide boundaries are visible in the wireframe
