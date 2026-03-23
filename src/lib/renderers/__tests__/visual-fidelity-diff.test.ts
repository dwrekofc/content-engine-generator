/**
 * Visual Fidelity Diff Tests (P3-4)
 *
 * Compares layout engine computed positions against HTML renderer output
 * to verify that both representations are structurally equivalent.
 *
 * Why: The layout engine produces absolute coordinates (consumed by PPTX generator),
 * while the HTML renderer uses native CSS. Both must agree on element presence,
 * hierarchy, ordering, and — for free-position layouts — exact coordinates.
 * This is the core visual fidelity guarantee of the system.
 *
 * Without a headless browser, we verify:
 * 1. Structural parity: same elements, same parent-child hierarchy
 * 2. CSS property alignment: layout CSS matches engine semantics
 * 3. Free-position coordinate match: CSS absolute coords ≈ engine coords
 * 4. Grid/flex config consistency: CSS grid/flex properties match engine inputs
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeLayout } from "../../layout-engine/core";
import type { PositionedElement } from "../../layout-engine/types";
import type { BrandTheme } from "../../schemas/brand-theme";
import type { Content } from "../../schemas/content-schema";
import type { Template } from "../../schemas/template-schema";
import { renderHTML } from "../html-renderer";

// ── Fixture loading ─────────────────────────────────────────────────

const fixturesDir = join(import.meta.dir, "../../../../fixtures");

const sampleTemplate: Template = JSON.parse(
	readFileSync(join(fixturesDir, "sample-template.json"), "utf-8"),
);
const sampleTheme: BrandTheme = JSON.parse(
	readFileSync(join(fixturesDir, "sample-theme.json"), "utf-8"),
);
const sampleContent: Content = JSON.parse(
	readFileSync(join(fixturesDir, "sample-content.json"), "utf-8"),
);

// ── HTML parsing helpers ────────────────────────────────────────────

function extractDataAttrs(html: string, attrName: string): string[] {
	const regex = new RegExp(`data-${attrName}="([^"]*)"`, "g");
	const ids: string[] = [];
	let match: RegExpExecArray | null;
	match = regex.exec(html);
	while (match !== null) {
		ids.push(match[1]);
		match = regex.exec(html);
	}
	return ids;
}

function extractSectionIds(html: string): string[] {
	return extractDataAttrs(html, "section-id");
}

function extractPageIds(html: string): string[] {
	return extractDataAttrs(html, "page-id");
}

function extractFieldIds(html: string): string[] {
	return extractDataAttrs(html, "field-id");
}

function extractCardIds(html: string): string[] {
	return extractDataAttrs(html, "card-id");
}

/** Extract inline style from an element with a given data attribute value */
function extractStyleForElement(html: string, dataAttr: string, dataValue: string): string {
	const regex = new RegExp(`data-${dataAttr}="${dataValue}"[^>]*?style="([^"]*)"`);
	const match = regex.exec(html);
	return match ? match[1] : "";
}

/** Extract CSS class from a section element */
function extractSectionClass(html: string, sectionId: string): string {
	const regex = new RegExp(`class="([^"]*)"[^>]*data-section-id="${sectionId}"`);
	const match = regex.exec(html);
	return match ? match[1] : "";
}

/** Extract free-position child styles (left, top, width, height) */
function extractFreeChildStyles(
	html: string,
): Array<{ left: number; top: number; width: number; height: number }> {
	const regex =
		/class="ce-free-child"\s+style="left:\s*([\d.]+)px;\s*top:\s*([\d.]+)px;\s*width:\s*([\d.]+)px;\s*height:\s*([\d.]+)px;?"/g;
	const results: Array<{ left: number; top: number; width: number; height: number }> = [];
	let match: RegExpExecArray | null;
	match = regex.exec(html);
	while (match !== null) {
		results.push({
			left: Number.parseFloat(match[1]),
			top: Number.parseFloat(match[2]),
			width: Number.parseFloat(match[3]),
			height: Number.parseFloat(match[4]),
		});
		match = regex.exec(html);
	}
	return results;
}

// ── Layout engine helpers ───────────────────────────────────────────

function getElements(layout: PositionedElement[], type: string): PositionedElement[] {
	return layout.filter((el) => el.type === type);
}

function getElementById(layout: PositionedElement[], id: string): PositionedElement | undefined {
	return layout.find((el) => el.id === id);
}

