import { describe, expect, it } from "bun:test";
import sampleTemplate from "../../../../fixtures/sample-template.json";
import {
	CardSchema,
	FieldSchema,
	LayoutPrimitiveSchema,
	SectionSchema,
	TemplateSchema,
} from "../template-schema";

describe("TemplateSchema", () => {
	it("validates the sample template fixture", () => {
		const result = TemplateSchema.safeParse(sampleTemplate);
		expect(result.success).toBe(true);
	});

	it("rejects a template with no pages", () => {
		const result = TemplateSchema.safeParse({
			id: "empty",
			name: "Empty",
			pages: [],
		});
		expect(result.success).toBe(false);
	});

	it("rejects a template with missing id", () => {
		const result = TemplateSchema.safeParse({
			name: "No ID",
			pages: [{ id: "p1", sections: [] }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects a template with missing name", () => {
		const result = TemplateSchema.safeParse({
			id: "no-name",
			pages: [{ id: "p1", sections: [] }],
		});
		expect(result.success).toBe(false);
	});

	it("accepts optional canvasSize per format", () => {
		const result = TemplateSchema.safeParse({
			id: "canvas-test",
			name: "Canvas Test",
			canvasSize: {
				pptx: { width: 914.4, height: 685.8 },
				pdf: { width: 595.28, height: 841.89 },
			},
			pages: [{ id: "p1", sections: [] }],
		});
		expect(result.success).toBe(true);
	});
});

describe("LayoutPrimitiveSchema", () => {
	it.each([
		"section",
		"flex",
		"grid",
		"stack",
		"free-position",
	] as const)("accepts '%s'", (value: string) => {
		expect(LayoutPrimitiveSchema.safeParse(value).success).toBe(true);
	});

	it("rejects unknown layout types", () => {
		expect(LayoutPrimitiveSchema.safeParse("table").success).toBe(false);
	});
});

describe("FieldSchema", () => {
	it("validates all 7 section field types", () => {
		const types = [
			"title",
			"subtitle",
			"paragraph",
			"button",
			"featured-content",
			"featured-content-caption",
			"background",
		];
		for (const type of types) {
			const result = FieldSchema.safeParse({
				id: `field-${type}`,
				type,
				required: true,
			});
			expect(result.success).toBe(true);
		}
	});

	it("rejects unknown field types", () => {
		const result = FieldSchema.safeParse({
			id: "bad",
			type: "video",
			required: true,
		});
		expect(result.success).toBe(false);
	});
});

describe("CardSchema", () => {
	it("accepts cards with valid 6 field types (no featured-content-caption)", () => {
		const types = ["title", "subtitle", "paragraph", "button", "featured-content", "background"];
		const fields = types.map((t, i) => ({
			id: `f${i}`,
			type: t,
			required: false,
		}));
		const result = CardSchema.safeParse({ id: "card-1", fields });
		expect(result.success).toBe(true);
	});

	it("rejects cards with featured-content-caption field type", () => {
		const result = CardSchema.safeParse({
			id: "card-bad",
			fields: [{ id: "f1", type: "featured-content-caption", required: false }],
		});
		expect(result.success).toBe(false);
	});
});

describe("SectionSchema", () => {
	it("validates a section with flex config", () => {
		const result = SectionSchema.safeParse({
			id: "flex-sec",
			layout: "flex",
			flexConfig: { direction: "row", gap: 16, align: "center" },
			fields: [],
			cards: [],
			children: [],
		});
		expect(result.success).toBe(true);
	});

	it("validates a section with grid config", () => {
		const result = SectionSchema.safeParse({
			id: "grid-sec",
			layout: "grid",
			gridConfig: { columns: 3, rows: 2, gap: 8 },
			fields: [],
			cards: [],
			children: [],
		});
		expect(result.success).toBe(true);
	});

	it("validates nested sections (sub-sections)", () => {
		const result = SectionSchema.safeParse({
			id: "parent",
			layout: "flex",
			flexConfig: { direction: "column" },
			fields: [],
			cards: [],
			children: [
				{
					id: "child",
					layout: "section",
					fields: [{ id: "f1", type: "title", required: true }],
					cards: [],
					children: [],
				},
			],
		});
		expect(result.success).toBe(true);
	});

	it("validates free-position children with position coordinates", () => {
		const result = SectionSchema.safeParse({
			id: "free-parent",
			layout: "free-position",
			fields: [],
			cards: [],
			children: [
				{
					id: "positioned-child",
					layout: "section",
					position: { x: 100, y: 50, width: 200, height: 100 },
					fields: [{ id: "f1", type: "title", required: true }],
					cards: [],
					children: [],
				},
			],
		});
		expect(result.success).toBe(true);
	});
});

describe("Round-trip serialization", () => {
	it("template survives JSON serialize/deserialize", () => {
		const parsed = TemplateSchema.parse(sampleTemplate);
		const json = JSON.stringify(parsed);
		const reparsed = TemplateSchema.parse(JSON.parse(json));
		expect(reparsed).toEqual(parsed);
	});
});
