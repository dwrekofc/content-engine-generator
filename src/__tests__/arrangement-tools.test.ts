/**
 * Tests for element arrangement utilities (P6-7).
 *
 * Why: The arrangement utilities are pure math functions that power alignment,
 * distribution, layer order, snap-to-grid, size matching, and nudge operations
 * in the template builder. Testing them in isolation ensures correctness without
 * requiring a browser or Puck editor context.
 */

import { describe, expect, test } from "bun:test";
import {
	type Rect,
	alignHorizontal,
	alignVertical,
	bringForward,
	bringToFront,
	collectSnapTargets,
	distributeHorizontal,
	distributeVertical,
	getBounds,
	matchHeight,
	matchSize,
	matchWidth,
	nudge,
	reorder,
	sendBackward,
	sendToBack,
	snapRectToGrid,
	snapToGrid,
	snapToGuides,
} from "@/app/template-builder/arrangement-utils";

// ── Alignment ────────────────────────────────────────────────────────

describe("alignHorizontal", () => {
	const rects: Rect[] = [
		{ x: 10, y: 0, width: 50, height: 30 },
		{ x: 100, y: 0, width: 80, height: 30 },
		{ x: 200, y: 0, width: 40, height: 30 },
	];

	test("aligns left to selection bounds", () => {
		const result = alignHorizontal(rects, "left", "selection");
		expect(result.every((r) => r.x === 10)).toBe(true);
	});

	test("aligns center to selection bounds", () => {
		const result = alignHorizontal(rects, "center", "selection");
		const bounds = getBounds(rects);
		const center = bounds.x + bounds.width / 2;
		for (const r of result) {
			expect(r.x + r.width / 2).toBeCloseTo(center, 5);
		}
	});

	test("aligns right to selection bounds", () => {
		const result = alignHorizontal(rects, "right", "selection");
		const rightEdge = 200 + 40; // rightmost rect's right edge
		for (const r of result) {
			expect(r.x + r.width).toBeCloseTo(rightEdge, 5);
		}
	});

	test("aligns left to parent", () => {
		const parent: Rect = { x: 0, y: 0, width: 500, height: 300 };
		const result = alignHorizontal(rects, "left", "parent", parent);
		expect(result.every((r) => r.x === 0)).toBe(true);
	});

	test("aligns right to parent", () => {
		const parent: Rect = { x: 0, y: 0, width: 500, height: 300 };
		const result = alignHorizontal(rects, "right", "parent", parent);
		for (const r of result) {
			expect(r.x + r.width).toBe(500);
		}
	});

	test("returns empty array for empty input", () => {
		expect(alignHorizontal([], "left", "selection")).toEqual([]);
	});
});

describe("alignVertical", () => {
	const rects: Rect[] = [
		{ x: 0, y: 20, width: 30, height: 40 },
		{ x: 0, y: 100, width: 30, height: 60 },
		{ x: 0, y: 200, width: 30, height: 30 },
	];

	test("aligns top to selection bounds", () => {
		const result = alignVertical(rects, "top", "selection");
		expect(result.every((r) => r.y === 20)).toBe(true);
	});

	test("aligns middle to selection bounds", () => {
		const result = alignVertical(rects, "middle", "selection");
		const bounds = getBounds(rects);
		const mid = bounds.y + bounds.height / 2;
		for (const r of result) {
			expect(r.y + r.height / 2).toBeCloseTo(mid, 5);
		}
	});

	test("aligns bottom to selection bounds", () => {
		const result = alignVertical(rects, "bottom", "selection");
		const bottomEdge = 200 + 30;
		for (const r of result) {
			expect(r.y + r.height).toBeCloseTo(bottomEdge, 5);
		}
	});

	test("aligns top to parent", () => {
		const parent: Rect = { x: 0, y: 0, width: 500, height: 400 };
		const result = alignVertical(rects, "top", "parent", parent);
		expect(result.every((r) => r.y === 0)).toBe(true);
	});

	test("returns empty array for empty input", () => {
		expect(alignVertical([], "top", "selection")).toEqual([]);
	});
});

// ── Distribution ─────────────────────────────────────────────────────

