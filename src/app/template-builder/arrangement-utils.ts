/**
 * Pure utility functions for element arrangement operations.
 *
 * Why: Alignment, distribution, size matching, layer order, snap-to-grid, and
 * grouping calculations are pure math with no DOM or editor dependencies. Keeping
 * them separate enables direct unit testing and reuse across different UI contexts.
 *
 * All functions operate on a common `Rect` type representing an element's bounding
 * box. They return new rects — never mutate inputs.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface Rect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export type HAlign = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";
export type AlignReference = "selection" | "parent";

// ── Alignment ────────────────────────────────────────────────────────

/** Align rects horizontally relative to a reference boundary or their collective bounds. */
export function alignHorizontal(
	rects: Rect[],
	align: HAlign,
	reference: AlignReference,
	parentRect?: Rect,
): Rect[] {
	if (rects.length === 0) return [];

	const refBounds = reference === "parent" && parentRect ? parentRect : getBounds(rects);

	return rects.map((r) => {
		let x: number;
		switch (align) {
			case "left":
				x = refBounds.x;
				break;
			case "center":
				x = refBounds.x + refBounds.width / 2 - r.width / 2;
				break;
			case "right":
				x = refBounds.x + refBounds.width - r.width;
				break;
		}
		return { ...r, x };
	});
}

/** Align rects vertically relative to a reference boundary or their collective bounds. */
export function alignVertical(
	rects: Rect[],
	align: VAlign,
	reference: AlignReference,
	parentRect?: Rect,
): Rect[] {
	if (rects.length === 0) return [];

	const refBounds = reference === "parent" && parentRect ? parentRect : getBounds(rects);

	return rects.map((r) => {
		let y: number;
		switch (align) {
			case "top":
				y = refBounds.y;
				break;
			case "middle":
				y = refBounds.y + refBounds.height / 2 - r.height / 2;
				break;
			case "bottom":
				y = refBounds.y + refBounds.height - r.height;
				break;
		}
		return { ...r, y };
	});
}

// ── Distribution ─────────────────────────────────────────────────────

/** Distribute rects with equal spacing between edges along the horizontal axis. */
export function distributeHorizontal(rects: Rect[]): Rect[] {
	if (rects.length < 3) return rects;

	const sorted = [...rects].map((r, i) => ({ r, i })).sort((a, b) => a.r.x - b.r.x);

	const first = sorted[0].r;
	const last = sorted[sorted.length - 1].r;
	const totalWidth = sorted.reduce((sum, { r }) => sum + r.width, 0);
	const totalSpace = last.x + last.width - first.x - totalWidth;
	const gap = totalSpace / (sorted.length - 1);

	const result = new Array<Rect>(rects.length);
	let currentX = first.x;

	for (const { r, i } of sorted) {
		result[i] = { ...r, x: currentX };
		currentX += r.width + gap;
	}

	return result;
}

/** Distribute rects with equal spacing between edges along the vertical axis. */
export function distributeVertical(rects: Rect[]): Rect[] {
	if (rects.length < 3) return rects;

	const sorted = [...rects].map((r, i) => ({ r, i })).sort((a, b) => a.r.y - b.r.y);

	const first = sorted[0].r;
	const last = sorted[sorted.length - 1].r;
	const totalHeight = sorted.reduce((sum, { r }) => sum + r.height, 0);
	const totalSpace = last.y + last.height - first.y - totalHeight;
	const gap = totalSpace / (sorted.length - 1);

	const result = new Array<Rect>(rects.length);
	let currentY = first.y;

	for (const { r, i } of sorted) {
		result[i] = { ...r, y: currentY };
		currentY += r.height + gap;
	}

	return result;
}

// ── Size Matching ────────────────────────────────────────────────────

/** Match all rects to the maximum width in the set. */
export function matchWidth(rects: Rect[]): Rect[] {
	if (rects.length === 0) return [];
	const maxW = Math.max(...rects.map((r) => r.width));
	return rects.map((r) => ({ ...r, width: maxW }));
}

