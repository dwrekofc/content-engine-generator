import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Template } from "../../schemas/template-schema";
import { TemplateSchema } from "../../schemas/template-schema";
import {
	computeLayout,
	computeSectionIntrinsicHeight,
	DEFAULT_FIELD_HEIGHT,
	DEFAULT_SECTION_PADDING,
} from "../core";
import type { CanvasSize, PositionedElement } from "../types";

// ── Helpers ────────────────────────────────────────────────────────

const fixtureDir = join(import.meta.dir, "../../../../fixtures");
const sampleTemplate: Template = TemplateSchema.parse(
	JSON.parse(readFileSync(join(fixtureDir, "sample-template.json"), "utf-8")),
);

function findById(elements: PositionedElement[], id: string): PositionedElement {
	const el = elements.find((e) => e.id === id);
	if (!el) throw new Error(`Element "${id}" not found`);
	return el;
}

function findAllByType(elements: PositionedElement[], type: string): PositionedElement[] {
	return elements.filter((e) => e.type === type);
}

function _findByParent(elements: PositionedElement[], parentId: string): PositionedElement[] {
	return elements.filter((e) => e.parentId === parentId);
}

// ── Canvas sizes matching fixture ──────────────────────────────────

const pptxCanvas: CanvasSize = { width: 914.4, height: 685.8 };
const htmlCanvas: CanvasSize = { width: 1280, height: 720 };
const pdfCanvas: CanvasSize = { width: 595.28, height: 841.89 };

// ── Core tests ─────────────────────────────────────────────────────

describe("computeLayout", () => {
	test("returns positioned elements for the sample fixture", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		expect(elements.length).toBeGreaterThan(0);
	});

	test("produces one page element per template page", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const pages = findAllByType(elements, "page");
		expect(pages).toHaveLength(4);
	});

	test("page elements have correct canvas dimensions", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const page1 = findById(elements, "page-1");
		expect(page1.x).toBe(0);
		expect(page1.y).toBe(0);
		expect(page1.width).toBe(1280);
		expect(page1.height).toBe(720);
		expect(page1.type).toBe("page");
		expect(page1.parentId).toBeNull();
	});

	test("sections are children of their page", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const heroSection = findById(elements, "hero-section");
		expect(heroSection.parentId).toBe("page-1");
		expect(heroSection.type).toBe("section");
	});

	test("sections fill page width", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const heroSection = findById(elements, "hero-section");
		expect(heroSection.x).toBe(0);
		expect(heroSection.width).toBe(1280);
	});

	test("multiple sections in a page stack vertically and fill page height", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		// Page 2 has features-header + features-grid
		const header = findById(elements, "features-header");
		const grid = findById(elements, "features-grid");

		expect(header.y).toBe(0);
		expect(grid.y).toBeGreaterThan(0);
		expect(grid.y).toBeCloseTo(header.y + header.height, 5);

		// Together they should fill the page
		expect(header.height + grid.height).toBeCloseTo(720, 5);
	});

	test("fields have type 'field' and are children of their section", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const heroTitle = findById(elements, "hero-title");
		expect(heroTitle.type).toBe("field");
		expect(heroTitle.parentId).toBe("hero-section");
	});

	test("cards have type 'card' and are children of their section", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const card1 = findById(elements, "feature-card-1");
		expect(card1.type).toBe("card");
		expect(card1.parentId).toBe("features-grid");
	});

	test("card fields have type 'card-field' and are children of their card", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const fc1Icon = findById(elements, "fc1-icon");
		expect(fc1Icon.type).toBe("card-field");
		expect(fc1Icon.parentId).toBe("feature-card-1");
	});

	test("every element has positive width and height", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		for (const el of elements) {
			expect(el.width).toBeGreaterThan(0);
			expect(el.height).toBeGreaterThan(0);
		}
	});

	test("all element IDs from the template are present in output", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const ids = new Set(elements.map((e) => e.id));

		// Pages
		expect(ids.has("page-1")).toBe(true);
		expect(ids.has("page-2")).toBe(true);
		expect(ids.has("page-3")).toBe(true);
		expect(ids.has("page-4")).toBe(true);

		// Sections
		expect(ids.has("hero-section")).toBe(true);
		expect(ids.has("features-header")).toBe(true);
		expect(ids.has("features-grid")).toBe(true);
		expect(ids.has("showcase-section")).toBe(true);
		expect(ids.has("free-section")).toBe(true);

		// Some fields
		expect(ids.has("hero-title")).toBe(true);
		expect(ids.has("hero-bg")).toBe(true);
		expect(ids.has("fc1-title")).toBe(true);

		// Child sections
		expect(ids.has("showcase-text-group")).toBe(true);
		expect(ids.has("free-title-box")).toBe(true);
		expect(ids.has("free-body-box")).toBe(true);
	});

	test("deterministic: same inputs produce identical outputs", () => {
		const run1 = computeLayout(sampleTemplate, htmlCanvas);
		const run2 = computeLayout(sampleTemplate, htmlCanvas);
		expect(run1).toEqual(run2);
	});
});