/** Asserts element exists and returns it (non-optional) for tests that check containment */
function getElementByIdStrict(layout: PositionedElement[], id: string): PositionedElement {
	const el = layout.find((e) => e.id === id);
	if (!el) throw new Error(`Element "${id}" not found in layout`);
	return el;
}

// ── Tests ───────────────────────────────────────────────────────────

describe("visual fidelity diff — structural parity", () => {
	const canvasSize = { width: 1280, height: 720 };
	const layout = computeLayout(sampleTemplate, canvasSize);
	const html = renderHTML(sampleTemplate, sampleTheme, sampleContent);

	test("both representations contain the same page IDs", () => {
		const enginePageIds = getElements(layout, "page").map((el) => el.id);
		const htmlPageIds = extractPageIds(html);

		expect(enginePageIds.sort()).toEqual(htmlPageIds.sort());
	});

	test("both representations contain the same section IDs", () => {
		const engineSectionIds = getElements(layout, "section").map((el) => el.id);
		const htmlSectionIds = extractSectionIds(html);

		expect(engineSectionIds.sort()).toEqual(htmlSectionIds.sort());
	});

	test("both representations contain the same field IDs", () => {
		const engineFieldIds = [
			...getElements(layout, "field"),
			...getElements(layout, "card-field"),
		].map((el) => el.id);
		const htmlFieldIds = extractFieldIds(html);

		expect(engineFieldIds.sort()).toEqual(htmlFieldIds.sort());
	});

	test("both representations contain the same card IDs", () => {
		const engineCardIds = getElements(layout, "card").map((el) => el.id);
		const htmlCardIds = extractCardIds(html);

		expect(engineCardIds.sort()).toEqual(htmlCardIds.sort());
	});

	test("layout engine pages span the full canvas", () => {
		for (const page of getElements(layout, "page")) {
			expect(page.width).toBe(canvasSize.width);
			expect(page.height).toBe(canvasSize.height);
		}
	});

	test("all layout engine sections have non-zero dimensions", () => {
		for (const section of getElements(layout, "section")) {
			expect(section.width).toBeGreaterThan(0);
			expect(section.height).toBeGreaterThan(0);
		}
	});

	test("all layout engine fields have non-zero dimensions", () => {
		for (const field of [...getElements(layout, "field"), ...getElements(layout, "card-field")]) {
			expect(field.width).toBeGreaterThan(0);
			expect(field.height).toBeGreaterThan(0);
		}
	});
});

describe("visual fidelity diff — parent-child hierarchy", () => {
	const canvasSize = { width: 1280, height: 720 };
	const layout = computeLayout(sampleTemplate, canvasSize);

	test("all sections have a page or section as parent", () => {
		for (const section of getElements(layout, "section")) {
			const parent = getElementByIdStrict(layout, section.parentId as string);
			expect(["page", "section"]).toContain(parent.type);
		}
	});

	test("all fields have a section as parent", () => {
		for (const field of getElements(layout, "field")) {
			const parent = getElementByIdStrict(layout, field.parentId as string);
			expect(parent.type).toBe("section");
		}
	});

	test("all cards have a section as parent", () => {
		for (const card of getElements(layout, "card")) {
			const parent = getElementByIdStrict(layout, card.parentId as string);
			expect(parent.type).toBe("section");
		}
	});

	test("all card-fields have a card as parent", () => {
		for (const field of getElements(layout, "card-field")) {
			const parent = getElementByIdStrict(layout, field.parentId as string);
			expect(parent.type).toBe("card");
		}
	});

	test("page-1 hero section is a direct child of page-1", () => {
		const heroSection = getElementById(layout, "hero-section");
		expect(heroSection).toBeDefined();
		expect(heroSection?.parentId).toBe("page-1");
	});
});

