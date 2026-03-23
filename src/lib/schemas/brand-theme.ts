import { z } from "zod";

// ── Typography Tokens ──────────────────────────────────────────────

export const TypographyStyleSchema = z.object({
	fontFamily: z.string().min(1),
	fontSize: z.number().positive(),
	fontWeight: z.union([z.number(), z.string()]),
	lineHeight: z.number().positive().optional(),
	letterSpacing: z.number().optional(),
});
export type TypographyStyle = z.infer<typeof TypographyStyleSchema>;

export const TypographyTokensSchema = z.object({
	heading: TypographyStyleSchema,
	subheading: TypographyStyleSchema,
	body: TypographyStyleSchema,
	caption: TypographyStyleSchema.optional(),
	button: TypographyStyleSchema.optional(),
});
export type TypographyTokens = z.infer<typeof TypographyTokensSchema>;

// ── Color Tokens ───────────────────────────────────────────────────

export const ColorTokensSchema = z.object({
	primary: z.string().min(1),
	secondary: z.string().min(1),
	background: z.string().min(1),
	text: z.string().min(1),
	accent: z.string().min(1),
});
export type ColorTokens = z.infer<typeof ColorTokensSchema>;

// ── Spacing Tokens ─────────────────────────────────────────────────

export const SpacingTokensSchema = z.object({
	padding: z.number().nonnegative(),
	margin: z.number().nonnegative(),
	gap: z.number().nonnegative(),
});
export type SpacingTokens = z.infer<typeof SpacingTokensSchema>;

// ── Button Style Tokens ────────────────────────────────────────────

export const ButtonStyleSchema = z.object({
	borderRadius: z.number().nonnegative().optional(),
	paddingX: z.number().nonnegative().optional(),
	paddingY: z.number().nonnegative().optional(),
	fill: z.string().optional(),
	border: z.string().optional(),
	textColor: z.string().optional(),
});
export type ButtonStyle = z.infer<typeof ButtonStyleSchema>;

// ── Section Override ───────────────────────────────────────────────
// Named per-section style overrides that inherit from globals.
// Only overridden properties change; everything else falls through.

export const SectionOverrideSchema = z.object({
	typography: TypographyTokensSchema.partial().optional(),
	colors: ColorTokensSchema.partial().optional(),
	spacing: SpacingTokensSchema.partial().optional(),
	button: ButtonStyleSchema.optional(),
});
export type SectionOverride = z.infer<typeof SectionOverrideSchema>;

// ── Brand Theme (root) ─────────────────────────────────────────────

export const BrandThemeSchema = z.object({
	name: z.string().min(1),
	brandName: z.string().optional(),
	version: z.string().optional(),
	typography: TypographyTokensSchema,
	colors: ColorTokensSchema,
	spacing: SpacingTokensSchema,
	button: ButtonStyleSchema.optional(),
	sectionOverrides: z.record(z.string(), SectionOverrideSchema).optional(),
});
export type BrandTheme = z.infer<typeof BrandThemeSchema>;
