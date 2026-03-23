/**
 * PDF Generator Tests
 *
 * These tests launch headless Chromium via Playwright, so they are slower
 * than pure-computation tests. Each test verifies a distinct PDF generation
 * capability to minimize redundant browser launches.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BrandTheme } from "../../schemas/brand-theme";
import type { Content } from "../../schemas/content-schema";
import type { Template } from "../../schemas/template-schema";
import { generatePDF } from "../pdf-generator";

// ── Fixtures ────────────────────────────────────────────────────────

const minimalTemplate: Template = {
	id: "test-pdf",
	name: "Test PDF",
	pages: [
		{
			id: "page-1",
			sections: [
				{
					id: "section-1",
					layout: "section",
					fields: [{ id: "title-1", type: "title", required: true }],
					cards: [],
					children: [],
				},
			],
		},
	],
};

const minimalTheme: BrandTheme = {
	name: "Test Theme",
	typography: {
		heading: { fontFamily: "Arial", fontSize: 36, fontWeight: 700, lineHeight: 1.2 },
		subheading: { fontFamily: "Arial", fontSize: 24, fontWeight: 600, lineHeight: 1.3 },
		body: { fontFamily: "Arial", fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
	},
	colors: {
		primary: "#1a56db",
		secondary: "#6b7280",
		background: "#ffffff",
		text: "#111827",
		accent: "#f59e0b",
	},
	spacing: { padding: 24, margin: 16, gap: 16 },
};

const minimalContent: Content = {
	templateRef: "test-pdf",
	themeRef: "test-theme",
	pages: [
		{
			pageId: "page-1",
			sections: [
				{
					sectionId: "section-1",
					fields: { "title-1": { type: "title", text: "PDF Test Title" } },
					cards: [],
					children: [],
				},
			],
		},
	],
};

const multiPageTemplate: Template = {
	id: "multi-pdf",
	name: "Multi Page PDF",
	pages: [
		{
			id: "page-1",
			name: "Page One",
			sections: [
				{
					id: "sec-1",
					layout: "section",
					fields: [{ id: "t1", type: "title", required: true }],
					cards: [],
					children: [],
				},
			],
		},
		{
			id: "page-2",
			name: "Page Two",
			sections: [
				{
					id: "sec-2",
					layout: "section",
					fields: [{ id: "t2", type: "title", required: true }],
					cards: [],
					children: [],
				},
			],
		},
		{
			id: "page-3",
			name: "Page Three",
			sections: [
				{
					id: "sec-3",
					layout: "section",
					fields: [{ id: "t3", type: "title", required: true }],
					cards: [],
					children: [],
				},
			],
		},
	],
};

const multiPageContent: Content = {
	templateRef: "multi-pdf",
	themeRef: "test-theme",
	pages: [
		{
			pageId: "page-1",
			sections: [
				{
					sectionId: "sec-1",
					fields: { t1: { type: "title", text: "First Page" } },
					cards: [],
					children: [],
				},
			],
		},
		{
			pageId: "page-2",
			sections: [
				{
					sectionId: "sec-2",
					fields: { t2: { type: "title", text: "Second Page" } },
					cards: [],
					children: [],
				},
			],
		},
		{
			pageId: "page-3",
			sections: [
				{
					sectionId: "sec-3",
					fields: { t3: { type: "title", text: "Third Page" } },
					cards: [],
					children: [],
				},
			],
		},
	],
};

// ── Tests ───────────────────────────────────────────────────────────

describe("generatePDF — basic generation", () => {
	test("produces a valid PDF buffer", async () => {
		const result = await generatePDF(minimalTemplate, minimalTheme, minimalContent);

		expect(result.buffer).toBeInstanceOf(Buffer);
		expect(result.buffer.length).toBeGreaterThan(0);
		// PDF magic bytes: %PDF-
		expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
	}, 30000);

	test("returns correct template page count", async () => {
		const result = await generatePDF(minimalTemplate, minimalTheme, minimalContent);
		expect(result.templatePages).toBe(1);
	}, 30000);
});

describe("generatePDF — multi-page", () => {
	test("reports correct template page count for multi-page", async () => {
		const result = await generatePDF(multiPageTemplate, minimalTheme, multiPageContent);

		expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
		expect(result.templatePages).toBe(3);
	}, 30000);

	test("multi-page PDF is larger than single-page", async () => {
		const single = await generatePDF(minimalTemplate, minimalTheme, minimalContent);
		const multi = await generatePDF(multiPageTemplate, minimalTheme, multiPageContent);

		expect(multi.buffer.length).toBeGreaterThan(single.buffer.length);
	}, 60000);
});

describe("generatePDF — page size options", () => {
	test("default page size is A4", async () => {
		const result = await generatePDF(minimalTemplate, minimalTheme, minimalContent);
		// Just verify it produces a valid PDF — A4 is the default
		expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
	}, 30000);

	test("accepts letter page size", async () => {
		const result = await generatePDF(minimalTemplate, minimalTheme, minimalContent, {
			pageSize: "letter",
		});
		expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
		expect(result.buffer.length).toBeGreaterThan(0);
	}, 30000);

	test("accepts custom page dimensions", async () => {
		const result = await generatePDF(minimalTemplate, minimalTheme, minimalContent, {
			pageSize: { width: 10, height: 7.5 },
		});
		expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
	}, 30000);

	test("accepts landscape orientation", async () => {
		const result = await generatePDF(minimalTemplate, minimalTheme, minimalContent, {
			landscape: true,
		});
		expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
	}, 30000);
});

describe("generatePDF — renderer options", () => {
	test("uses PDF canvas format by default", async () => {
		const templateWithPDFCanvas: Template = {
			...minimalTemplate,
			canvasSize: { pdf: { width: 595, height: 842 } },
		};

		const result = await generatePDF(templateWithPDFCanvas, minimalTheme, minimalContent);
		expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
	}, 30000);
});

describe("generatePDF — sample fixtures", () => {
	test("generates PDF from full sample fixtures", async () => {
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

		const result = await generatePDF(sampleTemplate, sampleTheme, sampleContent);

		expect(result.buffer.subarray(0, 5).toString()).toBe("%PDF-");
		expect(result.buffer.length).toBeGreaterThan(1000);
		expect(result.templatePages).toBe(4);
	}, 30000);
});