// ── Multi-format canvas tests ──────────────────────────────────────

describe("multi-format canvas", () => {
	test("PPTX canvas produces different dimensions than HTML canvas", () => {
		const htmlElements = computeLayout(sampleTemplate, htmlCanvas);
		const pptxElements = computeLayout(sampleTemplate, pptxCanvas);

		const htmlPage = findById(htmlElements, "page-1");
		const pptxPage = findById(pptxElements, "page-1");

		expect(htmlPage.width).toBe(1280);
		expect(pptxPage.width).toBe(914.4);
		expect(htmlPage.width).not.toBe(pptxPage.width);
	});

	test("PDF canvas uses A4 dimensions", () => {
		const elements = computeLayout(sampleTemplate, pdfCanvas);
		const page = findById(elements, "page-1");
		expect(page.width).toBeCloseTo(595.28, 1);
		expect(page.height).toBeCloseTo(841.89, 1);
	});

	test("sections fill their respective canvas widths", () => {
		const pptx = computeLayout(sampleTemplate, pptxCanvas);
		const pdf = computeLayout(sampleTemplate, pdfCanvas);

		const pptxSection = findById(pptx, "hero-section");
		const pdfSection = findById(pdf, "hero-section");

		expect(pptxSection.width).toBe(914.4);
		expect(pdfSection.width).toBeCloseTo(595.28, 1);
	});
});

// ── Stack layout (Page 1: hero) ────────────────────────────────────

describe("stack layout", () => {
	test("stack items overlap at the same position", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		// hero-section uses stack layout with 3 fields
		const heroBg = findById(elements, "hero-bg");
		const heroTitle = findById(elements, "hero-title");
		const heroSubtitle = findById(elements, "hero-subtitle");

		// All fields share the same position (within the padded section bounds)
		expect(heroBg.x).toBe(heroTitle.x);
		expect(heroBg.y).toBe(heroTitle.y);
		expect(heroTitle.x).toBe(heroSubtitle.x);
		expect(heroTitle.y).toBe(heroSubtitle.y);
	});

	test("stack items fill the section inner bounds", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const section = findById(elements, "hero-section");
		const heroBg = findById(elements, "hero-bg");

		const pad = DEFAULT_SECTION_PADDING;
		expect(heroBg.x).toBe(section.x + pad);
		expect(heroBg.y).toBe(section.y + pad);
		expect(heroBg.width).toBeCloseTo(section.width - pad * 2, 5);
		expect(heroBg.height).toBeCloseTo(section.height - pad * 2, 5);
	});

	test("stack items get z-index based on declaration order", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const heroBg = findById(elements, "hero-bg");
		const heroTitle = findById(elements, "hero-title");
		const heroSubtitle = findById(elements, "hero-subtitle");

		expect(heroBg.zIndex).toBe(0);
		expect(heroTitle.zIndex).toBe(1);
		expect(heroSubtitle.zIndex).toBe(2);
	});
});

// ── Section layout (Page 2: features-header) ───────────────────────

