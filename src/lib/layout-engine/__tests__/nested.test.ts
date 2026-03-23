import { describe, expect, test } from "bun:test";
import type { Template } from "../../schemas/template-schema";
import { computeLayout, DEFAULT_SECTION_PADDING } from "../core";
import type { CanvasSize, PositionedElement } from "../types";

const canvas: CanvasSize = { width: 1000, height: 800 };

function findById(elements: PositionedElement[], id: string): PositionedElement {
	const el = elements.find((e) => e.id === id);
	if (!el) throw new Error(`Element "${id}" not found`);
	return el;
}

// ── Nested composition tests ───────────────────────────────────────
// These verify that any container can nest inside any other container,
// per the spec: "Containers are composable: any container can nest
// inside any other container."

describe("nested compositions", () => {
	test("grid containing flex children", () => {
		const template: Template = {
			id: "nested-1",
			name: "Grid with Flex",
			pages: [
				{
					id: "p1",
					sections: [
						{
							id: "grid-parent",
							layout: "grid",
							gridConfig: { columns: 2, rows: 1 },
							fields: [],
							cards: [],
							children: [
								{
									id: "flex-child-1",
									layout: "flex",
									flexConfig: { direction: "column", gap: 5 },
									fields: [
										{ id: "f1", type: "title", required: true },
										{ id: "f2", type: "paragraph", required: true },
									],
									cards: [],
									children: [],
								},
								{
									id: "flex-child-2",
									layout: "flex",
									flexConfig: { direction: "column", gap: 5 },
									fields: [{ id: "f3", type: "title", required: true }],
									cards: [],
									children: [],
								},
							],
						},
					],
				},
			],
		};

		const elements = computeLayout(template, canvas);

		const _grid = findById(elements, "grid-parent");
		const flex1 = findById(elements, "flex-child-1");
		const flex2 = findById(elements, "flex-child-2");

		// Grid children are side by side
		expect(flex1.parentId).toBe("grid-parent");
		expect(flex2.parentId).toBe("grid-parent");
		expect(flex2.x).toBeGreaterThan(flex1.x);

		// Fields within flex children stack vertically
		const f1 = findById(elements, "f1");
		const f2 = findById(elements, "f2");
		expect(f1.parentId).toBe("flex-child-1");
		expect(f2.parentId).toBe("flex-child-1");
		expect(f2.y).toBeGreaterThan(f1.y);
	});

	test("flex containing stack children", () => {
		const template: Template = {
			id: "nested-2",
			name: "Flex with Stack",
			pages: [
				{
					id: "p1",
					sections: [
						{
							id: "flex-parent",
							layout: "flex",
							flexConfig: { direction: "row" },
							fields: [],
							cards: [],
							children: [
								{
									id: "stack-child",
									layout: "stack",
									fields: [
										{ id: "bg", type: "background", required: true },
										{ id: "title", type: "title", required: true },
									],
									cards: [],
									children: [],
								},
							],
						},
					],
				},
			],
		};

		const elements = computeLayout(template, canvas);

		const bg = findById(elements, "bg");
		const title = findById(elements, "title");

		// Stack items overlap
		expect(bg.x).toBe(title.x);
		expect(bg.y).toBe(title.y);
		expect(bg.width).toBe(title.width);
		expect(bg.height).toBe(title.height);
	});

	test("free-position containing grid child", () => {
		const template: Template = {
			id: "nested-3",
			name: "Free with Grid",
			pages: [
				{
					id: "p1",
					sections: [
						{
							id: "free-parent",
							layout: "free-position",
							fields: [],
							cards: [],
							children: [
								{
									id: "grid-child",
									layout: "grid",
									gridConfig: { columns: 2, rows: 1 },
									position: { x: 50, y: 50, width: 600, height: 300 },
									fields: [
										{ id: "g1", type: "title", required: true },
										{ id: "g2", type: "paragraph", required: true },
									],
									cards: [],
									children: [],
								},
							],
						},
					],
				},
			],
		};

		const elements = computeLayout(template, canvas);

		const gridChild = findById(elements, "grid-child");
		const freeParent = findById(elements, "free-parent");
		const pad = DEFAULT_SECTION_PADDING;

		// Grid child at absolute position relative to parent inner bounds
		expect(gridChild.x).toBeCloseTo(freeParent.x + pad + 50, 5);
		expect(gridChild.y).toBeCloseTo(freeParent.y + pad + 50, 5);
		expect(gridChild.width).toBe(600);
		expect(gridChild.height).toBe(300);

		// Grid fields are within the grid child
		const g1 = findById(elements, "g1");
		const g2 = findById(elements, "g2");
		expect(g1.parentId).toBe("grid-child");
		expect(g2.parentId).toBe("grid-child");
		// Side by side in 2x1 grid
		expect(g2.x).toBeGreaterThan(g1.x);
	});

	test("3-level nesting: section > flex > grid", () => {
		const template: Template = {
			id: "nested-4",
			name: "3-Level Deep",
			pages: [
				{
					id: "p1",
					sections: [
						{
							id: "outer-section",
							layout: "section",
							fields: [{ id: "header", type: "title", required: true }],
							cards: [],
							children: [
								{
									id: "mid-flex",
									layout: "flex",
									flexConfig: { direction: "row" },
									fields: [],
									cards: [],
									children: [
										{
											id: "inner-grid",
											layout: "grid",
											gridConfig: { columns: 2, rows: 1 },
											fields: [
												{ id: "cell-1", type: "title", required: true },
												{ id: "cell-2", type: "paragraph", required: true },
											],
											cards: [],
											children: [],
										},
									],
								},
							],
						},
					],
				},
			],
		};

		const elements = computeLayout(template, canvas);

		// Verify parent chain
		const header = findById(elements, "header");
		expect(header.parentId).toBe("outer-section");

		const midFlex = findById(elements, "mid-flex");
		expect(midFlex.parentId).toBe("outer-section");

		const innerGrid = findById(elements, "inner-grid");
		expect(innerGrid.parentId).toBe("mid-flex");

		const cell1 = findById(elements, "cell-1");
		const cell2 = findById(elements, "cell-2");
		expect(cell1.parentId).toBe("inner-grid");
		expect(cell2.parentId).toBe("inner-grid");

		// Grid cells should be side by side
		expect(cell2.x).toBeGreaterThan(cell1.x);

		// Header should be above the flex
		expect(midFlex.y).toBeGreaterThan(header.y);
	});

	test("multi-page layout produces independent page layouts", () => {
		const template: Template = {
			id: "multi-page",
			name: "Multi Page",
			pages: [
				{
					id: "p1",
					sections: [
						{
							id: "s1",
							layout: "section",
							fields: [{ id: "f1", type: "title", required: true }],
							cards: [],
							children: [],
						},
					],
				},
				{
					id: "p2",
					sections: [
						{
							id: "s2",
							layout: "section",
							fields: [{ id: "f2", type: "title", required: true }],
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const elements = computeLayout(template, canvas);

		const p1 = findById(elements, "p1");
		const p2 = findById(elements, "p2");

		// Both pages start at (0,0) — they're independent canvases
		expect(p1.x).toBe(0);
		expect(p1.y).toBe(0);
		expect(p2.x).toBe(0);
		expect(p2.y).toBe(0);

		// Sections in different pages are independent
		const s1 = findById(elements, "s1");
		const s2 = findById(elements, "s2");
		expect(s1.parentId).toBe("p1");
		expect(s2.parentId).toBe("p2");
	});
});
