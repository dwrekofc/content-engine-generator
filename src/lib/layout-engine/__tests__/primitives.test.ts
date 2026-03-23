import { describe, expect, test } from "bun:test";
import type { FlexConfig, GridConfig } from "../../schemas/template-schema";
import { layoutFlexPrimitive } from "../primitives/flex";
import { layoutFreePositionPrimitive } from "../primitives/free-position";
import { layoutGridPrimitive } from "../primitives/grid";
import { layoutSectionPrimitive } from "../primitives/section";
import { layoutStackPrimitive } from "../primitives/stack";
import type { LayoutBounds, SizedItem } from "../types";

// ── Helpers ────────────────────────────────────────────────────────

const bounds: LayoutBounds = { x: 0, y: 0, width: 1000, height: 500 };
const offsetBounds: LayoutBounds = { x: 100, y: 200, width: 800, height: 400 };

function makeItems(count: number, height = 40, width = 100): SizedItem[] {
	return Array.from({ length: count }, () => ({
		intrinsicWidth: width,
		intrinsicHeight: height,
	}));
}

// ── Section primitive ──────────────────────────────────────────────

describe("layoutSectionPrimitive", () => {
	test("stacks items vertically with no gap", () => {
		const items = makeItems(3, 50);
		const result = layoutSectionPrimitive(items, bounds);

		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({ x: 0, y: 0, width: 1000, height: 50 });
		expect(result[1]).toEqual({ x: 0, y: 50, width: 1000, height: 50 });
		expect(result[2]).toEqual({ x: 0, y: 100, width: 1000, height: 50 });
	});

	test("stacks items vertically with gap", () => {
		const items = makeItems(3, 50);
		const result = layoutSectionPrimitive(items, bounds, 10);

		expect(result[0].y).toBe(0);
		expect(result[1].y).toBe(60); // 50 + 10
		expect(result[2].y).toBe(120); // 60 + 50 + 10
	});

	test("respects offset bounds", () => {
		const items = makeItems(2, 30);
		const result = layoutSectionPrimitive(items, offsetBounds, 5);

		expect(result[0]).toEqual({ x: 100, y: 200, width: 800, height: 30 });
		expect(result[1]).toEqual({ x: 100, y: 235, width: 800, height: 30 });
	});

	test("returns empty array for no items", () => {
		expect(layoutSectionPrimitive([], bounds)).toEqual([]);
	});

	test("single item fills width at top", () => {
		const result = layoutSectionPrimitive(makeItems(1, 100), bounds);
		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ x: 0, y: 0, width: 1000, height: 100 });
	});
});

// ── Flex primitive ─────────────────────────────────────────────────