describe("section layout (vertical stack)", () => {
	test("items stack vertically within the section", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const title = findById(elements, "features-title");
		const subtitle = findById(elements, "features-subtitle");

		expect(subtitle.y).toBeGreaterThan(title.y);
	});

	test("items fill the section width (minus padding)", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const section = findById(elements, "features-header");
		const title = findById(elements, "features-title");

		const pad = DEFAULT_SECTION_PADDING;
		expect(title.width).toBeCloseTo(section.width - pad * 2, 5);
	});
});

// ── Grid layout (Page 2: features-grid) ────────────────────────────

describe("grid layout", () => {
	test("cards are positioned in a 3x1 grid", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const card1 = findById(elements, "feature-card-1");
		const card2 = findById(elements, "feature-card-2");
		const card3 = findById(elements, "feature-card-3");

		// All cards on the same row (same y)
		expect(card1.y).toBeCloseTo(card2.y, 5);
		expect(card2.y).toBeCloseTo(card3.y, 5);

		// Cards arranged left to right
		expect(card2.x).toBeGreaterThan(card1.x);
		expect(card3.x).toBeGreaterThan(card2.x);
	});

	test("grid cards have equal widths accounting for gap", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const card1 = findById(elements, "feature-card-1");
		const card2 = findById(elements, "feature-card-2");
		const card3 = findById(elements, "feature-card-3");

		expect(card1.width).toBeCloseTo(card2.width, 5);
		expect(card2.width).toBeCloseTo(card3.width, 5);
	});

	test("card fields are positioned within card bounds", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const card1 = findById(elements, "feature-card-1");
		const icon = findById(elements, "fc1-icon");
		const title = findById(elements, "fc1-title");
		const desc = findById(elements, "fc1-desc");

		// All card fields within the card bounds
		for (const field of [icon, title, desc]) {
			expect(field.x).toBeGreaterThanOrEqual(card1.x);
			expect(field.y).toBeGreaterThanOrEqual(card1.y);
			expect(field.x + field.width).toBeLessThanOrEqual(card1.x + card1.width + 0.01);
			expect(field.y + field.height).toBeLessThanOrEqual(card1.y + card1.height + 0.01);
		}
	});

	test("card fields stack vertically within the card", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const icon = findById(elements, "fc1-icon");
		const title = findById(elements, "fc1-title");
		const desc = findById(elements, "fc1-desc");

		expect(title.y).toBeGreaterThan(icon.y);
		expect(desc.y).toBeGreaterThan(title.y);
	});
});

// ── Flex layout (Page 3: showcase) ─────────────────────────────────

describe("flex layout", () => {
	test("flex row: items arranged horizontally", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		// showcase-section is flex row with 2 fields + 1 child
		const image = findById(elements, "showcase-image");
		const caption = findById(elements, "showcase-caption");
		const textGroup = findById(elements, "showcase-text-group");

		// Left to right ordering
		expect(caption.x).toBeGreaterThan(image.x);
		expect(textGroup.x).toBeGreaterThan(caption.x);
	});

	test("flex row with center alignment: items vertically centered", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const section = findById(elements, "showcase-section");
		const image = findById(elements, "showcase-image");

		// Image should be vertically centered within the section inner bounds
		const pad = DEFAULT_SECTION_PADDING;
		const innerHeight = section.height - pad * 2;
		const expectedY = section.y + pad + (innerHeight - image.height) / 2;
		expect(image.y).toBeCloseTo(expectedY, 5);
	});

	test("flex column: nested child items stack vertically", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		// showcase-text-group is flex column
		const title = findById(elements, "showcase-title");
		const body = findById(elements, "showcase-body");
		const cta = findById(elements, "showcase-cta");

		expect(body.y).toBeGreaterThan(title.y);
		expect(cta.y).toBeGreaterThan(body.y);
	});

	test("nested flex column items are children of the child section", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const title = findById(elements, "showcase-title");
		const body = findById(elements, "showcase-body");

		expect(title.parentId).toBe("showcase-text-group");
		expect(body.parentId).toBe("showcase-text-group");
	});
});

// ── Free-position layout (Page 4) ──────────────────────────────────

