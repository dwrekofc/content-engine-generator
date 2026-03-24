// Layout engine output types — the contract between layout computation and renderers/generators.

export interface CanvasSize {
	width: number;
	height: number;
}

// ── Per-format canvas size constants ────────────────────────────────
// Spec: "PPTX=10×7.5in, PDF=A4 (8.27×11.69in), HTML=fixed width"
// PPTX uses 96 DPI → 10in × 96 = 960px, 7.5in × 96 = 720px
// (PptxGenJS native unit is inches; these are the pixel equivalents for layout)

/** PPTX canvas: 10×7.5 inches at 96 DPI = 960×720 px */
export const CANVAS_PPTX: CanvasSize = { width: 960, height: 720 };

/** PDF canvas: A4 at 72 DPI = 595.28×841.89 pt */
export const CANVAS_PDF_A4: CanvasSize = { width: 595.28, height: 841.89 };

/** HTML canvas: default fixed width 1280×720 px */
export const CANVAS_HTML: CanvasSize = { width: 1280, height: 720 };

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