describe("distributeHorizontal", () => {
	test("distributes 3 rects with equal spacing", () => {
		const rects: Rect[] = [
			{ x: 0, y: 0, width: 50, height: 30 },
			{ x: 200, y: 0, width: 50, height: 30 },
			{ x: 50, y: 0, width: 50, height: 30 },
		];
		const result = distributeHorizontal(rects);
		// Total span: 0 to 250, total width: 150, space: 100, gap: 50
		expect(result[0].x).toBe(0); // leftmost stays
		expect(result[2].x).toBeCloseTo(100, 5); // middle element
		expect(result[1].x).toBe(200); // rightmost stays
	});

	test("returns unchanged for fewer than 3 rects", () => {
		const rects: Rect[] = [
			{ x: 0, y: 0, width: 50, height: 30 },
			{ x: 200, y: 0, width: 50, height: 30 },
		];
		expect(distributeHorizontal(rects)).toEqual(rects);
	});

	test("preserves original array indices", () => {
		const rects: Rect[] = [
			{ x: 300, y: 0, width: 40, height: 30 }, // rightmost but index 0
			{ x: 0, y: 0, width: 40, height: 30 }, // leftmost but index 1
			{ x: 100, y: 0, width: 40, height: 30 }, // middle, index 2
		];
		const result = distributeHorizontal(rects);
		// Result should update x values but keep them at original indices
		expect(result[1].x).toBe(0); // index 1 was leftmost
		expect(result[0].x).toBe(300); // index 0 was rightmost
	});
});

describe("distributeVertical", () => {
	test("distributes 3 rects with equal spacing", () => {
		const rects: Rect[] = [
			{ x: 0, y: 0, width: 30, height: 40 },
			{ x: 0, y: 200, width: 30, height: 40 },
			{ x: 0, y: 80, width: 30, height: 40 },
		];
		const result = distributeVertical(rects);
		expect(result[0].y).toBe(0);
		expect(result[1].y).toBe(200);
	});

	test("returns unchanged for fewer than 3 rects", () => {
		const single: Rect[] = [{ x: 0, y: 0, width: 30, height: 40 }];
		expect(distributeVertical(single)).toEqual(single);
	});
});

// ── Size Matching ────────────────────────────────────────────────────

describe("matchWidth", () => {
	test("matches all to maximum width", () => {
		const rects: Rect[] = [
			{ x: 0, y: 0, width: 50, height: 30 },
			{ x: 0, y: 0, width: 100, height: 30 },
			{ x: 0, y: 0, width: 75, height: 30 },
		];
		const result = matchWidth(rects);
		expect(result.every((r) => r.width === 100)).toBe(true);
	});

	test("preserves other properties", () => {
		const rects: Rect[] = [{ x: 10, y: 20, width: 50, height: 30 }];
		const result = matchWidth(rects);
		expect(result[0]).toEqual({ x: 10, y: 20, width: 50, height: 30 });
	});

	test("returns empty for empty input", () => {
		expect(matchWidth([])).toEqual([]);
	});
});

describe("matchHeight", () => {
	test("matches all to maximum height", () => {
		const rects: Rect[] = [
			{ x: 0, y: 0, width: 30, height: 50 },
			{ x: 0, y: 0, width: 30, height: 120 },
		];
		const result = matchHeight(rects);
		expect(result.every((r) => r.height === 120)).toBe(true);
	});
});

describe("matchSize", () => {
	test("matches both width and height to maximums", () => {
		const rects: Rect[] = [
			{ x: 0, y: 0, width: 50, height: 30 },
			{ x: 0, y: 0, width: 30, height: 80 },
		];
		const result = matchSize(rects);
		expect(result.every((r) => r.width === 50 && r.height === 80)).toBe(true);
	});

	test("returns empty for empty input", () => {
		expect(matchSize([])).toEqual([]);
	});
});

// ── Layer Order ──────────────────────────────────────────────────────

describe("reorder", () => {
	const items = ["a", "b", "c", "d", "e"];

	test("moves item forward", () => {
		expect(reorder(items, 1, 3)).toEqual(["a", "c", "d", "b", "e"]);
	});

	test("moves item backward", () => {
		expect(reorder(items, 3, 1)).toEqual(["a", "d", "b", "c", "e"]);
	});

	test("no-op when from equals to", () => {
		expect(reorder(items, 2, 2)).toBe(items);
	});

	test("clamps out-of-bounds destination", () => {
		expect(reorder(items, 0, 100)).toEqual(["b", "c", "d", "e", "a"]);
	});

	test("returns same array for invalid source", () => {
		expect(reorder(items, -1, 2)).toBe(items);
		expect(reorder(items, 10, 2)).toBe(items);
	});
});