describe("layoutFlexPrimitive", () => {
	describe("row direction", () => {
		const rowConfig: FlexConfig = { direction: "row" };

		test("distributes items equally in a row", () => {
			const items = makeItems(3, 40);
			const result = layoutFlexPrimitive(items, bounds, rowConfig);

			expect(result).toHaveLength(3);
			const expectedWidth = 1000 / 3;
			for (const r of result) {
				expect(r.width).toBeCloseTo(expectedWidth, 5);
			}
		});

		test("items are left-to-right", () => {
			const items = makeItems(3, 40);
			const result = layoutFlexPrimitive(items, bounds, rowConfig);

			expect(result[0].x).toBe(0);
			expect(result[1].x).toBeGreaterThan(result[0].x);
			expect(result[2].x).toBeGreaterThan(result[1].x);
		});

		test("gap reduces available width", () => {
			const items = makeItems(2, 40);
			const config: FlexConfig = { direction: "row", gap: 20 };
			const result = layoutFlexPrimitive(items, bounds, config);

			const expectedWidth = (1000 - 20) / 2;
			expect(result[0].width).toBeCloseTo(expectedWidth, 5);
			expect(result[1].x).toBeCloseTo(result[0].x + expectedWidth + 20, 5);
		});

		test("stretch alignment: items fill container height", () => {
			const items = makeItems(2, 40);
			const config: FlexConfig = { direction: "row", align: "stretch" };
			const result = layoutFlexPrimitive(items, bounds, config);

			for (const r of result) {
				expect(r.y).toBe(0);
				expect(r.height).toBe(500);
			}
		});

		test("center alignment: items vertically centered", () => {
			const items = makeItems(2, 100);
			const config: FlexConfig = { direction: "row", align: "center" };
			const result = layoutFlexPrimitive(items, bounds, config);

			for (const r of result) {
				expect(r.y).toBeCloseTo((500 - 100) / 2, 5);
				expect(r.height).toBe(100);
			}
		});

		test("end alignment: items aligned to bottom", () => {
			const items = makeItems(2, 100);
			const config: FlexConfig = { direction: "row", align: "end" };
			const result = layoutFlexPrimitive(items, bounds, config);

			for (const r of result) {
				expect(r.y).toBeCloseTo(500 - 100, 5);
				expect(r.height).toBe(100);
			}
		});

		test("start alignment: items aligned to top", () => {
			const items = makeItems(2, 100);
			const config: FlexConfig = { direction: "row", align: "start" };
			const result = layoutFlexPrimitive(items, bounds, config);

			for (const r of result) {
				expect(r.y).toBe(0);
				expect(r.height).toBe(100);
			}
		});
	});

	describe("column direction", () => {
		test("items stack vertically", () => {
			const items = makeItems(3, 50);
			const config: FlexConfig = { direction: "column" };
			const result = layoutFlexPrimitive(items, bounds, config);

			expect(result[0].y).toBe(0);
			expect(result[1].y).toBe(50);
			expect(result[2].y).toBe(100);
		});

		test("column with gap", () => {
			const items = makeItems(3, 50);
			const config: FlexConfig = { direction: "column", gap: 10 };
			const result = layoutFlexPrimitive(items, bounds, config);

			expect(result[0].y).toBe(0);
			expect(result[1].y).toBe(60);
			expect(result[2].y).toBe(120);
		});

		test("stretch alignment: items fill container width (default)", () => {
			const items = makeItems(2, 40, 200);
			const config: FlexConfig = { direction: "column" };
			const result = layoutFlexPrimitive(items, bounds, config);

			for (const r of result) {
				expect(r.x).toBe(0);
				expect(r.width).toBe(1000);
			}
		});

		test("center alignment: items horizontally centered", () => {
			const items = makeItems(2, 40, 200);
			const config: FlexConfig = { direction: "column", align: "center" };
			const result = layoutFlexPrimitive(items, bounds, config);

			for (const r of result) {
				expect(r.x).toBeCloseTo((1000 - 200) / 2, 5);
				expect(r.width).toBe(200);
			}
		});
	});

	test("empty items returns empty array", () => {
		expect(layoutFlexPrimitive([], bounds, { direction: "row" })).toEqual([]);
	});
});

// ── Grid primitive ─────────────────────────────────────────────────

describe("layoutGridPrimitive", () => {
	test("3x1 grid: items in a single row", () => {
		const items = makeItems(3, 100);
		const config: GridConfig = { columns: 3, rows: 1 };
		const result = layoutGridPrimitive(items, bounds, config);

		expect(result).toHaveLength(3);
		// All same row
		expect(result[0].y).toBe(result[1].y);
		expect(result[1].y).toBe(result[2].y);
		// Equal widths
		expect(result[0].width).toBeCloseTo(1000 / 3, 5);
	});

	test("2x2 grid with gap", () => {
		const items = makeItems(4, 50);
		const config: GridConfig = { columns: 2, rows: 2, gap: 10 };
		const result = layoutGridPrimitive(items, bounds, config);

		expect(result).toHaveLength(4);

		// Row 1: items 0, 1
		expect(result[0].y).toBe(0);
		expect(result[1].y).toBe(0);
		// Row 2: items 2, 3
		expect(result[2].y).toBeCloseTo(result[0].height + 10, 5);
		expect(result[3].y).toBe(result[2].y);

		// Column widths equal
		const expectedWidth = (1000 - 10) / 2;
		expect(result[0].width).toBeCloseTo(expectedWidth, 5);
		expect(result[1].width).toBeCloseTo(expectedWidth, 5);
	});

	test("grid with column ratios", () => {
		const items = makeItems(2, 50);
		const config: GridConfig = { columns: 2, rows: 1, columnSizes: [1, 3] };
		const result = layoutGridPrimitive(items, bounds, config);

		// 1:3 ratio of 1000 = 250 and 750
		expect(result[0].width).toBeCloseTo(250, 5);
		expect(result[1].width).toBeCloseTo(750, 5);
	});

	test("grid with row ratios", () => {
		const items = makeItems(2, 50);
		const config: GridConfig = { columns: 1, rows: 2, rowSizes: [1, 2] };
		const result = layoutGridPrimitive(items, bounds, config);

		// 1:2 ratio of 500 = 166.67 and 333.33
		expect(result[0].height).toBeCloseTo(500 / 3, 1);
		expect(result[1].height).toBeCloseTo(1000 / 3, 1);
	});

	test("items beyond grid capacity are ignored", () => {
		const items = makeItems(5, 50);
		const config: GridConfig = { columns: 2, rows: 2 };
		const result = layoutGridPrimitive(items, bounds, config);

		// 2x2 = 4 cells, 5th item dropped
		expect(result).toHaveLength(4);
	});

	test("respects offset bounds", () => {
		const items = makeItems(2, 50);
		const config: GridConfig = { columns: 2, rows: 1 };
		const result = layoutGridPrimitive(items, offsetBounds, config);

		expect(result[0].x).toBe(100);
		expect(result[0].y).toBe(200);
	});

	test("empty items returns empty array", () => {
		const config: GridConfig = { columns: 2, rows: 2 };
		expect(layoutGridPrimitive([], bounds, config)).toEqual([]);
	});
});

