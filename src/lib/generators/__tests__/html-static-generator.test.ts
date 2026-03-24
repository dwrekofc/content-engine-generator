import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BrandTheme } from "../../schemas/brand-theme";
import type { Content } from "../../schemas/content-schema";
import type { Template } from "../../schemas/template-schema";
import { generateHTMLStatic } from "../html-static-generator";

// ── Fixtures ────────────────────────────────────────────────────────

const minimalTemplate: Template = {
	id: "test-site",
	name: "Test Site",
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
	templateRef: "test-site",
	themeRef: "test-theme",
	pages: [
		{
			pageId: "page-1",
			sections: [
				{
					sectionId: "section-1",
					fields: { "title-1": { type: "title", text: "Hello World" } },
					cards: [],
					children: [],
				},
			],
		},
	],
};

const multiPageTemplate: Template = {
	id: "multi-site",
	name: "Multi Page Site",
	pages: [
		{
			id: "page-1",
			name: "Home",
			sections: [
				{
					id: "sec-home",
					layout: "section",
					fields: [{ id: "title-home", type: "title", required: true }],
					cards: [],
					children: [],
				},
			],
		},
		{
			id: "page-2",
			name: "About Us",
			sections: [
				{
					id: "sec-about",
					layout: "section",
					fields: [
						{ id: "title-about", type: "title", required: true },
						{ id: "para-about", type: "paragraph", required: false },
					],
					cards: [],
					children: [],
				},
			],
		},
		{
			id: "page-3",
			name: "Contact",
			sections: [
				{
					id: "sec-contact",
					layout: "section",
					fields: [
						{ id: "title-contact", type: "title", required: true },
						{ id: "btn-contact", type: "button", required: false },
					],
					cards: [],
					children: [],
				},
			],
		},
	],
};

const multiPageContent: Content = {
	templateRef: "multi-site",
	themeRef: "test-theme",
	pages: [
		{
			pageId: "page-1",
			sections: [
				{
					sectionId: "sec-home",
					fields: { "title-home": { type: "title", text: "Welcome Home" } },
					cards: [],
					children: [],
				},
			],
		},
		{
			pageId: "page-2",
			sections: [
				{
					sectionId: "sec-about",
					fields: {
						"title-about": { type: "title", text: "About Us" },
						"para-about": { type: "paragraph", text: "We are a great company." },
					},
					cards: [],
					children: [],
				},
			],
		},
		{
			pageId: "page-3",
			sections: [
				{
					sectionId: "sec-contact",
					fields: {
						"title-contact": { type: "title", text: "Contact Us" },
						"btn-contact": { type: "button", text: "Email Us", url: "mailto:test@example.com" },
					},
					cards: [],
					children: [],
				},
			],
		},
	],
};

// ── Test helpers ────────────────────────────────────────────────────

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(join(tmpdir(), "ce-static-test-"));
});

afterEach(async () => {
	if (tempDir && existsSync(tempDir)) {
		await rm(tempDir, { recursive: true, force: true });
	}
});

// ── Single-page tests ──────────────────────────────────────────────