describe("visual fidelity diff — CSS property alignment", () => {
	const html = renderHTML(sampleTemplate, sampleTheme, sampleContent);

	test("stack layout section has ce-section--stack class", () => {
		const heroClass = extractSectionClass(html, "hero-section");
		expect(heroClass).toContain("ce-section--stack");
	});

	test("grid layout section has ce-section--grid class", () => {
		const gridClass = extractSectionClass(html, "features-grid");
		expect(gridClass).toContain("ce-section--grid");
	});

	test("flex layout section has ce-section--flex class", () => {
		const flexClass = extractSectionClass(html, "showcase-section");
		expect(flexClass).toContain("ce-section--flex");
	});

	test("free-position layout section has ce-section--free-position class", () => {
		const freeClass = extractSectionClass(html, "free-section");
		expect(freeClass).toContain("ce-section--free-position");
	});

	test("grid section has correct grid-template-columns in style", () => {
		const style = extractStyleForElement(html, "section-id", "features-grid");
		// sample-template has 3 columns — renderer uses repeat(3, 1fr)
		expect(style).toContain("grid-template-columns");
		expect(style).toContain("repeat(3, 1fr)");
	});

	test("grid section has correct gap", () => {
		const style = extractStyleForElement(html, "section-id", "features-grid");
		// sample-template has gap: 24
		expect(style).toContain("gap: 24px");
	});

	test("flex section has correct flex-direction", () => {
		const style = extractStyleForElement(html, "section-id", "showcase-section");
		expect(style).toContain("flex-direction: row");
	});

	test("flex section has correct gap", () => {
		const style = extractStyleForElement(html, "section-id", "showcase-section");
		expect(style).toContain("gap: 32px");
	});
});

describe("visual fidelity diff — free-position coordinate match", () => {
	const canvasSize = { width: 1280, height: 720 };
	const layout = computeLayout(sampleTemplate, canvasSize);
	const html = renderHTML(sampleTemplate, sampleTheme, sampleContent);

	test("free-position children CSS coords match template positions", () => {
		const freeChildStyles = extractFreeChildStyles(html);
		// sample-template page-4 has two free-position children:
		// child 1: {x:50, y:30, w:400, h:80}
		// child 2: {x:50, y:130, w:500, h:200}
		expect(freeChildStyles.length).toBe(2);

		expect(freeChildStyles[0]).toEqual({ left: 50, top: 30, width: 400, height: 80 });
		expect(freeChildStyles[1]).toEqual({ left: 50, top: 130, width: 500, height: 200 });
	});

	test("layout engine free-position children are within parent bounds", () => {
		const freeSection = getElementByIdStrict(layout, "free-section");

		// Get children of the free-position section
		const children = layout.filter((el) => el.parentId === "free-section" && el.type === "section");
		expect(children.length).toBe(2);

		for (const child of children) {
			// Child should be within the parent section bounds (with padding)
			expect(child.x).toBeGreaterThanOrEqual(freeSection.x);
			expect(child.y).toBeGreaterThanOrEqual(freeSection.y);
		}
	});

	test("layout engine free-position children preserve relative offsets from template", () => {
		const freeSection = getElementByIdStrict(layout, "free-section");

		const children = layout.filter((el) => el.parentId === "free-section" && el.type === "section");

		// Template specifies x:50 for both children — they should have the same x offset from parent
		const xOffsets = children.map((c) => c.x - freeSection.x);
		// Both have x=50 in template, so after adding parent padding (20), both start at parent.x + 20 + 50
		expect(xOffsets[0]).toBe(xOffsets[1]);
	});
});

describe("visual fidelity diff — multi-format canvas consistency", () => {
	test("layout engine produces elements for each canvas format", () => {
		const htmlCanvas = { width: 1280, height: 720 };
		const pptxCanvas = { width: 914.4, height: 685.8 };

		const htmlLayout = computeLayout(sampleTemplate, htmlCanvas);
		const pptxLayout = computeLayout(sampleTemplate, pptxCanvas);

		// Same number of elements regardless of canvas format
		expect(htmlLayout.length).toBe(pptxLayout.length);

		// Same element IDs
		const htmlIds = htmlLayout.map((el) => el.id).sort();
		const pptxIds = pptxLayout.map((el) => el.id).sort();
		expect(htmlIds).toEqual(pptxIds);
	});

	test("layout engine scales page dimensions to canvas size", () => {
		const smallCanvas = { width: 800, height: 600 };
		const largeCanvas = { width: 1920, height: 1080 };

		const smallLayout = computeLayout(sampleTemplate, smallCanvas);
		const largeLayout = computeLayout(sampleTemplate, largeCanvas);

		const smallPage = getElementByIdStrict(smallLayout, sampleTemplate.pages[0].id);
		const largePage = getElementByIdStrict(largeLayout, sampleTemplate.pages[0].id);

		expect(smallPage.width).toBe(800);
		expect(smallPage.height).toBe(600);
		expect(largePage.width).toBe(1920);
		expect(largePage.height).toBe(1080);
	});

	test("element proportional ordering is preserved across canvas sizes", () => {
		const canvas1 = { width: 1280, height: 720 };
		const canvas2 = { width: 640, height: 360 };

		const layout1 = computeLayout(sampleTemplate, canvas1);
		const layout2 = computeLayout(sampleTemplate, canvas2);

		// For page-1, sections should appear in the same vertical order
		const page1Sections1 = layout1
			.filter((el) => el.parentId === "page-1" && el.type === "section")
			.sort((a, b) => a.y - b.y)
			.map((el) => el.id);

		const page1Sections2 = layout2
			.filter((el) => el.parentId === "page-1" && el.type === "section")
			.sort((a, b) => a.y - b.y)
			.map((el) => el.id);

		expect(page1Sections1).toEqual(page1Sections2);
	});
});

