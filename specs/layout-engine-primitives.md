# Layout Engine — Layout Primitives

## Source
JTBD 5: Multi-Format Asset Generation (cross-cutting)

## Purpose
Implements the four non-trivial layout primitives (Flex, Grid, Stack, Free-position) as strategies within the layout engine core framework. Each primitive mirrors the equivalent CSS behavior so that computed positions match the HTML reference renderer.

## Requirements
- **Flex (row/column)**: items flow in one direction with configurable gap, alignment (start/center/end/stretch), and wrapping. Mirrors CSS flexbox behavior.
- **Grid (NxM)**: items arrange in N columns × M rows with configurable gap and cell sizing. Mirrors CSS grid behavior for fixed track counts.
- **Stack**: items layer on top of each other at the same position within the parent bounds, ordered by z-index.
- **Free-position**: elements use absolute x/y/width/height coordinates within the parent container bounds (escape hatch).
- All primitives handle nested children — a Flex can contain a Grid, a Grid cell can contain a Stack, etc.
- Match the HTML renderer's CSS output for the same template — the HTML preview is the reference

## Constraints
- Builds on layout-engine-core (uses its traversal framework and output contract)
- Pure computation — no DOM, no CSS engine
- Each primitive is a pluggable strategy, not a monolithic switch statement
- Free-position coordinates are relative to the parent container, not the page

## Acceptance Criteria
1. Flex layout produces positions matching CSS flexbox for row and column directions with gap and alignment
2. Grid layout produces positions matching CSS grid for NxM configurations with gap
3. Stack layout produces overlapping positions at the same coordinates with correct z-ordering
4. Free-position elements use their specified absolute coordinates within parent bounds
5. Nested combinations (e.g., Grid containing Flex containing Stack) produce correct recursive positioning
6. A visual diff test compares HTML renderer output to layout engine output for sample templates and confirms positional match within acceptable tolerance
