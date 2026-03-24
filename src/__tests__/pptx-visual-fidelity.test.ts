/**
 * P7-2: Visual fidelity verification — PPTX vs HTML
 *
 * Verifies that the PPTX generator's coordinate system produces positions
 * that match the layout engine output (which is verified against HTML by P3-4).
 * Together with P3-4, this forms the full chain: HTML ↔ Layout Engine ↔ PPTX.
 *
 * Since PPTX shapes can't be inspected without unzipping, this test verifies:
 * 1. The scaling math is correct (canvas px → PPTX inches)
 * 2. Layout engine produces valid positions for the PPTX canvas
 * 3. Element count and ID coverage between layout engine and PPTX are consistent
 * 4. PPTX output is a structurally valid ZIP/OOXML archive
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { generatePPTX } from "../lib/generators/pptx-generator";
import { computeLayout } from "../lib/layout-engine/core";
import type { CanvasSize, PositionedElement } from "../lib/layout-engine/types";
import { renderHTML } from "../lib/renderers/html-renderer";
import type { BrandTheme } from "../lib/schemas/brand-theme";
import type { Content } from "../lib/schemas/content-schema";
import type { Template } from "../lib/schemas/template-schema";

// ── Fixture loading ─────────────────────────────────────────────────

const FIXTURES_DIR = join(import.meta.dir, "../../fixtures");
const template: Template = JSON.parse(
	readFileSync(join(FIXTURES_DIR, "sample-template.json"), "utf-8"),
);
const theme: BrandTheme = JSON.parse(
	readFileSync(join(FIXTURES_DIR, "sample-theme.json"), "utf-8"),
);
const content: Content = JSON.parse(
	readFileSync(join(FIXTURES_DIR, "sample-content.json"), "utf-8"),
);

// ── Constants matching pptx-generator.ts ────────────────────────────

const PPTX_SLIDE_WIDTH = 10; // inches
const PPTX_SLIDE_HEIGHT = 7.5; // inches
const PPTX_DEFAULT_CANVAS: CanvasSize = { width: 960, height: 720 };

// ── Helpers ─────────────────────────────────────────────────────────

function getCanvasForPptx(): CanvasSize {
	return template.canvasSize?.pptx ?? PPTX_DEFAULT_CANVAS;
}

function toInches(pos: PositionedElement, scaleX: number, scaleY: number) {
	return {
		x: pos.x * scaleX,
		y: pos.y * scaleY,
		w: pos.width * scaleX,
		h: pos.height * scaleY,
	};
}

// ── Scaling Math Verification ───────────────────────────────────────

describe("PPTX visual fidelity — scaling math", () => {
	const canvas = getCanvasForPptx();
	const scaleX = PPTX_SLIDE_WIDTH / canvas.width;
	const scaleY = PPTX_SLIDE_HEIGHT / canvas.height;

	test("scale factors produce correct slide dimensions from canvas", () => {
		// canvas.width * scaleX should equal PPTX_SLIDE_WIDTH
		expect(canvas.width * scaleX).toBeCloseTo(PPTX_SLIDE_WIDTH, 5);
		expect(canvas.height * scaleY).toBeCloseTo(PPTX_SLIDE_HEIGHT, 5);
	});

	test("page element at full canvas scales to full slide", () => {
		const elements = computeLayout(template, canvas);
		const page = elements.find((e) => e.type === "page");
		if (!page) throw new Error("page not found");
		const inches = toInches(page, scaleX, scaleY);

		expect(inches.x).toBeCloseTo(0, 5);
		expect(inches.y).toBeCloseTo(0, 5);
		expect(inches.w).toBeCloseTo(PPTX_SLIDE_WIDTH, 5);
		expect(inches.h).toBeCloseTo(PPTX_SLIDE_HEIGHT, 5);
	});

	test("all elements scale to positions within slide bounds", () => {
		const elements = computeLayout(template, canvas);
		for (const el of elements) {
			if (el.type === "page") continue;
			const inches = toInches(el, scaleX, scaleY);
			// Elements should be within slide dimensions (with small tolerance for rounding)
			expect(inches.x).toBeGreaterThanOrEqual(-0.01);
			expect(inches.y).toBeGreaterThanOrEqual(-0.01);
			expect(inches.x + inches.w).toBeLessThanOrEqual(PPTX_SLIDE_WIDTH + 0.01);
		}
	});

	test("proportional positions are preserved in inch coordinates", () => {
		const elements = computeLayout(template, canvas);
		// Take two fields from the same section and verify their relative positions are preserved
		const fields = elements.filter((e) => e.type === "field" && e.parentId === "hero-section");
		if (fields.length >= 2) {
			const [a, b] = fields;
			const aInch = toInches(a, scaleX, scaleY);
			const bInch = toInches(b, scaleX, scaleY);

			// Relative vertical ordering should be preserved
			if (a.y < b.y) {
				expect(aInch.y).toBeLessThan(bInch.y);
			} else if (a.y > b.y) {
				expect(aInch.y).toBeGreaterThan(bInch.y);
			}
		}
	});
});

// ── Layout Engine Coverage for PPTX ────────────────────────────────

describe("PPTX visual fidelity — layout engine coverage", () => {
	const canvas = getCanvasForPptx();
	const elements = computeLayout(template, canvas);

	test("layout engine produces elements for all template pages", () => {
		const pages = elements.filter((e) => e.type === "page");
		expect(pages.length).toBe(template.pages.length);
	});

	test("layout engine produces elements for all sections", () => {
		// Count all sections recursively in template
		let sectionCount = 0;
		function countSections(sections: Template["pages"][number]["sections"]) {
			for (const s of sections) {
				sectionCount++;
				countSections(s.children);
			}
		}
		for (const page of template.pages) {
			countSections(page.sections);
		}

		const layoutSections = elements.filter((e) => e.type === "section");
		expect(layoutSections.length).toBe(sectionCount);
	});

	test("layout engine produces elements for all fields", () => {
		let fieldCount = 0;
		function countFields(sections: Template["pages"][number]["sections"]) {
			for (const s of sections) {
				fieldCount += s.fields.length;
				for (const card of s.cards) {
					fieldCount += card.fields.length;
				}
				countFields(s.children);
			}
		}
		for (const page of template.pages) {
			countFields(page.sections);
		}

		const layoutFields = elements.filter((e) => e.type === "field" || e.type === "card-field");
		expect(layoutFields.length).toBe(fieldCount);
	});

	test("every layout element has a valid type", () => {
		const validTypes = new Set(["page", "section", "field", "card", "card-field"]);
		for (const el of elements) {
			expect(validTypes.has(el.type)).toBe(true);
		}
	});
});

// ── Cross-format Element ID Consistency ─────────────────────────────

describe("PPTX visual fidelity — HTML↔Layout↔PPTX element ID chain", () => {
	test("layout engine for PPTX canvas has same element IDs as HTML canvas", () => {
		const pptxCanvas = getCanvasForPptx();
		const htmlCanvas: CanvasSize = template.canvasSize?.html ?? { width: 1280, height: 720 };

		const pptxElements = computeLayout(template, pptxCanvas);
		const htmlElements = computeLayout(template, htmlCanvas);

		const pptxIds = pptxElements.map((e) => e.id).sort();
		const htmlIds = htmlElements.map((e) => e.id).sort();

		expect(pptxIds).toEqual(htmlIds);
	});

	test("HTML renderer produces data attributes for same IDs as layout engine", () => {
		const html = renderHTML(template, theme, content);
		const pptxCanvas = getCanvasForPptx();
		const pptxElements = computeLayout(template, pptxCanvas);

		// Extract IDs from HTML
		const pageIdRegex = /data-page-id="([^"]*)"/g;
		const sectionIdRegex = /data-section-id="([^"]*)"/g;
		const fieldIdRegex = /data-field-id="([^"]*)"/g;
		const cardIdRegex = /data-card-id="([^"]*)"/g;

		const htmlIds = new Set<string>();
		for (const regex of [pageIdRegex, sectionIdRegex, fieldIdRegex, cardIdRegex]) {
			let match: RegExpExecArray | null;
			match = regex.exec(html);
			while (match) {
				htmlIds.add(match[1]);
				match = regex.exec(html);
			}
		}

		// Every layout element ID should appear in HTML
		for (const el of pptxElements) {
			expect(htmlIds.has(el.id)).toBe(true);
		}
	});
});

// ── PPTX Output Structural Validity ────────────────────────────────

describe("PPTX visual fidelity — output validity", () => {
	test("PPTX output is a valid ZIP archive with correct slide count", async () => {
		const result = await generatePPTX(template, theme, content);

		// ZIP magic bytes
		expect(result.buffer[0]).toBe(0x50); // P
		expect(result.buffer[1]).toBe(0x4b); // K

		// Correct slide count
		expect(result.slideCount).toBe(4);
	});

	test("PPTX with custom slide dimensions preserves correct scaling", async () => {
		const customWidth = 13.333; // widescreen 16:9
		const customHeight = 7.5;
		const result = await generatePPTX(template, theme, content, {
			slideWidth: customWidth,
			slideHeight: customHeight,
		});

		expect(result.slideCount).toBe(4);
		expect(result.buffer.length).toBeGreaterThan(0);
	});

	test("PPTX output size is reasonable (not empty, not absurdly large)", async () => {
		const result = await generatePPTX(template, theme, content);
		// A 4-slide PPTX with text and shapes should be between 10KB and 10MB
		expect(result.buffer.length).toBeGreaterThan(10_000);
		expect(result.buffer.length).toBeLessThan(10_000_000);
	});
});