/** Match all rects to the maximum height in the set. */
export function matchHeight(rects: Rect[]): Rect[] {
	if (rects.length === 0) return [];
	const maxH = Math.max(...rects.map((r) => r.height));
	return rects.map((r) => ({ ...r, height: maxH }));
}

/** Match all rects to the maximum width and height in the set. */
export function matchSize(rects: Rect[]): Rect[] {
	if (rects.length === 0) return [];
	const maxW = Math.max(...rects.map((r) => r.width));
	const maxH = Math.max(...rects.map((r) => r.height));
	return rects.map((r) => ({ ...r, width: maxW, height: maxH }));
}

// ── Layer Order ──────────────────────────────────────────────────────

/** Move an item in an array from one index to another (immutable). */
export function reorder<T>(items: T[], fromIndex: number, toIndex: number): T[] {
	if (fromIndex === toIndex) return items;
	if (fromIndex < 0 || fromIndex >= items.length) return items;
	const clamped = Math.max(0, Math.min(toIndex, items.length - 1));
	const result = [...items];
	const [removed] = result.splice(fromIndex, 1);
	result.splice(clamped, 0, removed);
	return result;
}

/** Move an item to the front (top of z-stack). */
export function bringToFront<T>(items: T[], index: number): T[] {
	return reorder(items, index, items.length - 1);
}

/** Move an item to the back (bottom of z-stack). */
export function sendToBack<T>(items: T[], index: number): T[] {
	return reorder(items, index, 0);
}

/** Move an item forward one position in the stack. */
export function bringForward<T>(items: T[], index: number): T[] {
	return reorder(items, index, index + 1);
}

/** Move an item backward one position in the stack. */
export function sendBackward<T>(items: T[], index: number): T[] {
	return reorder(items, index, index - 1);
}

// ── Snap to Grid ─────────────────────────────────────────────────────

/** Snap a value to the nearest grid line. */
export function snapToGrid(value: number, gridSize: number): number {
	if (gridSize <= 0) return value;
	return Math.round(value / gridSize) * gridSize;
}

/** Snap a rect's position to the grid (size unchanged). */
export function snapRectToGrid(rect: Rect, gridSize: number): Rect {
	return {
		...rect,
		x: snapToGrid(rect.x, gridSize),
		y: snapToGrid(rect.y, gridSize),
	};
}

// ── Nudge ────────────────────────────────────────────────────────────

/** Nudge a rect by a delta. */
export function nudge(rect: Rect, dx: number, dy: number, gridSize?: number): Rect {
	let { x, y } = rect;
	x += dx;
	y += dy;
	if (gridSize && gridSize > 0) {
		x = snapToGrid(x, gridSize);
		y = snapToGrid(y, gridSize);
	}
	return { ...rect, x: Math.max(0, x), y: Math.max(0, y) };
}

// ── Smart Guides ─────────────────────────────────────────────────────

/** A guide line indicating an alignment target during dragging. */
export interface GuideLine {
	/** Axis: "x" = vertical line, "y" = horizontal line. */
	axis: "x" | "y";
	/** Position on the axis (pixels from left/top of container). */
	position: number;
	/** Type of alignment: edge-to-edge, center-to-center, or edge-to-center. */
	type: "edge" | "center";
}

/** Snap result: snapped rect + active guide lines to render. */
export interface SnapResult {
	rect: Rect;
	guides: GuideLine[];
}

/**
 * Compute snap targets from sibling rects — every edge and center.
 * Returns sorted, deduplicated arrays of x and y positions.
 */
export function collectSnapTargets(siblings: Rect[]): { xTargets: number[]; yTargets: number[] } {
	const xSet = new Set<number>();
	const ySet = new Set<number>();

	for (const r of siblings) {
		// Left edge, center, right edge
		xSet.add(r.x);
		xSet.add(r.x + r.width / 2);
		xSet.add(r.x + r.width);
		// Top edge, center, bottom edge
		ySet.add(r.y);
		ySet.add(r.y + r.height / 2);
		ySet.add(r.y + r.height);
	}

	return {
		xTargets: [...xSet].sort((a, b) => a - b),
		yTargets: [...ySet].sort((a, b) => a - b),
	};
}

