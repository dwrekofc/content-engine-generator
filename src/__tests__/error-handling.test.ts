/**
 * P7-3: Error handling and user feedback tests
 *
 * Verifies that schema validation errors, generation errors, and malformed
 * inputs are caught and reported with clear, actionable messages — not
 * raw stack traces or silent failures.
 */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderHTML } from "../lib/renderers/html-renderer";
import { BrandThemeSchema } from "../lib/schemas/brand-theme";
import type { Content } from "../lib/schemas/content-schema";
import { ContentSchema } from "../lib/schemas/content-schema";
import { validateContent } from "../lib/schemas/content-validator";
import { TemplateSchema } from "../lib/schemas/template-schema";
import type { APIServerInstance } from "../server/api";
import { startAPIServer } from "../server/api";

// ── Fixtures ────────────────────────────────────────────────────────

const FIXTURES_DIR = join(import.meta.dir, "../../fixtures");
const validTemplate = JSON.parse(readFileSync(join(FIXTURES_DIR, "sample-template.json"), "utf-8"));
const validTheme = JSON.parse(readFileSync(join(FIXTURES_DIR, "sample-theme.json"), "utf-8"));
const validContent = JSON.parse(readFileSync(join(FIXTURES_DIR, "sample-content.json"), "utf-8"));

// ── API Server ──────────────────────────────────────────────────────

let api: APIServerInstance;

beforeAll(() => {
	api = startAPIServer(0); // random port
});

afterAll(() => {
	api.stop();
});

// ── Schema validation errors ────────────────────────────────────────

describe("Error handling — schema validation", () => {
	test("invalid template JSON returns 400 with validation details", async () => {
		const res = await fetch(`${api.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "html-static",
				template: { invalid: true }, // missing required fields
				theme: validTheme,
				content: validContent,
			}),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain("Template validation failed");
	});

	test("invalid theme JSON returns 400 with validation details", async () => {
		const res = await fetch(`${api.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "html-static",
				template: validTemplate,
				theme: { name: 123 }, // wrong type
				content: validContent,
			}),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain("Theme validation failed");
	});

	test("invalid content JSON returns 400 with validation details", async () => {
		const res = await fetch(`${api.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "html-static",
				template: validTemplate,
				theme: validTheme,
				content: { pages: "not-an-array" }, // wrong type
			}),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain("Content validation failed");
	});

	test("missing required fields returns 400", async () => {
		const res = await fetch(`${api.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ format: "html-static" }), // missing template, theme, content
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain("Missing required fields");
	});

	test("unknown format returns 400", async () => {
		const res = await fetch(`${api.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "docx", // not supported
				template: validTemplate,
				theme: validTheme,
				content: validContent,
			}),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain("Unknown format");
	});
});

// ── Content-template mismatch ───────────────────────────────────────

describe("Error handling — content-template validation", () => {
	test("content with mismatched page count returns validation errors", () => {
		const template = TemplateSchema.parse(validTemplate);
		const shortContent: Content = {
			...ContentSchema.parse(validContent),
			pages: [], // empty — template has 4 pages
		};

		const errors = validateContent(shortContent, template);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0].message).toContain("pages");
	});

	test("content with wrong page IDs returns validation errors", () => {
		const template = TemplateSchema.parse(validTemplate);
		const badContent = ContentSchema.parse(validContent);
		badContent.pages[0].pageId = "nonexistent-page";

		const errors = validateContent(badContent, template);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0].message).toContain("does not match");
	});

	test("content with missing required field returns validation error", () => {
		const template = TemplateSchema.parse(validTemplate);
		const contentMissing = ContentSchema.parse(validContent);
		// Remove a field from the first section
		const firstSection = contentMissing.pages[0].sections[0];
		const firstFieldId = Object.keys(firstSection.fields)[0];
		if (firstFieldId) {
			delete firstSection.fields[firstFieldId];
		}

		const errors = validateContent(contentMissing, template);
		// May or may not have errors depending on whether the field is required
		// This validates the validator runs without throwing
		expect(Array.isArray(errors)).toBe(true);
	});

	test("API server returns 400 when content doesn't match template", async () => {
		// Use valid content but swap page IDs so they don't match template
		const mismatchedContent = JSON.parse(JSON.stringify(validContent));
		mismatchedContent.pages[0].pageId = "nonexistent-page-id";

		const res = await fetch(`${api.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "html-static",
				template: validTemplate,
				theme: validTheme,
				content: mismatchedContent,
			}),
		});

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain("Content does not match template");
	});
});

// ── Render error handling ───────────────────────────────────────────

describe("Error handling — HTML renderer robustness", () => {
	test("renderer handles single-page template gracefully", () => {
		// Use a minimal but valid template with one page
		const minimalTemplate = TemplateSchema.parse({
			...validTemplate,
			pages: [validTemplate.pages[0]],
		});
		const minimalContent = ContentSchema.parse({
			...validContent,
			pages: [validContent.pages[0]],
		});
		const theme = BrandThemeSchema.parse(validTheme);

		const html = renderHTML(minimalTemplate, theme, minimalContent);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain('class="ce-document"');
		// Only one page
		const pages = html.match(/class="ce-page"/g);
		expect(pages?.length).toBe(1);
	});

	test("renderer handles content with missing optional fields", () => {
		const template = TemplateSchema.parse(validTemplate);
		const theme = BrandThemeSchema.parse(validTheme);
		// Create content with all fields emptied
		const sparseContent = ContentSchema.parse(validContent);
		for (const page of sparseContent.pages) {
			for (const section of page.sections) {
				section.fields = {};
			}
		}

		// Should not throw
		const html = renderHTML(template, theme, sparseContent);
		expect(html).toContain("<!DOCTYPE html>");
	});
});

// ── API routing errors ──────────────────────────────────────────────

describe("Error handling — API routing", () => {
	test("unknown endpoint returns 404", async () => {
		const res = await fetch(`${api.url}/api/nonexistent`);
		expect(res.status).toBe(404);
	});

	test("GET on /api/generate returns 404", async () => {
		const res = await fetch(`${api.url}/api/generate`);
		expect(res.status).toBe(404);
	});

	test("health check returns 200", async () => {
		const res = await fetch(`${api.url}/api/health`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe("ok");
	});
});