// ── Stack primitive ────────────────────────────────────────────────

describe("layoutStackPrimitive", () => {
	test("all items at the same position filling bounds", () => {
		const items = makeItems(3, 100);
		const result = layoutStackPrimitive(items, bounds);

		expect(result).toHaveLength(3);
		for (const r of result) {
			expect(r).toEqual(bounds);
		}
	});

	test("works with offset bounds", () => {
		const items = makeItems(2, 50);
		const result = layoutStackPrimitive(items, offsetBounds);

		for (const r of result) {
			expect(r).toEqual(offsetBounds);
		}
	});

	test("empty items returns empty array", () => {
		expect(layoutStackPrimitive([], bounds)).toEqual([]);
	});
});

// ── Free-position primitive ────────────────────────────────────────

describe("layoutFreePositionPrimitive", () => {
	test("positioned items use absolute coordinates relative to bounds", () => {
		const items = makeItems(2, 50);
		const positions = [
			{ x: 10, y: 20, width: 200, height: 100 },
			{ x: 300, y: 50, width: 150, height: 80 },
		];
		const result = layoutFreePositionPrimitive(items, bounds, positions);

		expect(result[0]).toEqual({ x: 10, y: 20, width: 200, height: 100 });
		expect(result[1]).toEqual({ x: 300, y: 50, width: 150, height: 80 });
	});

	test("positioned items offset by parent bounds", () => {
		const items = makeItems(1, 50);
		const positions = [{ x: 10, y: 20, width: 200, height: 100 }];
		const result = layoutFreePositionPrimitive(items, offsetBounds, positions);

		expect(result[0]).toEqual({ x: 110, y: 220, width: 200, height: 100 });
	});

	test("unpositioned items stack at the top", () => {
		const items = makeItems(3, 40);
		const positions = [undefined, undefined, undefined];
		const result = layoutFreePositionPrimitive(items, bounds, positions);

		expect(result[0]).toEqual({ x: 0, y: 0, width: 1000, height: 40 });
		expect(result[1]).toEqual({ x: 0, y: 40, width: 1000, height: 40 });
		expect(result[2]).toEqual({ x: 0, y: 80, width: 1000, height: 40 });
	});

	test("mix of positioned and unpositioned items", () => {
		const items = makeItems(3, 40);
		const positions = [
			undefined, // unpositioned, stacks at top
			{ x: 50, y: 100, width: 200, height: 80 }, // positioned
			undefined, // unpositioned, stacks below first
		];
		const result = layoutFreePositionPrimitive(items, bounds, positions);

		expect(result[0]).toEqual({ x: 0, y: 0, width: 1000, height: 40 }); // stacked
		expect(result[1]).toEqual({ x: 50, y: 100, width: 200, height: 80 }); // positioned
		expect(result[2]).toEqual({ x: 0, y: 40, width: 1000, height: 40 }); // stacked after #0
	});

	test("empty items returns empty array", () => {
		expect(layoutFreePositionPrimitive([], bounds, [])).toEqual([]);
	});
});
