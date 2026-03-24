import type { Card, FreePositionChild, Section, Template } from "../schemas/template-schema";
import { layoutFlexPrimitive } from "./primitives/flex";
import { layoutFreePositionPrimitive } from "./primitives/free-position";
import { layoutGridPrimitive } from "./primitives/grid";
import { layoutSectionPrimitive } from "./primitives/section";
import { layoutStackPrimitive } from "./primitives/stack";
import type { CanvasSize, LayoutBounds, PositionedElement, SizedItem } from "./types";

// ── Default sizing constants ───────────────────────────────────────
// The layout engine is content-agnostic: fields get a default intrinsic
// height since actual content dimensions are unknown at layout time.

export const DEFAULT_FIELD_HEIGHT = 40;
export const DEFAULT_ITEM_GAP = 10;
export const DEFAULT_SECTION_PADDING = 20;
export const DEFAULT_CARD_PADDING = 10;

// ── Internal item representation ───────────────────────────────────

interface ItemInfo extends SizedItem {
	position?: FreePositionChild;
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Computes a flat list of positioned elements from a template and canvas size.
 *
 * Input:  template JSON + target canvas size (width, height)
 * Output: flat list of PositionedElement with absolute coordinates
 *
 * Pure computation — no DOM, no CSS, no rendering. Deterministic.
 */
export function computeLayout(template: Template, canvasSize: CanvasSize): PositionedElement[] {
	const elements: PositionedElement[] = [];

	for (const page of template.pages) {
		// Each page gets a full canvas
		elements.push({
			id: page.id,
			x: 0,
			y: 0,
			width: canvasSize.width,
			height: canvasSize.height,
			type: "page",
			parentId: null,
		});

		if (page.sections.length === 0) continue;

		// Compute intrinsic heights so sections can be scaled to fill the page
		const intrinsicHeights = page.sections.map((s) =>
			computeSectionIntrinsicHeight(s, canvasSize.width),
		);
		const totalIntrinsic = intrinsicHeights.reduce((a, b) => a + b, 0);

		// Proportionally scale sections to fill the page height
		const scale = totalIntrinsic > 0 ? canvasSize.height / totalIntrinsic : 1;

		let currentY = 0;
		for (let i = 0; i < page.sections.length; i++) {
			const height = intrinsicHeights[i] * scale;
			const sectionBounds: LayoutBounds = {
				x: 0,
				y: currentY,
				width: canvasSize.width,
				height,
			};
			layoutSectionRecursive(page.sections[i], sectionBounds, page.id, elements);
			currentY += height;
		}
	}

	return elements;
}

// ── Section traversal (recursive) ──────────────────────────────────

function layoutSectionRecursive(
	section: Section,
	bounds: LayoutBounds,
	parentId: string,
	elements: PositionedElement[],
): void {
	// Emit the section's own bounding box
	elements.push({
		id: section.id,
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
		type: "section",
		parentId,
	});

	// Inner bounds after padding
	const pad = DEFAULT_SECTION_PADDING;
	const inner: LayoutBounds = {
		x: bounds.x + pad,
		y: bounds.y + pad,
		width: Math.max(0, bounds.width - pad * 2),
		height: Math.max(0, bounds.height - pad * 2),
	};

	// Gather items: fields first, then cards, then children (declaration order)
	const items = gatherItems(section, inner.width);
	if (items.length === 0) return;

	// Dispatch to the appropriate layout primitive
	const positions = dispatchLayout(section, items, inner);

	// Emit positioned elements and recurse into containers
	let idx = 0;

	// Fields
	for (const field of section.fields) {
		const pos = positions[idx++];
		elements.push({
			id: field.id,
			x: pos.x,
			y: pos.y,
			width: pos.width,
			height: pos.height,
			type: "field",
			parentId: section.id,
			// In stack layout, assign z-index based on declaration order
			...(section.layout === "stack" ? { zIndex: idx - 1 } : {}),
		});
	}

	// Cards
	for (const card of section.cards) {
		const pos = positions[idx++];
		elements.push({
			id: card.id,
			x: pos.x,
			y: pos.y,
			width: pos.width,
			height: pos.height,
			type: "card",
			parentId: section.id,
			...(section.layout === "stack" ? { zIndex: idx - 1 } : {}),
		});
		layoutCardFields(card, pos, elements);
	}

	// Children (sub-sections) — recurse
	for (const child of section.children) {
		const pos = positions[idx++];
		layoutSectionRecursive(child, pos, section.id, elements);
		// In stack layout, assign z-index to child section elements too
		if (section.layout === "stack") {
			const childEl = elements.find((el) => el.id === child.id);
			if (childEl) childEl.zIndex = idx - 1;
		}
	}
}

// ── Card field layout ──────────────────────────────────────────────

function layoutCardFields(
	card: Card,
	cardBounds: LayoutBounds,
	elements: PositionedElement[],
): void {
	const pad = DEFAULT_CARD_PADDING;
	let currentY = cardBounds.y + pad;
	const fieldWidth = Math.max(0, cardBounds.width - pad * 2);

	for (const field of card.fields) {
		elements.push({
			id: field.id,
			x: cardBounds.x + pad,
			y: currentY,
			width: fieldWidth,
			height: DEFAULT_FIELD_HEIGHT,
			type: "card-field",
			parentId: card.id,
		});
		currentY += DEFAULT_FIELD_HEIGHT + DEFAULT_ITEM_GAP;
	}
}

// ── Item gathering ─────────────────────────────────────────────────

function gatherItems(section: Section, availableWidth: number): ItemInfo[] {
	const items: ItemInfo[] = [];

	for (const _field of section.fields) {
		items.push({
			intrinsicWidth: availableWidth,
			intrinsicHeight: DEFAULT_FIELD_HEIGHT,
		});
	}

	for (const card of section.cards) {
		items.push({
			intrinsicWidth: availableWidth,
			intrinsicHeight: computeCardIntrinsicHeight(card),
		});
	}

	for (const child of section.children) {
		items.push({
			intrinsicWidth: availableWidth,
			intrinsicHeight: computeSectionIntrinsicHeight(child, availableWidth),
			position: child.position,
		});
	}

	return items;
}

// ── Layout dispatch ────────────────────────────────────────────────

function dispatchLayout(section: Section, items: ItemInfo[], bounds: LayoutBounds): LayoutBounds[] {
	switch (section.layout) {
		case "section":
			return layoutSectionPrimitive(items, bounds, DEFAULT_ITEM_GAP);

		case "flex":
			return layoutFlexPrimitive(items, bounds, section.flexConfig ?? { direction: "column" });

		case "grid":
			return layoutGridPrimitive(items, bounds, section.gridConfig ?? { columns: 1, rows: 1 });

		case "stack":
			return layoutStackPrimitive(items, bounds);

		case "free-position":
			return layoutFreePositionPrimitive(
				items,
				bounds,
				items.map((i) => i.position),
			);

		default:
			// Fallback to vertical stack
			return layoutSectionPrimitive(items, bounds, DEFAULT_ITEM_GAP);
	}
}

// ── Intrinsic size computation (bottom-up) ─────────────────────────

function computeCardIntrinsicHeight(card: Card): number {
	const pad = DEFAULT_CARD_PADDING;
	const n = card.fields.length;
	if (n === 0) return pad * 2;
	return pad * 2 + n * DEFAULT_FIELD_HEIGHT + (n - 1) * DEFAULT_ITEM_GAP;
}

/**
 * Computes the natural height a section needs to display its contents.
 * Used for proportional page-height distribution and nested sizing.
 */
export function computeSectionIntrinsicHeight(section: Section, availableWidth: number): number {
	const pad = DEFAULT_SECTION_PADDING * 2;
	const innerWidth = Math.max(0, availableWidth - pad);
	const items = gatherItems(section, innerWidth);

	if (items.length === 0) return pad;

	switch (section.layout) {
		case "section": {
			const totalGap = Math.max(0, items.length - 1) * DEFAULT_ITEM_GAP;
			return pad + items.reduce((sum, i) => sum + i.intrinsicHeight, 0) + totalGap;
		}

		case "flex": {
			const dir = section.flexConfig?.direction ?? "column";
			const gap = section.flexConfig?.gap ?? 0;
			if (dir === "row") {
				return pad + Math.max(...items.map((i) => i.intrinsicHeight));
			}
			const totalGap = Math.max(0, items.length - 1) * gap;
			return pad + items.reduce((sum, i) => sum + i.intrinsicHeight, 0) + totalGap;
		}

		case "grid": {
			const cols = section.gridConfig?.columns ?? 1;
			const rows = section.gridConfig?.rows ?? Math.ceil(items.length / cols);
			const gap = section.gridConfig?.gap ?? 0;
			const maxCellHeight = Math.max(...items.map((i) => i.intrinsicHeight));
			return pad + rows * maxCellHeight + Math.max(0, rows - 1) * gap;
		}

		case "stack": {
			return pad + Math.max(...items.map((i) => i.intrinsicHeight));
		}

		case "free-position": {
			const positionedBottoms = section.children
				.filter((c): c is Section & { position: NonNullable<Section["position"]> } => !!c.position)
				.map((c) => c.position.y + c.position.height);
			const maxPositioned = positionedBottoms.length > 0 ? Math.max(...positionedBottoms) : 0;
			const unpositionedHeight = items
				.filter((i) => !i.position)
				.reduce((sum, i) => sum + i.intrinsicHeight, 0);
			return pad + Math.max(maxPositioned, unpositionedHeight);
		}

		default:
			return pad;
	}
}
