import type { FreePositionChild } from "../../schemas/template-schema";
import type { LayoutBounds, SizedItem } from "../types";

/**
 * Free-position layout: children with explicit position use absolute coordinates
 * relative to the parent container bounds. Children without explicit positions
 * stack vertically at the top of the container (fallback for fields).
 *
 * This is the escape hatch — structured layout (Flex, Grid, Stack) is the default.
 */
export function layoutFreePositionPrimitive(
	items: SizedItem[],
	bounds: LayoutBounds,
	positions: (FreePositionChild | undefined)[],
): LayoutBounds[] {
	const results: LayoutBounds[] = [];
	let stackY = bounds.y;

	for (let i = 0; i < items.length; i++) {
		const pos = positions[i];
		if (pos) {
			// Absolute coordinates relative to parent bounds
			results.push({
				x: bounds.x + pos.x,
				y: bounds.y + pos.y,
				width: pos.width,
				height: pos.height,
			});
		} else {
			// Fallback: stack at the top of the container
			results.push({
				x: bounds.x,
				y: stackY,
				width: bounds.width,
				height: items[i].intrinsicHeight,
			});
			stackY += items[i].intrinsicHeight;
		}
	}

	return results;
}
