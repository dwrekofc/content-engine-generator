import type { FlexConfig } from "../../schemas/template-schema";
import type { LayoutBounds, SizedItem } from "../types";

/**
 * Flex layout: mirrors CSS flexbox behavior.
 *
 * Row direction: items distributed equally along the horizontal axis.
 *   Cross-axis (vertical) alignment controlled by `align`.
 *   When `wrap` is true, items use intrinsic widths and wrap to next line
 *   when they exceed container width (mirrors CSS flex-wrap: wrap).
 *
 * Column direction: items stacked vertically using intrinsic heights.
 *   Cross-axis (horizontal) alignment controlled by `align`.
 *   Default align is 'stretch' (items fill container width).
 *   When `wrap` is true, items wrap to next column when they exceed
 *   container height.
 */
export function layoutFlexPrimitive(
	items: SizedItem[],
	bounds: LayoutBounds,
	config: FlexConfig,
): LayoutBounds[] {
	if (items.length === 0) return [];

	const { direction, gap = 0, align = "stretch", wrap = false } = config;

	if (direction === "row") {
		return wrap
			? layoutFlexRowWrap(items, bounds, gap, align)
			: layoutFlexRow(items, bounds, gap, align);
	}
	return wrap
		? layoutFlexColumnWrap(items, bounds, gap, align)
		: layoutFlexColumn(items, bounds, gap, align);
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

/**
 * Row wrap: items use intrinsic widths and wrap to the next line when they
 * exceed container width. Each line's height is the max intrinsic height of
 * items on that line. Lines are separated by `gap`.
 */
function layoutFlexRowWrap(
	items: SizedItem[],
	bounds: LayoutBounds,
	gap: number,
	align: string,
): LayoutBounds[] {
	// First pass: compute lines
	const lines: { items: SizedItem[]; indices: number[] }[] = [];
	let currentLine: { items: SizedItem[]; indices: number[] } = { items: [], indices: [] };
	let lineWidth = 0;

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const needed = currentLine.items.length > 0 ? gap + item.intrinsicWidth : item.intrinsicWidth;

		if (currentLine.items.length > 0 && lineWidth + needed > bounds.width) {
			lines.push(currentLine);
			currentLine = { items: [item], indices: [i] };
			lineWidth = item.intrinsicWidth;
		} else {
			currentLine.items.push(item);
			currentLine.indices.push(i);
			lineWidth += needed;
		}
	}
	if (currentLine.items.length > 0) lines.push(currentLine);

	// Second pass: position items
	const results: LayoutBounds[] = new Array(items.length);
	let currentY = bounds.y;

	for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
		const line = lines[lineIdx];
		const lineHeight = Math.max(...line.items.map((it) => it.intrinsicHeight));
		let currentX = bounds.x;

		for (let j = 0; j < line.items.length; j++) {
			const item = line.items[j];
			const cross = alignCrossVertical(currentY, lineHeight, item.intrinsicHeight, align);
			results[line.indices[j]] = {
				x: currentX,
				y: cross.y,
				width: item.intrinsicWidth,
				height: cross.height,
			};
			currentX += item.intrinsicWidth + gap;
		}

		currentY += lineHeight;
		if (lineIdx < lines.length - 1) currentY += gap;
	}

	return results;
}

/**
 * Column wrap: items use intrinsic heights and wrap to the next column when
 * they exceed container height. Each column's width is the max intrinsic
 * width of items in that column. Columns are separated by `gap`.
 */
function layoutFlexColumnWrap(
	items: SizedItem[],
	bounds: LayoutBounds,
	gap: number,
	align: string,
): LayoutBounds[] {
	// First pass: compute columns
	const columns: { items: SizedItem[]; indices: number[] }[] = [];
	let currentCol: { items: SizedItem[]; indices: number[] } = { items: [], indices: [] };
	let colHeight = 0;

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const needed = currentCol.items.length > 0 ? gap + item.intrinsicHeight : item.intrinsicHeight;

		if (currentCol.items.length > 0 && colHeight + needed > bounds.height) {
			columns.push(currentCol);
			currentCol = { items: [item], indices: [i] };
			colHeight = item.intrinsicHeight;
		} else {
			currentCol.items.push(item);
			currentCol.indices.push(i);
			colHeight += needed;
		}
	}
	if (currentCol.items.length > 0) columns.push(currentCol);

	// Second pass: position items
	const results: LayoutBounds[] = new Array(items.length);
	let currentX = bounds.x;

	for (let colIdx = 0; colIdx < columns.length; colIdx++) {
		const col = columns[colIdx];
		const colWidth = Math.max(...col.items.map((it) => it.intrinsicWidth));
		let currentY = bounds.y;

		for (let j = 0; j < col.items.length; j++) {
			const item = col.items[j];
			const cross = alignCrossHorizontal(currentX, colWidth, item.intrinsicWidth, align);
			results[col.indices[j]] = {
				x: cross.x,
				y: currentY,
				width: cross.width,
				height: item.intrinsicHeight,
			};
			currentY += item.intrinsicHeight + gap;
		}

		currentX += colWidth;
		if (colIdx < columns.length - 1) currentX += gap;
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
