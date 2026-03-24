import { z } from "zod";

// ── Layout Primitives ──────────────────────────────────────────────

export const LayoutPrimitiveSchema = z.enum(["section", "flex", "grid", "stack", "free-position"]);
export type LayoutPrimitive = z.infer<typeof LayoutPrimitiveSchema>;

// ── Layout Configs ─────────────────────────────────────────────────

export const FlexConfigSchema = z.object({
	direction: z.enum(["row", "column"]),
	gap: z.number().nonnegative().optional(),
	align: z.enum(["start", "center", "end", "stretch"]).optional(),
	wrap: z.boolean().optional(),
});
export type FlexConfig = z.infer<typeof FlexConfigSchema>;

export const GridConfigSchema = z.object({
	columns: z.number().int().positive(),
	rows: z.number().int().positive(),
	gap: z.number().nonnegative().optional(),
	columnSizes: z.array(z.number().positive()).optional(),
	rowSizes: z.array(z.number().positive()).optional(),
});
export type GridConfig = z.infer<typeof GridConfigSchema>;

export const StackConfigSchema = z.object({}).optional();
export type StackConfig = z.infer<typeof StackConfigSchema>;

export const FreePositionChildSchema = z.object({
	x: z.number(),
	y: z.number(),
	width: z.number().positive(),
	height: z.number().positive(),
});
export type FreePositionChild = z.infer<typeof FreePositionChildSchema>;

// ── Field Types ────────────────────────────────────────────────────

export const SectionFieldTypeSchema = z.enum([
	"title",
	"subtitle",
	"paragraph",
	"button",
	"featured-content",
	"featured-content-caption",
	"background",
]);
export type SectionFieldType = z.infer<typeof SectionFieldTypeSchema>;

export const CardFieldTypeSchema = z.enum([
	"title",
	"subtitle",
	"paragraph",
	"button",
	"featured-content",
	"background",
]);
export type CardFieldType = z.infer<typeof CardFieldTypeSchema>;

// ── Field ──────────────────────────────────────────────────────────

export const FieldSchema = z.object({
	id: z.string().min(1),
	type: SectionFieldTypeSchema,
	required: z.boolean(),
	label: z.string().optional(),
});
export type Field = z.infer<typeof FieldSchema>;

// ── Card ───────────────────────────────────────────────────────────
// Cards support 6 field types (no featured-content-caption)

export const CardFieldSchema = z.object({
	id: z.string().min(1),
	type: CardFieldTypeSchema,
	required: z.boolean(),
	label: z.string().optional(),
});

export const CardSchema = z.object({
	id: z.string().min(1),
	fields: z.array(CardFieldSchema),
});
export type Card = z.infer<typeof CardSchema>;

// ── Section (recursive container) ──────────────────────────────────
// Sections can contain fields, cards, and child sections (sub-sections).
// Nesting capped at 3 levels: Section → Sub Section → Card.

export interface Section {
	id: string;
	name?: string;
	layout: LayoutPrimitive;
	/** Whether this section is required when filling content */
	required?: boolean;
	flexConfig?: FlexConfig;
	gridConfig?: GridConfig;
	/** When parent layout is free-position, this child's absolute position */
	position?: FreePositionChild;
	fields: Field[];
	cards: Card[];
	children: Section[];
}

export const SectionSchema: z.ZodType<Section> = z.lazy(() =>
	z.object({
		id: z.string().min(1),
		name: z.string().optional(),
		layout: LayoutPrimitiveSchema,
		required: z.boolean().optional(),
		flexConfig: FlexConfigSchema.optional(),
		gridConfig: GridConfigSchema.optional(),
		position: FreePositionChildSchema.optional(),
		fields: z.array(FieldSchema),
		cards: z.array(CardSchema),
		children: z.array(SectionSchema),
	}),
);

// ── Page ───────────────────────────────────────────────────────────

export const PageSchema = z.object({
	id: z.string().min(1),
	name: z.string().optional(),
	sections: z.array(SectionSchema),
});
export type Page = z.infer<typeof PageSchema>;

// ── Canvas Size ────────────────────────────────────────────────────

export const CanvasSizeSchema = z.object({
	width: z.number().positive(),
	height: z.number().positive(),
});

// ── Template (root) ────────────────────────────────────────────────

export const TemplateSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	canvasSize: z.record(z.string(), CanvasSizeSchema).optional(),
	pages: z.array(PageSchema).min(1),
});
export type Template = z.infer<typeof TemplateSchema>;
