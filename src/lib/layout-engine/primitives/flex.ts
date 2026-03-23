import type { FlexConfig } from "../../schemas/template-schema";
import type { LayoutBounds, SizedItem } from "../types";

/**
 * Flex layout: mirrors CSS flexbox behavior.
 *
 * Row direction: items distributed equally along the horizontal axis.
 *   Cross-axis (vertical) alignment controlled by `align`.
 *
 * Column direction: items stacked vertically using intrinsic heights.
 *   Cross-axis (horizontal) alignment controlled by `align`.
 *   Default align is 'stretch' (items fill container width).
 */
export function layoutFlexPrimitive(
	items: SizedItem[],
	bounds: LayoutBounds,
	config: FlexConfig,
): LayoutBounds[] {
	if (items.length === 0) return [];

	const { direction, gap = 0, align = "stretch" } = config;

	if (direction === "row") {
		return layoutFlexRow(items, bounds, gap, align);
	}
	return layoutFlexColumn(items, bounds, gap, align);
}

function layoutFlexRow(
	items: SizedItem[],
	bounds: LayoutBounds,
	gap: number,
	align: string,
): LayoutBounds[] {
	const totalGap = Math.max(0, items.length - 1) * gap;
	const itemWidth = (bounds.width - totalGap) / items.length;
	const results: LayoutBounds[] = [];
	let currentX = bounds.x;

	for (const item of items) {
		const cross = alignCrossVertical(bounds.y, bounds.height, item.intrinsicHeight, align);
		results.push({ x: currentX, y: cross.y, width: itemWidth, height: cross.height });
		currentX += itemWidth + gap;
	}

	return results;
}

function layoutFlexColumn(
	items: SizedItem[],
	bounds: LayoutBounds,
	gap: number,
	align: string,
): LayoutBounds[] {
	const results: LayoutBounds[] = [];
	let currentY = bounds.y;

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const cross = alignCrossHorizontal(bounds.x, bounds.width, item.intrinsicWidth, align);
		results.push({ x: cross.x, y: currentY, width: cross.width, height: item.intrinsicHeight });
		currentY += item.intrinsicHeight;
		if (i < items.length - 1) currentY += gap;
	}

	return results;
}

/** Cross-axis alignment for row direction (vertical positioning). */
function alignCrossVertical(
	boundsY: number,
	boundsHeight: number,
	itemHeight: number,
	align: string,
): { y: number; height: number } {
	switch (align) {
		case "center":
			return { y: boundsY + (boundsHeight - itemHeight) / 2, height: itemHeight };
		case "end":
			return { y: boundsY + boundsHeight - itemHeight, height: itemHeight };
		case "start":
			return { y: boundsY, height: itemHeight };
		default: // 'stretch'
			return { y: boundsY, height: boundsHeight };
	}
}

/** Cross-axis alignment for column direction (horizontal positioning). */
function alignCrossHorizontal(
	boundsX: number,
	boundsWidth: number,
	itemWidth: number,
	align: string,
): { x: number; width: number } {
	switch (align) {
		case "center":
			return { x: boundsX + (boundsWidth - itemWidth) / 2, width: itemWidth };
		case "end":
			return { x: boundsX + boundsWidth - itemWidth, width: itemWidth };
		case "start":
			return { x: boundsX, width: itemWidth };
		default: // 'stretch'
			return { x: boundsX, width: boundsWidth };
	}
}
