import { describe, expect, test } from "bun:test";
import type { BrandTheme } from "../../schemas/brand-theme";
import type { Content } from "../../schemas/content-schema";
import type { Template } from "../../schemas/template-schema";
import { generatePPTX } from "../pptx-generator";

// ── Fixtures ───────────────────────────────────────────────────────

const minimalTemplate: Template = {
	id: "test-deck",
	name: "Test Deck",
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
	templateRef: "test-deck",
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

// ── ZIP magic bytes check ──────────────────────────────────────────

function isValidZip(buffer: Uint8Array): boolean {
	// ZIP files start with PK\x03\x04
	return buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

// ── Tests ──────────────────────────────────────────────────────────

describe("PPTX Generator", () => {
	describe("basic generation", () => {
		test("generates a valid PPTX buffer from minimal inputs", async () => {
			const result = await generatePPTX(minimalTemplate, minimalTheme, minimalContent);

			expect(result.buffer).toBeInstanceOf(Uint8Array);
			expect(result.buffer.length).toBeGreaterThan(0);
			expect(result.slideCount).toBe(1);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("generates correct number of slides for multi-page template", async () => {
			const multiPage: Template = {
				id: "multi",
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
								fields: [{ id: "f2", type: "paragraph", required: true }],
								cards: [],
								children: [],
							},
						],
					},
					{
						id: "p3",
						sections: [
							{
								id: "s3",
								layout: "section",
								fields: [{ id: "f3", type: "subtitle", required: true }],
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const content: Content = {
				templateRef: "multi",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "s1",
								fields: { f1: { type: "title", text: "Slide 1" } },
								cards: [],
								children: [],
							},
						],
					},
					{
						pageId: "p2",
						sections: [
							{
								sectionId: "s2",
								fields: { f2: { type: "paragraph", text: "Body text" } },
								cards: [],
								children: [],
							},
						],
					},
					{
						pageId: "p3",
						sections: [
							{
								sectionId: "s3",
								fields: { f3: { type: "subtitle", text: "Sub" } },
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const result = await generatePPTX(multiPage, minimalTheme, content);
			expect(result.slideCount).toBe(3);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("generates PPTX with empty sections (no fields)", async () => {
			const emptyTemplate: Template = {
				id: "empty",
				name: "Empty",
				pages: [
					{
						id: "p1",
						sections: [{ id: "s1", layout: "section", fields: [], cards: [], children: [] }],
					},
				],
			};

			const content: Content = {
				templateRef: "empty",
				themeRef: "test",
				pages: [
					{ pageId: "p1", sections: [{ sectionId: "s1", fields: {}, cards: [], children: [] }] },
				],
			};

			const result = await generatePPTX(emptyTemplate, minimalTheme, content);
			expect(result.slideCount).toBe(1);
			expect(isValidZip(result.buffer)).toBe(true);
		});
	});

	describe("field types", () => {
		test("renders all 7 field types without errors", async () => {
			const template: Template = {
				id: "all-fields",
				name: "All Fields",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "s1",
								layout: "section",
								fields: [
									{ id: "f-title", type: "title", required: true },
									{ id: "f-subtitle", type: "subtitle", required: true },
									{ id: "f-paragraph", type: "paragraph", required: true },
									{ id: "f-button", type: "button", required: true },
									{ id: "f-image", type: "featured-content", required: true },
									{ id: "f-caption", type: "featured-content-caption", required: false },
									{ id: "f-bg", type: "background", required: true },
								],
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const content: Content = {
				templateRef: "all-fields",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "s1",
								fields: {
									"f-title": { type: "title", text: "Main Title" },
									"f-subtitle": { type: "subtitle", text: "Sub Title" },
									"f-paragraph": { type: "paragraph", text: "Body text paragraph." },
									"f-button": { type: "button", text: "Click Me", url: "https://example.com" },
									"f-image": {
										type: "featured-content",
										src: "/assets/photo.jpg",
										alt: "A photo",
									},
									"f-caption": { type: "featured-content-caption", text: "Photo caption" },
									"f-bg": { type: "background", value: "#1e3a5f" },
								},
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const result = await generatePPTX(template, minimalTheme, content);
			expect(result.slideCount).toBe(1);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("handles gradient background values", async () => {
			const template: Template = {
				id: "grad",
				name: "Gradient",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "s1",
								layout: "section",
								fields: [{ id: "bg", type: "background", required: true }],
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const content: Content = {
				templateRef: "grad",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "s1",
								fields: {
									bg: {
										type: "background",
										value: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
									},
								},
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const result = await generatePPTX(template, minimalTheme, content);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("handles missing optional field values gracefully", async () => {
			const template: Template = {
				id: "opt",
				name: "Optional",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "s1",
								layout: "section",
								fields: [
									{ id: "f1", type: "title", required: true },
									{ id: "f2", type: "subtitle", required: false },
								],
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const content: Content = {
				templateRef: "opt",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "s1",
								fields: {
									f1: { type: "title", text: "Title" },
									// f2 deliberately omitted
								},
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const result = await generatePPTX(template, minimalTheme, content);
			expect(isValidZip(result.buffer)).toBe(true);
		});
	});

	describe("layout primitives", () => {
		test("handles grid layout with cards", async () => {
			const template: Template = {
				id: "grid-test",
				name: "Grid Test",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "grid-section",
								layout: "grid",
								gridConfig: { columns: 2, rows: 1, gap: 16 },
								fields: [],
								cards: [
									{
										id: "card-1",
										fields: [
											{ id: "c1-title", type: "title", required: true },
											{ id: "c1-text", type: "paragraph", required: true },
										],
									},
									{
										id: "card-2",
										fields: [
											{ id: "c2-title", type: "title", required: true },
											{ id: "c2-text", type: "paragraph", required: true },
										],
									},
								],
								children: [],
							},
						],
					},
				],
			};

			const content: Content = {
				templateRef: "grid-test",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "grid-section",
								fields: {},
								cards: [
									{
										cardId: "card-1",
										fields: {
											"c1-title": { type: "title", text: "Card 1" },
											"c1-text": { type: "paragraph", text: "Card 1 text" },
										},
									},
									{
										cardId: "card-2",
										fields: {
											"c2-title": { type: "title", text: "Card 2" },
											"c2-text": { type: "paragraph", text: "Card 2 text" },
										},
									},
								],
								children: [],
							},
						],
					},
				],
			};

			const result = await generatePPTX(template, minimalTheme, content);
			expect(result.slideCount).toBe(1);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("handles flex layout", async () => {
			const template: Template = {
				id: "flex-test",
				name: "Flex Test",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "flex-section",
								layout: "flex",
								flexConfig: { direction: "row", gap: 24, align: "center" },
								fields: [
									{ id: "left", type: "featured-content", required: true },
									{ id: "right", type: "paragraph", required: true },
								],
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const content: Content = {
				templateRef: "flex-test",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "flex-section",
								fields: {
									left: { type: "featured-content", src: "/photo.jpg", alt: "Photo" },
									right: { type: "paragraph", text: "Description text" },
								},
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const result = await generatePPTX(template, minimalTheme, content);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("handles stack layout", async () => {
			const template: Template = {
				id: "stack-test",
				name: "Stack Test",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "stack-section",
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
			};

			const content: Content = {
				templateRef: "stack-test",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "stack-section",
								fields: {
									bg: { type: "background", value: "#1e3a5f" },
									title: { type: "title", text: "Overlay Title" },
								},
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const result = await generatePPTX(template, minimalTheme, content);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("handles free-position layout with child sections", async () => {
			const template: Template = {
				id: "free-test",
				name: "Free Test",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "free-section",
								layout: "free-position",
								fields: [],
								cards: [],
								children: [
									{
										id: "child-1",
										layout: "section",
										position: { x: 50, y: 30, width: 400, height: 100 },
										fields: [{ id: "child-title", type: "title", required: true }],
										cards: [],
										children: [],
									},
								],
							},
						],
					},
				],
			};

			const content: Content = {
				templateRef: "free-test",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "free-section",
								fields: {},
								cards: [],
								children: [
									{
										sectionId: "child-1",
										fields: { "child-title": { type: "title", text: "Positioned Title" } },
										cards: [],
										children: [],
									},
								],
							},
						],
					},
				],
			};

			const result = await generatePPTX(template, minimalTheme, content);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("handles nested children (flex > section)", async () => {
			const template: Template = {
				id: "nested",
				name: "Nested",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "outer",
								layout: "flex",
								flexConfig: { direction: "row", gap: 16 },
								fields: [{ id: "img", type: "featured-content", required: true }],
								cards: [],
								children: [
									{
										id: "inner",
										layout: "section",
										fields: [
											{ id: "inner-title", type: "title", required: true },
											{ id: "inner-body", type: "paragraph", required: true },
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

			const content: Content = {
				templateRef: "nested",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "outer",
								fields: { img: { type: "featured-content", src: "/img.png" } },
								cards: [],
								children: [
									{
										sectionId: "inner",
										fields: {
											"inner-title": { type: "title", text: "Nested Title" },
											"inner-body": { type: "paragraph", text: "Nested body" },
										},
										cards: [],
										children: [],
									},
								],
							},
						],
					},
				],
			};

			const result = await generatePPTX(template, minimalTheme, content);
			expect(isValidZip(result.buffer)).toBe(true);
		});
	});

	describe("theme application", () => {
		test("applies section theme overrides", async () => {
			const themeWithOverrides: BrandTheme = {
				...minimalTheme,
				sectionOverrides: {
					hero: {
						colors: { background: "#1e3a5f", text: "#ffffff" },
						typography: {
							heading: { fontFamily: "Georgia", fontSize: 48, fontWeight: 800, lineHeight: 1.1 },
						},
					},
				},
			};

			const template: Template = {
				id: "override-test",
				name: "Override Test",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "hero",
								name: "hero",
								layout: "section",
								fields: [{ id: "title", type: "title", required: true }],
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const content: Content = {
				templateRef: "override-test",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "hero",
								fields: { title: { type: "title", text: "Hero Title" } },
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			// Should succeed — we can't inspect PPTX internals easily,
			// but generation should complete without errors
			const result = await generatePPTX(template, themeWithOverrides, content);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("applies button style from theme", async () => {
			const themeWithButton: BrandTheme = {
				...minimalTheme,
				button: {
					borderRadius: 24,
					paddingX: 32,
					paddingY: 16,
					fill: "#ff6600",
					textColor: "#ffffff",
				},
			};

			const template: Template = {
				id: "btn-test",
				name: "Button Test",
				pages: [
					{
						id: "p1",
						sections: [
							{
								id: "s1",
								layout: "section",
								fields: [{ id: "btn", type: "button", required: true }],
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const content: Content = {
				templateRef: "btn-test",
				themeRef: "test",
				pages: [
					{
						pageId: "p1",
						sections: [
							{
								sectionId: "s1",
								fields: { btn: { type: "button", text: "Buy Now", url: "https://example.com" } },
								cards: [],
								children: [],
							},
						],
					},
				],
			};

			const result = await generatePPTX(template, themeWithButton, content);
			expect(isValidZip(result.buffer)).toBe(true);
		});
	});

	describe("canvas and options", () => {
		test("uses template canvasSize.pptx when available", async () => {
			const templateWithCanvas: Template = {
				...minimalTemplate,
				canvasSize: { pptx: { width: 914.4, height: 685.8 } },
			};

			const result = await generatePPTX(templateWithCanvas, minimalTheme, minimalContent);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("uses default canvas when template has no pptx size", async () => {
			const result = await generatePPTX(minimalTemplate, minimalTheme, minimalContent);
			expect(isValidZip(result.buffer)).toBe(true);
		});

		test("respects custom slide dimensions", async () => {
			const result = await generatePPTX(minimalTemplate, minimalTheme, minimalContent, {
				slideWidth: 13.33,
				slideHeight: 7.5,
			});
			expect(isValidZip(result.buffer)).toBe(true);
		});
	});

	describe("sample fixtures", () => {
		test("generates PPTX from full sample fixture data", async () => {
			// Load the actual fixture files
			const templateFile = Bun.file("fixtures/sample-template.json");
			const themeFile = Bun.file("fixtures/sample-theme.json");
			const contentFile = Bun.file("fixtures/sample-content.json");

			const template: Template = await templateFile.json();
			const theme: BrandTheme = await themeFile.json();
			const content: Content = await contentFile.json();

			const result = await generatePPTX(template, theme, content);

			expect(result.slideCount).toBe(4);
			expect(result.buffer.length).toBeGreaterThan(1000); // reasonable minimum size
			expect(isValidZip(result.buffer)).toBe(true);
		});
	});
});