describe("generateHTMLStatic — single page", () => {
	test("produces index.html for a single-page template", async () => {
		const result = await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: tempDir,
		});

		expect(result.files).toContain("index.html");
		expect(existsSync(join(tempDir, "index.html"))).toBe(true);
	});

	test("index.html is a complete HTML document", async () => {
		await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: tempDir,
		});

		const html = await readFile(join(tempDir, "index.html"), "utf-8");
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("<html");
		expect(html).toContain("</html>");
		expect(html).toContain("<head>");
		expect(html).toContain("<body>");
	});

	test("index.html contains rendered content", async () => {
		await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: tempDir,
		});

		const html = await readFile(join(tempDir, "index.html"), "utf-8");
		expect(html).toContain("Hello World");
		expect(html).toContain("ce-field--title");
	});

	test("index.html contains theme CSS variables", async () => {
		await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: tempDir,
		});

		const html = await readFile(join(tempDir, "index.html"), "utf-8");
		expect(html).toContain("--color-primary");
		expect(html).toContain("#1a56db");
	});

	test("single page has no navigation", async () => {
		await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: tempDir,
		});

		const html = await readFile(join(tempDir, "index.html"), "utf-8");
		expect(html).not.toContain("ce-nav");
	});

	test("returns correct outputDir", async () => {
		const result = await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: tempDir,
		});

		expect(result.outputDir).toBe(tempDir);
	});

	test("has no external dependencies (no CDN links)", async () => {
		await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: tempDir,
		});

		const html = await readFile(join(tempDir, "index.html"), "utf-8");
		// No external stylesheet or script references
		expect(html).not.toMatch(/href="https?:\/\//);
		expect(html).not.toMatch(/src="https?:\/\//);
	});

	test("has no JavaScript in output", async () => {
		await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: tempDir,
		});

		const html = await readFile(join(tempDir, "index.html"), "utf-8");
		expect(html).not.toContain("<script");
	});
});

// ── Multi-page tests ───────────────────────────────────────────────

describe("generateHTMLStatic — multi-page", () => {
	test("produces separate HTML files for each page", async () => {
		const result = await generateHTMLStatic(multiPageTemplate, minimalTheme, multiPageContent, {
			outputDir: tempDir,
		});

		expect(result.files).toContain("index.html");
		expect(result.files).toContain("about-us.html");
		expect(result.files).toContain("contact.html");
		expect(result.files.length).toBe(3);
	});

	test("first page is index.html", async () => {
		await generateHTMLStatic(multiPageTemplate, minimalTheme, multiPageContent, {
			outputDir: tempDir,
		});

		const html = await readFile(join(tempDir, "index.html"), "utf-8");
		expect(html).toContain("Welcome Home");
	});

	test("second page contains its content", async () => {
		await generateHTMLStatic(multiPageTemplate, minimalTheme, multiPageContent, {
			outputDir: tempDir,
		});

		const html = await readFile(join(tempDir, "about-us.html"), "utf-8");
		expect(html).toContain("About Us");
		expect(html).toContain("We are a great company.");
	});

	test("third page contains its content", async () => {
		await generateHTMLStatic(multiPageTemplate, minimalTheme, multiPageContent, {
			outputDir: tempDir,
		});

		const html = await readFile(join(tempDir, "contact.html"), "utf-8");
		expect(html).toContain("Contact Us");
		expect(html).toContain("Email Us");
	});

	test("each page has inter-page navigation", async () => {
		await generateHTMLStatic(multiPageTemplate, minimalTheme, multiPageContent, {
			outputDir: tempDir,
		});

		const home = await readFile(join(tempDir, "index.html"), "utf-8");
		expect(home).toContain("ce-nav");
		expect(home).toContain('href="about-us.html"');
		expect(home).toContain('href="contact.html"');
		// Current page is not a link
		expect(home).toContain("ce-nav-current");

		const about = await readFile(join(tempDir, "about-us.html"), "utf-8");
		expect(about).toContain('href="index.html"');
		expect(about).toContain('href="contact.html"');
	});

	test("each page is a complete HTML document", async () => {
		await generateHTMLStatic(multiPageTemplate, minimalTheme, multiPageContent, {
			outputDir: tempDir,
		});

		for (const file of ["index.html", "about-us.html", "contact.html"]) {
			const html = await readFile(join(tempDir, file), "utf-8");
			expect(html).toContain("<!DOCTYPE html>");
			expect(html).toContain("<html");
			expect(html).toContain("</html>");
		}
	});

	test("each page has theme CSS inlined", async () => {
		await generateHTMLStatic(multiPageTemplate, minimalTheme, multiPageContent, {
			outputDir: tempDir,
		});

		for (const file of ["index.html", "about-us.html", "contact.html"]) {
			const html = await readFile(join(tempDir, file), "utf-8");
			expect(html).toContain("--color-primary");
		}
	});

	test("no JavaScript in multi-page output", async () => {
		await generateHTMLStatic(multiPageTemplate, minimalTheme, multiPageContent, {
			outputDir: tempDir,
		});

		for (const file of ["index.html", "about-us.html", "contact.html"]) {
			const html = await readFile(join(tempDir, file), "utf-8");
			expect(html).not.toContain("<script");
		}
	});
});

