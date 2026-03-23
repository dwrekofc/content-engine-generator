import type { LayoutBounds, SizedItem } from "../types";

/**
 * Stack layout: all items layer at the same position (z-axis stacking).
 *
 * Every item fills the entire parent bounds. Items later in the list
 * are visually on top (higher z-index). The core assigns zIndex values
 * based on item order.
 */
export function layoutStackPrimitive(items: SizedItem[], bounds: LayoutBounds): LayoutBounds[] {
	return items.map(() => ({
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
	}));
}
