import { describe, expect, it } from "bun:test";
import sampleContent from "../../../../fixtures/sample-content.json";
import sampleTemplate from "../../../../fixtures/sample-template.json";
import { ContentSchema } from "../content-schema";
import { validateContent } from "../content-validator";
import { TemplateSchema } from "../template-schema";

const template = TemplateSchema.parse(sampleTemplate);
const content = ContentSchema.parse(sampleContent);

describe("validateContent", () => {
	it("returns no errors for valid sample data", () => {
		const errors = validateContent(content, template);
		expect(errors).toEqual([]);
	});

	it("reports page count mismatch", () => {
		const badContent = {
			...content,
			pages: [content.pages[0]],
		};
		const errors = validateContent(badContent, template);
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toContain("pages");
	});

	it("reports page ID mismatch", () => {
		const badContent = {
			...content,
			pages: content.pages.map((p, i) => (i === 0 ? { ...p, pageId: "wrong-id" } : p)),
		};
		const errors = validateContent(badContent, template);
		expect(errors.some((e) => e.message.includes("wrong-id"))).toBe(true);
	});

	it("reports missing required fields", () => {
		const badContent = {
			...content,
			pages: content.pages.map((p, i) =>
				i === 0
					? {
							...p,
							sections: p.sections.map((s) => ({
								...s,
								fields: {}, // remove all field values
							})),
						}
					: p,
			),
		};
		const errors = validateContent(badContent, template);
		// hero-bg and hero-title are required
		expect(errors.some((e) => e.message.includes("hero-bg"))).toBe(true);
		expect(errors.some((e) => e.message.includes("hero-title"))).toBe(true);
	});

	it("reports orphan content fields", () => {
		const badContent = {
			...content,
			pages: content.pages.map((p, i) =>
				i === 0
					? {
							...p,
							sections: p.sections.map((s) => ({
								...s,
								fields: {
									...s.fields,
									"nonexistent-field": { type: "title" as const, text: "Orphan" },
								},
							})),
						}
					: p,
			),
		};
		const errors = validateContent(badContent, template);
		expect(errors.some((e) => e.message.includes("nonexistent-field"))).toBe(true);
	});

	it("reports field type mismatch", () => {
		const badContent = {
			...content,
			pages: content.pages.map((p, i) =>
				i === 0
					? {
							...p,
							sections: p.sections.map((s) => ({
								...s,
								fields: {
									...s.fields,
									// hero-title expects "title" but we give "paragraph"
									"hero-title": { type: "paragraph" as const, text: "Wrong type" },
								},
							})),
						}
					: p,
			),
		};
		const errors = validateContent(badContent, template);
		expect(errors.some((e) => e.message.includes("type mismatch"))).toBe(true);
	});

	it("reports orphan content sections", () => {
		const badContent = {
			...content,
			pages: content.pages.map((p, i) =>
				i === 0
					? {
							...p,
							sections: [
								...p.sections,
								{
									sectionId: "ghost-section",
									fields: {},
									cards: [],
									children: [],
								},
							],
						}
					: p,
			),
		};
		const errors = validateContent(badContent, template);
		expect(errors.some((e) => e.message.includes("ghost-section"))).toBe(true);
	});

	it("reports missing required card fields", () => {
		const badContent = {
			...content,
			pages: content.pages.map((p, i) =>
				i === 1
					? {
							...p,
							sections: p.sections.map((s) =>
								s.sectionId === "features-grid"
									? {
											...s,
											cards: s.cards.map((c, ci) =>
												ci === 0
													? { ...c, fields: {} } // empty card fields
													: c,
											),
										}
									: s,
							),
						}
					: p,
			),
		};
		const errors = validateContent(badContent, template);
		// fc1-icon, fc1-title, fc1-desc are all required
		expect(errors.some((e) => e.message.includes("fc1-icon"))).toBe(true);
	});

	it("allows omitting optional fields without error", () => {
		// hero-subtitle is optional — remove it and verify no error
		const validContent = {
			...content,
			pages: content.pages.map((p, i) =>
				i === 0
					? {
							...p,
							sections: p.sections.map((s) => {
								const { "hero-subtitle": _, ...rest } = s.fields;
								return { ...s, fields: rest };
							}),
						}
					: p,
			),
		};
		const errors = validateContent(validContent, template);
		expect(errors).toEqual([]);
	});
});