/**
 * Snap a dragged rect to nearby sibling edges/centers within a threshold.
 * Returns the snapped rect and the guide lines that should be rendered.
 *
 * Why: Smart guides give the user visual feedback when elements are aligned,
 * making precise layout without manual coordinate entry possible.
 */
export function snapToGuides(dragRect: Rect, siblings: Rect[], threshold: number = 5): SnapResult {
	const { xTargets, yTargets } = collectSnapTargets(siblings);

	// Candidate x positions from the drag rect: left edge, center, right edge
	const dragXEdges = [
		{ value: dragRect.x, offset: 0, type: "edge" as const },
		{ value: dragRect.x + dragRect.width / 2, offset: dragRect.width / 2, type: "center" as const },
		{ value: dragRect.x + dragRect.width, offset: dragRect.width, type: "edge" as const },
	];

	// Candidate y positions from the drag rect: top, center, bottom
	const dragYEdges = [
		{ value: dragRect.y, offset: 0, type: "edge" as const },
		{
			value: dragRect.y + dragRect.height / 2,
			offset: dragRect.height / 2,
			type: "center" as const,
		},
		{ value: dragRect.y + dragRect.height, offset: dragRect.height, type: "edge" as const },
	];

	const guides: GuideLine[] = [];
	let snappedX = dragRect.x;
	let snappedY = dragRect.y;
	let bestDx = threshold + 1;
	let bestDy = threshold + 1;

	// Find closest x snap
	for (const edge of dragXEdges) {
		for (const target of xTargets) {
			const dist = Math.abs(edge.value - target);
			if (dist < bestDx) {
				bestDx = dist;
				snappedX = target - edge.offset;
			}
		}
	}

	// Find closest y snap
	for (const edge of dragYEdges) {
		for (const target of yTargets) {
			const dist = Math.abs(edge.value - target);
			if (dist < bestDy) {
				bestDy = dist;
				snappedY = target - edge.offset;
			}
		}
	}

	// Apply snap only if within threshold, and collect active guide lines
	const finalX = bestDx <= threshold ? snappedX : dragRect.x;
	const finalY = bestDy <= threshold ? snappedY : dragRect.y;

	if (bestDx <= threshold) {
		// Find which target(s) we snapped to and add guide lines
		const snappedRect = { ...dragRect, x: finalX };
		const snappedXEdges = [
			snappedRect.x,
			snappedRect.x + snappedRect.width / 2,
			snappedRect.x + snappedRect.width,
		];
		for (const target of xTargets) {
			for (let i = 0; i < snappedXEdges.length; i++) {
				if (Math.abs(snappedXEdges[i] - target) < 0.5) {
					guides.push({ axis: "x", position: target, type: i === 1 ? "center" : "edge" });
				}
			}
		}
	}

	if (bestDy <= threshold) {
		const snappedRect = { ...dragRect, y: finalY };
		const snappedYEdges = [
			snappedRect.y,
			snappedRect.y + snappedRect.height / 2,
			snappedRect.y + snappedRect.height,
		];
		for (const target of yTargets) {
			for (let i = 0; i < snappedYEdges.length; i++) {
				if (Math.abs(snappedYEdges[i] - target) < 0.5) {
					guides.push({ axis: "y", position: target, type: i === 1 ? "center" : "edge" });
				}
			}
		}
	}

	// Deduplicate guides
	const seen = new Set<string>();
	const uniqueGuides = guides.filter((g) => {
		const key = `${g.axis}:${g.position}:${g.type}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	return {
		rect: { ...dragRect, x: finalX, y: finalY },
		guides: uniqueGuides,
	};
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Compute the bounding box that encloses all given rects. */
export function getBounds(rects: Rect[]): Rect {
	if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const r of rects) {
		minX = Math.min(minX, r.x);
		minY = Math.min(minY, r.y);
		maxX = Math.max(maxX, r.x + r.width);
		maxY = Math.max(maxY, r.y + r.height);
	}

	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