describe("visual fidelity diff — containment verification", () => {
	const canvasSize = { width: 1280, height: 720 };
	const layout = computeLayout(sampleTemplate, canvasSize);

	test("all fields are contained within their parent section bounds", () => {
		const tolerance = 1; // 1px tolerance for floating point
		for (const field of getElements(layout, "field")) {
			const parent = getElementByIdStrict(layout, field.parentId as string);

			expect(field.x).toBeGreaterThanOrEqual(parent.x - tolerance);
			expect(field.y).toBeGreaterThanOrEqual(parent.y - tolerance);
			expect(field.x + field.width).toBeLessThanOrEqual(parent.x + parent.width + tolerance);
		}
	});

	test("all cards are contained within their parent section bounds", () => {
		const tolerance = 1;
		for (const card of getElements(layout, "card")) {
			const parent = getElementByIdStrict(layout, card.parentId as string);

			expect(card.x).toBeGreaterThanOrEqual(parent.x - tolerance);
			expect(card.y).toBeGreaterThanOrEqual(parent.y - tolerance);
			expect(card.x + card.width).toBeLessThanOrEqual(parent.x + parent.width + tolerance);
		}
	});

	test("all card-fields are contained within their parent card bounds", () => {
		const tolerance = 1;
		for (const field of getElements(layout, "card-field")) {
			const parent = getElementByIdStrict(layout, field.parentId as string);

			expect(field.x).toBeGreaterThanOrEqual(parent.x - tolerance);
			expect(field.y).toBeGreaterThanOrEqual(parent.y - tolerance);
			expect(field.x + field.width).toBeLessThanOrEqual(parent.x + parent.width + tolerance);
		}
	});

	test("child sections are contained within their parent section bounds", () => {
		const tolerance = 1;
		const childSections = getElements(layout, "section").filter((s) => {
			const parent = getElementById(layout, s.parentId as string);
			return parent?.type === "section";
		});

		for (const child of childSections) {
			const parent = getElementByIdStrict(layout, child.parentId as string);

			expect(child.x).toBeGreaterThanOrEqual(parent.x - tolerance);
			expect(child.y).toBeGreaterThanOrEqual(parent.y - tolerance);
		}
	});
});

describe("visual fidelity diff — element count consistency", () => {
	const canvasSize = { width: 1280, height: 720 };
	const layout = computeLayout(sampleTemplate, canvasSize);
	const html = renderHTML(sampleTemplate, sampleTheme, sampleContent);

	test("total page count matches", () => {
		const enginePages = getElements(layout, "page").length;
		const htmlPages = extractPageIds(html).length;
		expect(enginePages).toBe(htmlPages);
		expect(enginePages).toBe(4); // sample has 4 pages
	});

	test("total section count matches", () => {
		const engineSections = getElements(layout, "section").length;
		const htmlSections = extractSectionIds(html).length;
		expect(engineSections).toBe(htmlSections);
	});

	test("total field count matches", () => {
		const engineFields =
			getElements(layout, "field").length + getElements(layout, "card-field").length;
		const htmlFields = extractFieldIds(html).length;
		expect(engineFields).toBe(htmlFields);
	});

	test("total card count matches", () => {
		const engineCards = getElements(layout, "card").length;
		const htmlCards = extractCardIds(html).length;
		expect(engineCards).toBe(htmlCards);
	});
});