describe("free-position layout", () => {
	test("positioned children use absolute coordinates relative to parent", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const section = findById(elements, "free-section");
		const titleBox = findById(elements, "free-title-box");

		const pad = DEFAULT_SECTION_PADDING;
		// Position {x: 50, y: 30} relative to inner bounds
		expect(titleBox.x).toBeCloseTo(section.x + pad + 50, 5);
		expect(titleBox.y).toBeCloseTo(section.y + pad + 30, 5);
		expect(titleBox.width).toBe(400);
		expect(titleBox.height).toBe(80);
	});

	test("positioned children at correct coordinates", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const section = findById(elements, "free-section");
		const bodyBox = findById(elements, "free-body-box");

		const pad = DEFAULT_SECTION_PADDING;
		expect(bodyBox.x).toBeCloseTo(section.x + pad + 50, 5);
		expect(bodyBox.y).toBeCloseTo(section.y + pad + 130, 5);
		expect(bodyBox.width).toBe(500);
		expect(bodyBox.height).toBe(200);
	});

	test("unpositioned fields stack at the top of the container", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const section = findById(elements, "free-section");
		const freeBg = findById(elements, "free-bg");

		const pad = DEFAULT_SECTION_PADDING;
		expect(freeBg.x).toBe(section.x + pad);
		expect(freeBg.y).toBe(section.y + pad);
		expect(freeBg.height).toBe(DEFAULT_FIELD_HEIGHT);
	});

	test("child sections contain their own fields", () => {
		const elements = computeLayout(sampleTemplate, htmlCanvas);
		const freeTitle = findById(elements, "free-title");
		expect(freeTitle.parentId).toBe("free-title-box");
		expect(freeTitle.type).toBe("field");
	});
});

// ── Edge cases ─────────────────────────────────────────────────────

describe("edge cases", () => {
	test("empty template page produces only the page element", () => {
		const template: Template = {
			id: "empty",
			name: "Empty",
			pages: [{ id: "p1", sections: [] }],
		};
		const elements = computeLayout(template, htmlCanvas);
		expect(elements).toHaveLength(1);
		expect(elements[0].type).toBe("page");
	});

	test("section with no items produces only the section element", () => {
		const template: Template = {
			id: "empty-section",
			name: "Empty Section",
			pages: [
				{
					id: "p1",
					sections: [{ id: "s1", layout: "section", fields: [], cards: [], children: [] }],
				},
			],
		};
		const elements = computeLayout(template, htmlCanvas);
		const section = findById(elements, "s1");
		expect(section.type).toBe("section");
		// Only page + section
		expect(elements).toHaveLength(2);
	});

	test("single-field section positions field correctly", () => {
		const template: Template = {
			id: "single",
			name: "Single Field",
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
			],
		};
		const elements = computeLayout(template, htmlCanvas);
		const field = findById(elements, "f1");
		expect(field.type).toBe("field");
		expect(field.parentId).toBe("s1");
		expect(field.height).toBe(DEFAULT_FIELD_HEIGHT);
	});
});

// ── Intrinsic height computation ───────────────────────────────────

describe("computeSectionIntrinsicHeight", () => {
	test("empty section has minimal height (padding only)", () => {
		const section: Section = { id: "s", layout: "section", fields: [], cards: [], children: [] };
		const h = computeSectionIntrinsicHeight(section, 1000);
		expect(h).toBe(DEFAULT_SECTION_PADDING * 2);
	});

	test("section with fields: padding + field heights + gaps", () => {
		const section: Section = {
			id: "s",
			layout: "section",
			fields: [
				{ id: "f1", type: "title", required: true },
				{ id: "f2", type: "subtitle", required: false },
			],
			cards: [],
			children: [],
		};
		const h = computeSectionIntrinsicHeight(section, 1000);
		const expected = DEFAULT_SECTION_PADDING * 2 + 2 * DEFAULT_FIELD_HEIGHT + 1 * 10; // 1 gap
		expect(h).toBe(expected);
	});
});

// Import Section type for inline test templates
import type { Section } from "../../schemas/template-schema";
