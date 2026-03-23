import type { GridConfig } from "../../schemas/template-schema";
import type { LayoutBounds, SizedItem } from "../types";

/**
 * Grid layout: NxM cells, mirrors CSS grid with fixed track counts.
 *
 * Items are placed in row-major order (left-to-right, top-to-bottom).
 * Column/row sizes can be specified as ratios via `columnSizes`/`rowSizes`,
 * otherwise cells are equally sized.
 */
export function layoutGridPrimitive(
	items: SizedItem[],
	bounds: LayoutBounds,
	config: GridConfig,
): LayoutBounds[] {
	if (items.length === 0) return [];

	const { columns, rows, gap = 0, columnSizes, rowSizes } = config;

	const totalColumnGap = Math.max(0, columns - 1) * gap;
	const totalRowGap = Math.max(0, rows - 1) * gap;

	// Compute column widths — ratio-based or equal
	const colWidths = computeTrackSizes(columns, bounds.width - totalColumnGap, columnSizes);

	// Compute row heights — ratio-based or equal
	const rowHeights = computeTrackSizes(rows, bounds.height - totalRowGap, rowSizes);

	// Pre-compute column X offsets
	const colOffsets: number[] = [bounds.x];
	for (let c = 1; c < columns; c++) {
		colOffsets[c] = colOffsets[c - 1] + colWidths[c - 1] + gap;
	}

	// Pre-compute row Y offsets
	const rowOffsets: number[] = [bounds.y];
	for (let r = 1; r < rows; r++) {
		rowOffsets[r] = rowOffsets[r - 1] + rowHeights[r - 1] + gap;
	}

	const results: LayoutBounds[] = [];
	const maxCells = columns * rows;

	for (let i = 0; i < items.length && i < maxCells; i++) {
		const row = Math.floor(i / columns);
		const col = i % columns;

		results.push({
			x: colOffsets[col],
			y: rowOffsets[row],
			width: colWidths[col],
			height: rowHeights[row],
		});
	}

	return results;
}

/** Compute track sizes from ratios or equal distribution. */
function computeTrackSizes(count: number, available: number, ratios?: number[]): number[] {
	if (ratios && ratios.length === count) {
		const totalRatio = ratios.reduce((a, b) => a + b, 0);
		return ratios.map((r) => (r / totalRatio) * available);
	}
	const size = available / count;
	return Array.from({ length: count }, () => size);
}
