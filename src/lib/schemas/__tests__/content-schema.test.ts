import { describe, expect, it } from "bun:test";
import sampleContent from "../../../../fixtures/sample-content.json";
import { ContentSchema, FieldValueSchema } from "../content-schema";

describe("ContentSchema", () => {
	it("validates the sample content fixture", () => {
		const result = ContentSchema.safeParse(sampleContent);
		expect(result.success).toBe(true);
	});

	it("rejects content with no pages", () => {
		const result = ContentSchema.safeParse({
			templateRef: "t1",
			themeRef: "th1",
			pages: [],
		});
		expect(result.success).toBe(false);
	});

	it("rejects content with missing templateRef", () => {
		const result = ContentSchema.safeParse({
			themeRef: "th1",
			pages: [{ pageId: "p1", sections: [] }],
		});
		expect(result.success).toBe(false);
	});

	it("rejects content with missing themeRef", () => {
		const result = ContentSchema.safeParse({
			templateRef: "t1",
			pages: [{ pageId: "p1", sections: [] }],
		});
		expect(result.success).toBe(false);
	});
});

describe("FieldValueSchema", () => {
	it("validates title field value", () => {
		const result = FieldValueSchema.safeParse({ type: "title", text: "Hello" });
		expect(result.success).toBe(true);
	});

	it("validates subtitle field value", () => {
		const result = FieldValueSchema.safeParse({ type: "subtitle", text: "Sub" });
		expect(result.success).toBe(true);
	});

	it("validates paragraph field value", () => {
		const result = FieldValueSchema.safeParse({ type: "paragraph", text: "Body text" });
		expect(result.success).toBe(true);
	});

	it("validates button field value", () => {
		const result = FieldValueSchema.safeParse({
			type: "button",
			text: "Click",
			url: "https://example.com",
		});
		expect(result.success).toBe(true);
	});

	it("validates featured-content field value", () => {
		const result = FieldValueSchema.safeParse({
			type: "featured-content",
			src: "/image.png",
			alt: "An image",
		});
		expect(result.success).toBe(true);
	});

	it("validates featured-content-caption field value", () => {
		const result = FieldValueSchema.safeParse({
			type: "featured-content-caption",
			text: "Caption",
		});
		expect(result.success).toBe(true);
	});

	it("validates background field value", () => {
		const result = FieldValueSchema.safeParse({
			type: "background",
			value: "#ff0000",
		});
		expect(result.success).toBe(true);
	});

	it("rejects unknown field type", () => {
		const result = FieldValueSchema.safeParse({ type: "video", src: "v.mp4" });
		expect(result.success).toBe(false);
	});

	it("rejects button without url", () => {
		const result = FieldValueSchema.safeParse({ type: "button", text: "Click" });
		expect(result.success).toBe(false);
	});
});

describe("Content with nested sections", () => {
	it("parses showcase page with child section", () => {
		const parsed = ContentSchema.parse(sampleContent);
		const page3 = parsed.pages[2];
		expect(page3.sections[0].children).toHaveLength(1);
		expect(page3.sections[0].children[0].sectionId).toBe("showcase-text-group");
	});
});

describe("Round-trip serialization", () => {
	it("content survives JSON serialize/deserialize", () => {
		const parsed = ContentSchema.parse(sampleContent);
		const json = JSON.stringify(parsed);
		const reparsed = ContentSchema.parse(JSON.parse(json));
		expect(reparsed).toEqual(parsed);
	});
});
