// Layout engine output types — the contract between layout computation and renderers/generators.

export interface CanvasSize {
	width: number;
	height: number;
}

export type ElementType = "page" | "section" | "field" | "card" | "card-field";

/**
 * A positioned element in the flat output list.
 * Every template element (page, section, field, card, card-field) gets one entry
 * with absolute coordinates in the canvas coordinate system.
 */
export interface PositionedElement {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	type: ElementType;
	parentId: string | null;
	zIndex?: number;
}

/** Rectangular bounds used internally for layout computation. */
export interface LayoutBounds {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** An item with intrinsic dimensions, fed into layout primitives. */
export interface SizedItem {
	intrinsicWidth: number;
	intrinsicHeight: number;
}
