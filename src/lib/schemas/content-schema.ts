import { z } from "zod";

// ── Field Values ───────────────────────────────────────────────────
// Each field type has an appropriate value shape.

export const TitleValueSchema = z.object({
	type: z.literal("title"),
	text: z.string(),
});

export const SubtitleValueSchema = z.object({
	type: z.literal("subtitle"),
	text: z.string(),
});

export const ParagraphValueSchema = z.object({
	type: z.literal("paragraph"),
	text: z.string(),
});

export const ButtonValueSchema = z.object({
	type: z.literal("button"),
	text: z.string(),
	url: z.string(),
});

export const FeaturedContentValueSchema = z.object({
	type: z.literal("featured-content"),
	src: z.string(),
	alt: z.string().optional(),
});

export const FeaturedContentCaptionValueSchema = z.object({
	type: z.literal("featured-content-caption"),
	text: z.string(),
});

export const BackgroundValueSchema = z.object({
	type: z.literal("background"),
	value: z.string(), // color, gradient, or image URL
});

export const FieldValueSchema = z.discriminatedUnion("type", [
	TitleValueSchema,
	SubtitleValueSchema,
	ParagraphValueSchema,
	ButtonValueSchema,
	FeaturedContentValueSchema,
	FeaturedContentCaptionValueSchema,
	BackgroundValueSchema,
]);
export type FieldValue = z.infer<typeof FieldValueSchema>;

// ── Content Card ───────────────────────────────────────────────────

export const ContentCardSchema = z.object({
	cardId: z.string().min(1),
	fields: z.record(z.string(), FieldValueSchema),
});
export type ContentCard = z.infer<typeof ContentCardSchema>;

// ── Content Section (recursive for sub-sections) ───────────────────

export interface ContentSection {
	sectionId: string;
	fields: Record<string, FieldValue>;
	cards: ContentCard[];
	children: ContentSection[];
}

export const ContentSectionSchema: z.ZodType<ContentSection> = z.lazy(() =>
	z.object({
		sectionId: z.string().min(1),
		fields: z.record(z.string(), FieldValueSchema),
		cards: z.array(ContentCardSchema),
		children: z.array(ContentSectionSchema),
	}),
);

// ── Content Page ───────────────────────────────────────────────────

export const ContentPageSchema = z.object({
	pageId: z.string().min(1),
	sections: z.array(ContentSectionSchema),
});
export type ContentPage = z.infer<typeof ContentPageSchema>;

// ── Content (root) ─────────────────────────────────────────────────

export const ContentSchema = z.object({
	templateRef: z.string().min(1),
	themeRef: z.string().min(1),
	pages: z.array(ContentPageSchema).min(1),
});
export type Content = z.infer<typeof ContentSchema>;