// ── Canvas size options ────────────────────────────────────────────

describe("generateHTMLStatic — canvas options", () => {
	test("respects custom canvas dimensions", async () => {
		await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: tempDir,
			canvasWidth: 1920,
			canvasHeight: 1080,
		});

		const html = await readFile(join(tempDir, "index.html"), "utf-8");
		expect(html).toContain("1920px");
		expect(html).toContain("1080px");
	});

	test("uses template canvasSize for given format", async () => {
		const templateWithCanvas: Template = {
			...minimalTemplate,
			canvasSize: { html: { width: 800, height: 600 } },
		};

		await generateHTMLStatic(templateWithCanvas, minimalTheme, minimalContent, {
			outputDir: tempDir,
			format: "html",
		});

		const html = await readFile(join(tempDir, "index.html"), "utf-8");
		expect(html).toContain("800px");
		expect(html).toContain("600px");
	});
});

// ── Asset handling ─────────────────────────────────────────────────

describe("generateHTMLStatic — assets", () => {
	test("copies local image assets to assets/ directory", async () => {
		// Create a temp image file to reference
		const imgDir = join(tempDir, "source-images");
		await mkdir(imgDir, { recursive: true });
		const imgPath = join(imgDir, "photo.png");
		await writeFile(imgPath, "fake-png-data");

		const templateWithImage: Template = {
			id: "img-site",
			name: "Image Site",
			pages: [
				{
					id: "page-1",
					sections: [
						{
							id: "sec-1",
							layout: "section",
							fields: [{ id: "img-1", type: "featured-content", required: true }],
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const contentWithImage: Content = {
			templateRef: "img-site",
			themeRef: "test-theme",
			pages: [
				{
					pageId: "page-1",
					sections: [
						{
							sectionId: "sec-1",
							fields: {
								"img-1": { type: "featured-content", src: imgPath, alt: "A photo" },
							},
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const outDir = join(tempDir, "output");
		const result = await generateHTMLStatic(templateWithImage, minimalTheme, contentWithImage, {
			outputDir: outDir,
		});

		expect(result.files).toContain("assets/photo.png");
		expect(existsSync(join(outDir, "assets", "photo.png"))).toBe(true);

		const copied = await readFile(join(outDir, "assets", "photo.png"), "utf-8");
		expect(copied).toBe("fake-png-data");
	});

	test("skips non-existent local assets without error", async () => {
		const templateWithImage: Template = {
			id: "img-site",
			name: "Image Site",
			pages: [
				{
					id: "page-1",
					sections: [
						{
							id: "sec-1",
							layout: "section",
							fields: [{ id: "img-1", type: "featured-content", required: true }],
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const contentWithBadPath: Content = {
			templateRef: "img-site",
			themeRef: "test-theme",
			pages: [
				{
					pageId: "page-1",
					sections: [
						{
							sectionId: "sec-1",
							fields: {
								"img-1": {
									type: "featured-content",
									src: "/nonexistent/image.png",
									alt: "Missing",
								},
							},
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		// Should not throw
		const result = await generateHTMLStatic(templateWithImage, minimalTheme, contentWithBadPath, {
			outputDir: join(tempDir, "output"),
		});

		expect(result.files).toContain("index.html");
		// No assets directory created for missing files
		expect(result.files).not.toContain("assets/image.png");
	});

	test("ignores HTTPS URLs (not local assets)", async () => {
		const templateWithImage: Template = {
			id: "img-site",
			name: "Image Site",
			pages: [
				{
					id: "page-1",
					sections: [
						{
							id: "sec-1",
							layout: "section",
							fields: [{ id: "img-1", type: "featured-content", required: true }],
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const contentWithUrl: Content = {
			templateRef: "img-site",
			themeRef: "test-theme",
			pages: [
				{
					pageId: "page-1",
					sections: [
						{
							sectionId: "sec-1",
							fields: {
								"img-1": {
									type: "featured-content",
									src: "https://example.com/photo.jpg",
									alt: "Web",
								},
							},
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const result = await generateHTMLStatic(templateWithImage, minimalTheme, contentWithUrl, {
			outputDir: join(tempDir, "output"),
		});

		// No assets directory needed
		expect(result.files).toEqual(["index.html"]);
	});

	test("ignores data URI images (not local assets)", async () => {
		const templateWithImage: Template = {
			id: "img-site",
			name: "Image Site",
			pages: [
				{
					id: "page-1",
					sections: [
						{
							id: "sec-1",
							layout: "section",
							fields: [{ id: "img-1", type: "featured-content", required: true }],
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const contentWithDataUri: Content = {
			templateRef: "img-site",
			themeRef: "test-theme",
			pages: [
				{
					pageId: "page-1",
					sections: [
						{
							sectionId: "sec-1",
							fields: {
								"img-1": {
									type: "featured-content",
									src: "data:image/png;base64,abc123",
									alt: "Data",
								},
							},
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const result = await generateHTMLStatic(templateWithImage, minimalTheme, contentWithDataUri, {
			outputDir: join(tempDir, "output"),
		});

		expect(result.files).toEqual(["index.html"]);
	});

	test("copies local background image assets to assets/ directory", async () => {
		const imgDir = join(tempDir, "bg-images");
		await mkdir(imgDir, { recursive: true });
		const bgPath = join(imgDir, "bg-pattern.png");
		await writeFile(bgPath, "fake-bg-data");

		const templateWithBg: Template = {
			id: "bg-site",
			name: "Background Site",
			pages: [
				{
					id: "page-1",
					sections: [
						{
							id: "sec-1",
							layout: "section",
							fields: [{ id: "bg-1", type: "background", required: true }],
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const contentWithBg: Content = {
			templateRef: "bg-site",
			themeRef: "test-theme",
			pages: [
				{
					pageId: "page-1",
					sections: [
						{
							sectionId: "sec-1",
							fields: {
								"bg-1": { type: "background", value: `url(${bgPath})` },
							},
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const outDir = join(tempDir, "bg-output");
		const result = await generateHTMLStatic(templateWithBg, minimalTheme, contentWithBg, {
			outputDir: outDir,
		});

		expect(result.files).toContain("assets/bg-pattern.png");
		expect(existsSync(join(outDir, "assets", "bg-pattern.png"))).toBe(true);
	});

	test("ignores background CSS colors and gradients (no asset collection)", async () => {
		const templateWithBg: Template = {
			id: "bg-color-site",
			name: "BG Color Site",
			pages: [
				{
					id: "page-1",
					sections: [
						{
							id: "sec-1",
							layout: "section",
							fields: [
								{ id: "bg-1", type: "background", required: true },
								{ id: "bg-2", type: "background", required: true },
							],
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const contentWithColors: Content = {
			templateRef: "bg-color-site",
			themeRef: "test-theme",
			pages: [
				{
					pageId: "page-1",
					sections: [
						{
							sectionId: "sec-1",
							fields: {
								"bg-1": { type: "background", value: "#ff0000" },
								"bg-2": {
									type: "background",
									value: "linear-gradient(90deg, #000, #fff)",
								},
							},
							cards: [],
							children: [],
						},
					],
				},
			],
		};

		const outDir = join(tempDir, "bg-color-output");
		const result = await generateHTMLStatic(templateWithBg, minimalTheme, contentWithColors, {
			outputDir: outDir,
		});

		expect(result.files).toEqual(["index.html"]);
	});
});

// ── Slug generation ────────────────────────────────────────────────

describe("generateHTMLStatic — page slugification", () => {
	test("handles pages without names", async () => {
		const template: Template = {
			id: "unnamed",
			name: "Unnamed Pages",
			pages: [
				{
					id: "p1",
					sections: [{ id: "s1", layout: "section", fields: [], cards: [], children: [] }],
				},
				{
					id: "p2",
					sections: [{ id: "s2", layout: "section", fields: [], cards: [], children: [] }],
				},
			],
		};
		const content: Content = {
			templateRef: "unnamed",
			themeRef: "test-theme",
			pages: [
				{ pageId: "p1", sections: [{ sectionId: "s1", fields: {}, cards: [], children: [] }] },
				{ pageId: "p2", sections: [{ sectionId: "s2", fields: {}, cards: [], children: [] }] },
			],
		};

		const result = await generateHTMLStatic(template, minimalTheme, content, {
			outputDir: tempDir,
		});

		expect(result.files).toContain("index.html");
		expect(result.files).toContain("page-2.html");
	});

	test("slugifies special characters in page names", async () => {
		const template: Template = {
			id: "special",
			name: "Special Names",
			pages: [
				{
					id: "p1",
					name: "Home",
					sections: [{ id: "s1", layout: "section", fields: [], cards: [], children: [] }],
				},
				{
					id: "p2",
					name: "Our Products & Services!",
					sections: [{ id: "s2", layout: "section", fields: [], cards: [], children: [] }],
				},
			],
		};
		const content: Content = {
			templateRef: "special",
			themeRef: "test-theme",
			pages: [
				{ pageId: "p1", sections: [{ sectionId: "s1", fields: {}, cards: [], children: [] }] },
				{ pageId: "p2", sections: [{ sectionId: "s2", fields: {}, cards: [], children: [] }] },
			],
		};

		const result = await generateHTMLStatic(template, minimalTheme, content, {
			outputDir: tempDir,
		});

		expect(result.files).toContain("our-products-services.html");
	});
});

// ── Output directory handling ──────────────────────────────────────

describe("generateHTMLStatic — output directory", () => {
	test("creates output directory if it does not exist", async () => {
		const deepDir = join(tempDir, "deep", "nested", "output");
		expect(existsSync(deepDir)).toBe(false);

		await generateHTMLStatic(minimalTemplate, minimalTheme, minimalContent, {
			outputDir: deepDir,
		});

		expect(existsSync(deepDir)).toBe(true);
		expect(existsSync(join(deepDir, "index.html"))).toBe(true);
	});
});

// ── Full sample fixture test ───────────────────────────────────────

describe("generateHTMLStatic — sample fixtures", () => {
	test("generates multi-page site from sample fixtures", async () => {
		const sampleTemplate = JSON.parse(
			await readFile(join(import.meta.dir, "../../../../fixtures/sample-template.json"), "utf-8"),
		) as Template;
		const sampleTheme = JSON.parse(
			await readFile(join(import.meta.dir, "../../../../fixtures/sample-theme.json"), "utf-8"),
		) as BrandTheme;
		const sampleContent = JSON.parse(
			await readFile(join(import.meta.dir, "../../../../fixtures/sample-content.json"), "utf-8"),
		) as Content;

		const result = await generateHTMLStatic(sampleTemplate, sampleTheme, sampleContent, {
			outputDir: join(tempDir, "sample-output"),
		});

		// 4 pages → 4 HTML files
		expect(result.files.filter((f) => f.endsWith(".html")).length).toBe(4);
		expect(result.files).toContain("index.html");

		// Each file is a valid HTML document
		for (const file of result.files.filter((f) => f.endsWith(".html"))) {
			const html = await readFile(join(result.outputDir, file), "utf-8");
			expect(html).toContain("<!DOCTYPE html>");
			expect(html).toContain("ce-nav"); // multi-page has navigation
		}

		// First page (Hero Slide) has hero content
		const indexHtml = await readFile(join(result.outputDir, "index.html"), "utf-8");
		expect(indexHtml).toContain("Transform Your Business");
	});
});