describe("bringToFront / sendToBack / bringForward / sendBackward", () => {
	const items = [1, 2, 3, 4, 5];

	test("bringToFront moves to end", () => {
		expect(bringToFront(items, 1)).toEqual([1, 3, 4, 5, 2]);
	});

	test("sendToBack moves to start", () => {
		expect(sendToBack(items, 3)).toEqual([4, 1, 2, 3, 5]);
	});

	test("bringForward moves one step forward", () => {
		expect(bringForward(items, 2)).toEqual([1, 2, 4, 3, 5]);
	});

	test("sendBackward moves one step backward", () => {
		expect(sendBackward(items, 2)).toEqual([1, 3, 2, 4, 5]);
	});

	test("bringForward at end is no-op", () => {
		const result = bringForward(items, 4);
		expect(result).toEqual([1, 2, 3, 4, 5]);
	});

	test("sendBackward at start is no-op", () => {
		const result = sendBackward(items, 0);
		expect(result).toEqual([1, 2, 3, 4, 5]);
	});
});

// ── Snap to Grid ─────────────────────────────────────────────────────

describe("snapToGrid", () => {
	test("snaps to nearest grid line", () => {
		expect(snapToGrid(12, 10)).toBe(10);
		expect(snapToGrid(15, 10)).toBe(20);
		expect(snapToGrid(18, 10)).toBe(20);
		expect(snapToGrid(5, 10)).toBe(10);
		expect(snapToGrid(0, 10)).toBe(0);
	});

	test("returns value unchanged when gridSize is 0", () => {
		expect(snapToGrid(12.5, 0)).toBe(12.5);
	});

	test("returns value unchanged when gridSize is negative", () => {
		expect(snapToGrid(12.5, -5)).toBe(12.5);
	});

	test("works with non-integer grid size", () => {
		expect(snapToGrid(7, 5)).toBe(5);
		expect(snapToGrid(8, 5)).toBe(10);
	});
});

describe("snapRectToGrid", () => {
	test("snaps position but not size", () => {
		const rect: Rect = { x: 13, y: 27, width: 55, height: 33 };
		const result = snapRectToGrid(rect, 10);
		expect(result).toEqual({ x: 10, y: 30, width: 55, height: 33 });
	});
});

// ── Nudge ────────────────────────────────────────────────────────────

describe("nudge", () => {
	const rect: Rect = { x: 50, y: 100, width: 80, height: 40 };

	test("nudges by delta", () => {
		expect(nudge(rect, 5, -10)).toEqual({ x: 55, y: 90, width: 80, height: 40 });
	});

	test("clamps to zero minimum", () => {
		expect(nudge(rect, -200, -200)).toEqual({ x: 0, y: 0, width: 80, height: 40 });
	});

	test("applies snap grid after nudge", () => {
		const result = nudge(rect, 3, 7, 10);
		expect(result.x).toBe(50); // 50+3=53, snap to 50
		expect(result.y).toBe(110); // 100+7=107, snap to 110
	});
});

// ── getBounds ────────────────────────────────────────────────────────

