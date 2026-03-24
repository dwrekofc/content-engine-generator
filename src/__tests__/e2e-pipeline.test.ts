/**
 * P7-1: End-to-end pipeline test
 *
 * Loads sample fixtures → validates schemas → renders HTML → computes layout →
 * generates PPTX, PDF, HTML static → verifies all outputs are valid.
 *
 * This is the integration test that proves the entire pipeline works end-to-end
 * with real data. Each format generator has unit tests; this test proves they
 * all compose correctly from shared inputs.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { generateHTMLStatic } from "../lib/generators/html-static-generator";
import { generatePDF } from "../lib/generators/pdf-generator";
import { generatePPTX } from "../lib/generators/pptx-generator";
import { computeLayout } from "../lib/layout-engine/core";
import type { CanvasSize } from "../lib/layout-engine/types";
import { renderHTML } from "../lib/renderers/html-renderer";
import { type BrandTheme, BrandThemeSchema } from "../lib/schemas/brand-theme";
import { type Content, ContentSchema } from "../lib/schemas/content-schema";
import { validateContent } from "../lib/schemas/content-validator";
import { type Template, TemplateSchema } from "../lib/schemas/template-schema";
import { sectionOverrideToCSS, themeToCSS } from "../lib/themes/theme-to-css";

// ── Fixture loading ─────────────────────────────────────────────────

const FIXTURES_DIR = join(import.meta.dir, "../../fixtures");

let template: Template;
let theme: BrandTheme;
let content: Content;
let tmpDir: string;

beforeAll(async () => {
	const templateRaw = JSON.parse(readFileSync(join(FIXTURES_DIR, "sample-template.json"), "utf-8"));
	const themeRaw = JSON.parse(readFileSync(join(FIXTURES_DIR, "sample-theme.json"), "utf-8"));
	const contentRaw = JSON.parse(readFileSync(join(FIXTURES_DIR, "sample-content.json"), "utf-8"));

	template = TemplateSchema.parse(templateRaw);
	theme = BrandThemeSchema.parse(themeRaw);
	content = ContentSchema.parse(contentRaw);

	tmpDir = await mkdtemp(join(tmpdir(), "ce-e2e-"));
});

afterAll(async () => {
	if (tmpDir && existsSync(tmpDir)) {
		await rm(tmpDir, { recursive: true, force: true });
	}
});

// ── 1. Schema Validation ────────────────────────────────────────────

describe("E2E Pipeline — Schema Validation", () => {
	test("sample template passes Zod schema validation", () => {
		expect(template).toBeDefined();
		expect(template.id).toBe("sample-deck");
		expect(template.pages.length).toBe(4);
	});

	test("sample theme passes Zod schema validation", () => {
		expect(theme).toBeDefined();
		expect(theme.name).toBe("Corporate Blue");
		expect(theme.typography.heading.fontFamily).toContain("Inter");
	});

	test("sample content passes Zod schema validation", () => {
		expect(content).toBeDefined();
		expect(content.templateRef).toBe("sample-deck");
		expect(content.pages.length).toBe(4);
	});

	test("content validates against template with zero errors", () => {
		const errors = validateContent(content, template);
		expect(errors).toEqual([]);
	});
});

// ── 2. Theme-to-CSS ─────────────────────────────────────────────────

describe("E2E Pipeline — Theme Processing", () => {
	test("theme converts to CSS custom properties", () => {
		const cssVars = themeToCSS(theme);
		expect(cssVars["--font-heading-family"]).toContain("Inter");
		expect(cssVars["--color-primary"]).toBe("#1a56db");
		expect(cssVars["--spacing-padding"]).toBe("24px");
	});

	test("section overrides produce CSS custom properties", () => {
		const heroOverride = theme.sectionOverrides?.hero;
		expect(heroOverride).toBeDefined();
		if (!heroOverride) throw new Error("hero override missing");
		const overrideVars = sectionOverrideToCSS(heroOverride);
		expect(Object.keys(overrideVars).length).toBeGreaterThan(0);
	});
});

// ── 3. Layout Engine ────────────────────────────────────────────────

describe("E2E Pipeline — Layout Engine", () => {
	test("computes layout for PPTX canvas", () => {
		const pptxCanvas: CanvasSize = template.canvasSize?.pptx ?? { width: 960, height: 720 };
		const elements = computeLayout(template, pptxCanvas);

		// Should produce elements for pages, sections, fields, cards, card-fields
		expect(elements.length).toBeGreaterThan(0);

		// Should have 4 page elements
		const pages = elements.filter((e) => e.type === "page");
		expect(pages.length).toBe(4);

		// Every element has valid bounds
		for (const el of elements) {
			expect(el.width).toBeGreaterThanOrEqual(0);
			expect(el.height).toBeGreaterThanOrEqual(0);
			expect(typeof el.x).toBe("number");
			expect(typeof el.y).toBe("number");
		}
	});

	test("computes layout for HTML canvas", () => {
		const htmlCanvas: CanvasSize = template.canvasSize?.html ?? { width: 1280, height: 720 };
		const elements = computeLayout(template, htmlCanvas);
		const pages = elements.filter((e) => e.type === "page");
		expect(pages.length).toBe(4);
	});

	test("computes layout for PDF canvas", () => {
		const pdfCanvas: CanvasSize = template.canvasSize?.pdf ?? { width: 595.28, height: 841.89 };
		const elements = computeLayout(template, pdfCanvas);
		const pages = elements.filter((e) => e.type === "page");
		expect(pages.length).toBe(4);
	});

	test("all template field IDs appear in layout output", () => {
		const canvas: CanvasSize = template.canvasSize?.pptx ?? { width: 960, height: 720 };
		const elements = computeLayout(template, canvas);
		const elementIds = new Set(elements.map((e) => e.id));

		// Collect all field IDs from template
		const fieldIds: string[] = [];
		function collectFieldIds(sections: Template["pages"][number]["sections"]) {
			for (const section of sections) {
				for (const field of section.fields) {
					fieldIds.push(field.id);
				}
				for (const card of section.cards) {
					for (const field of card.fields) {
						fieldIds.push(field.id);
					}
				}
				collectFieldIds(section.children);
			}
		}
		for (const page of template.pages) {
			collectFieldIds(page.sections);
		}

		for (const fid of fieldIds) {
			expect(elementIds.has(fid)).toBe(true);
		}
	});
});

// ── 4. HTML Renderer ────────────────────────────────────────────────

describe("E2E Pipeline — HTML Renderer", () => {
	let htmlOutput: string;

	test("renders complete HTML document", () => {
		htmlOutput = renderHTML(template, theme, content);
		expect(htmlOutput).toContain("<!DOCTYPE html>");
		expect(htmlOutput).toContain("</html>");
	});

	test("HTML contains all page elements", () => {
		const pageMatches = htmlOutput.match(/class="ce-page"/g);
		expect(pageMatches?.length).toBe(4);
	});

	test("HTML contains theme CSS variables", () => {
		expect(htmlOutput).toContain("--font-heading-family");
		expect(htmlOutput).toContain("--color-primary");
	});

	test("HTML contains content text", () => {
		expect(htmlOutput).toContain("Transform Your Business");
		expect(htmlOutput).toContain("Why Choose Us");
		expect(htmlOutput).toContain("Lightning Fast");
		expect(htmlOutput).toContain("Start Free Trial");
	});

	test("HTML contains section overrides", () => {
		// Hero section should have override styles applied
		expect(htmlOutput).toContain('data-section-name="hero"');
	});

	test("HTML renders all 7 field types", () => {
		// title → h1
		expect(htmlOutput).toContain("ce-field--title");
		// subtitle → h2
		expect(htmlOutput).toContain("ce-field--subtitle");
		// paragraph → p
		expect(htmlOutput).toContain("ce-field--paragraph");
		// button → a
		expect(htmlOutput).toContain("ce-field--button");
		// featured-content → img
		expect(htmlOutput).toContain("ce-field--featured-content");
		// featured-content-caption → figcaption
		expect(htmlOutput).toContain("ce-field--featured-content-caption");
		// background → div with bg style
		expect(htmlOutput).toContain("ce-field--background");
	});

	test("HTML renders all layout primitives", () => {
		expect(htmlOutput).toContain("ce-section--stack"); // page 1 hero
		expect(htmlOutput).toContain("ce-section--block"); // page 2 header
		expect(htmlOutput).toContain("ce-section--grid"); // page 2 features
		expect(htmlOutput).toContain("ce-section--flex"); // page 3
		expect(htmlOutput).toContain("ce-section--free-position"); // page 4
	});
});

// ── 5. PPTX Generator ──────────────────────────────────────────────

describe("E2E Pipeline — PPTX Generator", () => {
	let pptxResult: { buffer: Uint8Array; slideCount: number };

	test("generates valid PPTX buffer", async () => {
		pptxResult = await generatePPTX(template, theme, content);
		expect(pptxResult.buffer).toBeInstanceOf(Uint8Array);
		expect(pptxResult.buffer.length).toBeGreaterThan(0);
	});

	test("PPTX has correct slide count", () => {
		expect(pptxResult.slideCount).toBe(4);
	});

	test("PPTX buffer has valid ZIP magic bytes (PK header)", () => {
		// PPTX is a ZIP archive — first two bytes should be PK (0x50, 0x4B)
		expect(pptxResult.buffer[0]).toBe(0x50);
		expect(pptxResult.buffer[1]).toBe(0x4b);
	});

	test("PPTX file can be written to disk", async () => {
		const pptxPath = join(tmpDir, "output.pptx");
		await Bun.write(pptxPath, pptxResult.buffer);
		expect(existsSync(pptxPath)).toBe(true);
		const stat = Bun.file(pptxPath);
		expect(stat.size).toBeGreaterThan(0);
	});
});

// ── 6. PDF Generator ───────────────────────────────────────────────

describe("E2E Pipeline — PDF Generator", () => {
	let pdfResult: { buffer: Buffer; templatePages: number };

	test("generates valid PDF buffer", async () => {
		pdfResult = await generatePDF(template, theme, content);
		expect(pdfResult.buffer).toBeInstanceOf(Buffer);
		expect(pdfResult.buffer.length).toBeGreaterThan(0);
	}, 30_000); // PDF gen via Playwright can be slow

	test("PDF has correct template page count", () => {
		expect(pdfResult.templatePages).toBe(4);
	});

	test("PDF buffer has valid PDF magic bytes (%PDF)", () => {
		const header = pdfResult.buffer.subarray(0, 5).toString("ascii");
		expect(header).toBe("%PDF-");
	});

	test("PDF file can be written to disk", async () => {
		const pdfPath = join(tmpDir, "output.pdf");
		await Bun.write(pdfPath, pdfResult.buffer);
		expect(existsSync(pdfPath)).toBe(true);
		const stat = Bun.file(pdfPath);
		expect(stat.size).toBeGreaterThan(0);
	});
});

// ── 7. HTML Static Site Generator ──────────────────────────────────

describe("E2E Pipeline — HTML Static Site Generator", () => {
	let staticResult: { outputDir: string; files: string[] };

	test("generates static HTML site", async () => {
		const outputDir = join(tmpDir, "static-site");
		staticResult = await generateHTMLStatic(template, theme, content, { outputDir });
		expect(staticResult.files.length).toBeGreaterThan(0);
	});

	test("multi-page template produces separate HTML files", () => {
		// 4-page template should produce index.html + 3 additional pages
		const htmlFiles = staticResult.files.filter((f) => f.endsWith(".html"));
		expect(htmlFiles.length).toBe(4);
		expect(htmlFiles).toContain("index.html");
	});

	test("each generated HTML file is valid and self-contained", async () => {
		for (const file of staticResult.files.filter((f) => f.endsWith(".html"))) {
			const content = await readFile(join(staticResult.outputDir, file), "utf-8");
			expect(content).toContain("<!DOCTYPE html>");
			expect(content).toContain("</html>");
			// No external stylesheet links
			expect(content).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="http/);
		}
	});

	test("static site has inter-page navigation", async () => {
		const indexHtml = await readFile(join(staticResult.outputDir, "index.html"), "utf-8");
		expect(indexHtml).toContain("ce-nav");
	});
});

// ── 8. Cross-format Consistency ─────────────────────────────────────

describe("E2E Pipeline — Cross-format Consistency", () => {
	test("layout engine produces elements for all three canvas formats", () => {
		const formats = ["pptx", "pdf", "html"] as const;
		for (const format of formats) {
			const canvas: CanvasSize = template.canvasSize?.[format] ?? { width: 1280, height: 720 };
			const elements = computeLayout(template, canvas);
			expect(elements.length).toBeGreaterThan(0);

			// Same number of elements regardless of canvas size
			const pptxElements = computeLayout(
				template,
				template.canvasSize?.pptx ?? { width: 960, height: 720 },
			);
			expect(elements.length).toBe(pptxElements.length);
		}
	});

	test("all generators accept the same fixture inputs without error", async () => {
		// This test verifies the contract: all generators share the same
		// Template + BrandTheme + Content input shape

		// HTML — synchronous, always succeeds if schema is valid
		const html = renderHTML(template, theme, content);
		expect(html.length).toBeGreaterThan(0);

		// PPTX — async, uses layout engine
		const pptx = await generatePPTX(template, theme, content);
		expect(pptx.slideCount).toBe(template.pages.length);

		// HTML Static — async, file-based
		const outputDir = join(tmpDir, "cross-format-test");
		const staticSite = await generateHTMLStatic(template, theme, content, { outputDir });
		expect(staticSite.files.length).toBeGreaterThan(0);
	});

	test("HTML output for PDF format uses PDF canvas dimensions", () => {
		const htmlForPdf = renderHTML(template, theme, content, { format: "pdf" });
		// PDF canvas is 595.28 wide — check the document width is set
		expect(htmlForPdf).toContain("595.28px");
	});
});
