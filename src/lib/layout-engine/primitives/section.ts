import type { LayoutBounds, SizedItem } from "../types";

/**
 * Section layout: vertical stack, full-width items, top to bottom.
 * The simplest layout primitive — mirrors a block-level CSS container.
 * Items retain their intrinsic height and fill the container width.
 */
export function layoutSectionPrimitive(
	items: SizedItem[],
	bounds: LayoutBounds,
	gap: number = 0,
): LayoutBounds[] {
	const results: LayoutBounds[] = [];
	let currentY = bounds.y;

	for (let i = 0; i < items.length; i++) {
		results.push({
			x: bounds.x,
			y: currentY,
			width: bounds.width,
			height: items[i].intrinsicHeight,
		});
		currentY += items[i].intrinsicHeight;
		if (i < items.length - 1) currentY += gap;
	}

	return results;
}