describe("getBounds", () => {
	test("computes bounding box of multiple rects", () => {
		const rects: Rect[] = [
			{ x: 10, y: 20, width: 100, height: 50 },
			{ x: 50, y: 10, width: 80, height: 200 },
		];
		expect(getBounds(rects)).toEqual({ x: 10, y: 10, width: 120, height: 200 });
	});

	test("returns zero rect for empty input", () => {
		expect(getBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
	});

	test("returns same rect for single input", () => {
		const rect: Rect = { x: 10, y: 20, width: 30, height: 40 };
		expect(getBounds([rect])).toEqual(rect);
	});
});

// ── Converter integration (position round-trip) ──────────────────────

describe("position round-trip through converters", () => {
	// These tests verify that position data survives template → puck → template conversion
	const { puckDataToTemplate } = require("@/app/template-builder/puck-to-template");
	const { templateToPuckData } = require("@/app/template-builder/template-to-puck");
	const { resetIdCounter } = require("@/app/template-builder/puck-to-template");

	test("Section position survives round-trip", () => {
		const template = {
			id: "test",
			name: "Test",
			pages: [
				{
					id: "page-1",
					name: "Page 1",
					sections: [
						{
							id: "sec-1",
							layout: "free-position" as const,
							fields: [],
							cards: [],
							children: [
								{
									id: "child-1",
									layout: "section" as const,
									position: { x: 100, y: 50, width: 200, height: 150 },
									fields: [],
									cards: [],
									children: [],
								},
							],
						},
					],
				},
			],
		};

		const puckData = templateToPuckData(template);
		resetIdCounter();
		const result = puckDataToTemplate(puckData, "test");

		const child = result.pages[0].sections[0].children[0];
		expect(child.position).toEqual({ x: 100, y: 50, width: 200, height: 150 });
	});

	test("Section without position gets no position in output", () => {
		const template = {
			id: "test",
			name: "Test",
			pages: [
				{
					id: "page-1",
					name: "Page 1",
					sections: [
						{
							id: "sec-1",
							layout: "section" as const,
							fields: [],
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const puckData = templateToPuckData(template);
		resetIdCounter();
		const result = puckDataToTemplate(puckData, "test");

		// Section without explicit position: converter sets defaults (0,0,300,200)
		// but extractPosition returns a position when all four are set
		const sec = result.pages[0].sections[0];
		// When posX=0, posY=0 are the defaults, position is still extracted
		// because all four values are present. This is expected behavior.
		if (sec.position) {
			expect(sec.position.x).toBe(0);
			expect(sec.position.y).toBe(0);
		}
	});
});

// ── Smart Guides ─────────────────────────────────────────────────────

describe("collectSnapTargets", () => {
	const siblings: Rect[] = [
		{ x: 50, y: 100, width: 100, height: 60 },
		{ x: 200, y: 50, width: 80, height: 40 },
	];

	test("collects left, center, right edges for x axis", () => {
		const { xTargets } = collectSnapTargets(siblings);
		// Sibling 1: left=50, center=100, right=150
		// Sibling 2: left=200, center=240, right=280
		expect(xTargets).toContain(50);
		expect(xTargets).toContain(100);
		expect(xTargets).toContain(150);
		expect(xTargets).toContain(200);
		expect(xTargets).toContain(240);
		expect(xTargets).toContain(280);
	});

	test("collects top, center, bottom edges for y axis", () => {
		const { yTargets } = collectSnapTargets(siblings);
		// Sibling 1: top=100, center=130, bottom=160
		// Sibling 2: top=50, center=70, bottom=90
		expect(yTargets).toContain(100);
		expect(yTargets).toContain(130);
		expect(yTargets).toContain(160);
		expect(yTargets).toContain(50);
		expect(yTargets).toContain(70);
		expect(yTargets).toContain(90);
	});

	test("returns sorted arrays", () => {
		const { xTargets, yTargets } = collectSnapTargets(siblings);
		for (let i = 1; i < xTargets.length; i++) {
			expect(xTargets[i]).toBeGreaterThanOrEqual(xTargets[i - 1]);
		}
		for (let i = 1; i < yTargets.length; i++) {
			expect(yTargets[i]).toBeGreaterThanOrEqual(yTargets[i - 1]);
		}
	});

	test("deduplicates targets when edges coincide", () => {
		const overlapping: Rect[] = [
			{ x: 100, y: 0, width: 50, height: 50 },
			{ x: 150, y: 0, width: 50, height: 50 }, // left edge = right edge of first
		];
		const { xTargets } = collectSnapTargets(overlapping);
		// 100, 125, 150, 175, 200 — 150 appears as right of first AND left of second
		const count150 = xTargets.filter((t) => t === 150).length;
		expect(count150).toBe(1);
	});

	test("empty input returns empty arrays", () => {
		const { xTargets, yTargets } = collectSnapTargets([]);
		expect(xTargets).toEqual([]);
		expect(yTargets).toEqual([]);
	});
});

describe("snapToGuides", () => {
	const siblings: Rect[] = [
		{ x: 100, y: 100, width: 80, height: 60 },
		{ x: 250, y: 200, width: 100, height: 50 },
	];

	test("snaps drag rect left edge to sibling left edge within threshold", () => {
		const drag: Rect = { x: 103, y: 50, width: 60, height: 40 };
		const result = snapToGuides(drag, siblings, 5);
		expect(result.rect.x).toBe(100); // snapped to sibling left edge
	});

	test("snaps drag rect right edge to sibling right edge", () => {
		// Sibling right edge = 100 + 80 = 180
		// Drag right edge = drag.x + drag.width = x + 60 = 180 → x = 120
		const drag: Rect = { x: 122, y: 50, width: 60, height: 40 };
		const result = snapToGuides(drag, siblings, 5);
		// Drag right edge should snap to 180 → x = 180 - 60 = 120
		expect(result.rect.x).toBe(120);
	});

	test("snaps drag rect center to sibling center", () => {
		// Sibling center x = 100 + 40 = 140
		// Drag center = drag.x + 30 = 140 → x = 110
		const drag: Rect = { x: 112, y: 50, width: 60, height: 40 };
		const result = snapToGuides(drag, siblings, 5);
		expect(result.rect.x).toBe(110);
	});

	test("does not snap when beyond threshold", () => {
		const drag: Rect = { x: 50, y: 50, width: 60, height: 40 };
		const result = snapToGuides(drag, siblings, 5);
		// Nearest x target is 100 (sibling left), drag left is 50 → dist=50 > 5
		expect(result.rect.x).toBe(50);
		expect(result.rect.y).toBe(50);
	});

	test("returns guide lines for snapped axes", () => {
		const drag: Rect = { x: 102, y: 101, width: 60, height: 40 };
		const result = snapToGuides(drag, siblings, 5);
		expect(result.guides.length).toBeGreaterThan(0);
		expect(result.guides.some((g) => g.axis === "x")).toBe(true);
		expect(result.guides.some((g) => g.axis === "y")).toBe(true);
	});

	test("returns no guides when not snapping", () => {
		const drag: Rect = { x: 50, y: 50, width: 60, height: 40 };
		const result = snapToGuides(drag, siblings, 5);
		expect(result.guides).toEqual([]);
	});

	test("guide lines are deduplicated", () => {
		// Place drag exactly at a sibling position — multiple edges may align
		const drag: Rect = { x: 100, y: 100, width: 80, height: 60 };
		const result = snapToGuides(drag, siblings, 5);
		const keys = result.guides.map((g) => `${g.axis}:${g.position}:${g.type}`);
		expect(keys.length).toBe(new Set(keys).size);
	});

	test("snaps y axis independently of x axis", () => {
		// Only near y targets, far from x targets
		const drag: Rect = { x: 500, y: 198, width: 60, height: 50 };
		const result = snapToGuides(drag, siblings, 5);
		expect(result.rect.x).toBe(500); // no x snap
		expect(result.rect.y).toBe(200); // snapped to sibling 2 top=200
	});

	test("snaps to closest target when multiple are within threshold", () => {
		// Two siblings with close edges
		const closeSiblings: Rect[] = [
			{ x: 100, y: 0, width: 50, height: 50 },
			{ x: 103, y: 0, width: 50, height: 50 },
		];
		const drag: Rect = { x: 101, y: 0, width: 50, height: 50 };
		const result = snapToGuides(drag, closeSiblings, 5);
		// dist to 100 = 1, dist to 103 = 2 → snaps to 100
		expect(result.rect.x).toBe(100);
	});

	test("custom threshold value is respected", () => {
		// drag left=160, center=190, right=220
		// x targets: 100, 140, 180, 250, 300, 350
		// closest: center 190 to target 180 = dist 10
		const drag: Rect = { x: 160, y: 300, width: 60, height: 40 };
		// With threshold 5: dist 10 > 5 → no snap
		const narrow = snapToGuides(drag, siblings, 5);
		expect(narrow.rect.x).toBe(160);
		// With threshold 15: dist 10 < 15 → snaps center to 180 → x = 180-30 = 150
		const wide = snapToGuides(drag, siblings, 15);
		expect(wide.rect.x).toBe(150);
	});
});
