import PptxGenJS from "pptxgenjs";
import { computeLayout } from "../layout-engine/core";
import type { CanvasSize, PositionedElement } from "../layout-engine/types";
import type {
	BrandTheme,
	ButtonStyle,
	SectionOverride,
	TypographyStyle,
} from "../schemas/brand-theme";
import type { Content, ContentCard, ContentSection, FieldValue } from "../schemas/content-schema";
import type { Card, Field, Section, Template } from "../schemas/template-schema";

// ── Constants ──────────────────────────────────────────────────────

/** Default PPTX slide dimensions in inches (standard 4:3 widescreen) */
const PPTX_SLIDE_WIDTH = 10;
const PPTX_SLIDE_HEIGHT = 7.5;

/**
 * Default layout engine canvas for PPTX when template doesn't specify one.
 * Uses 96 DPI equivalent of 10×7.5 inches so layout engine constants
 * (DEFAULT_FIELD_HEIGHT=40, DEFAULT_SECTION_PADDING=20) produce reasonable proportions.
 */
const PPTX_DEFAULT_CANVAS: CanvasSize = { width: 960, height: 720 };

/** Conversion factor: CSS px → PowerPoint pt (72/96) */
const PX_TO_PT = 0.75;

// ── Public API ─────────────────────────────────────────────────────

export interface GeneratePPTXOptions {
	/** Slide width in inches (default: 10) */
	slideWidth?: number;
	/** Slide height in inches (default: 7.5) */
	slideHeight?: number;
}

export interface GeneratePPTXResult {
	/** PPTX file as a binary buffer */
	buffer: Uint8Array;
	/** Number of slides generated */
	slideCount: number;
}

/**
 * Generates a PowerPoint (.pptx) file from template + theme + content.
 *
 * Uses the layout engine to compute absolute positions, then places
 * shapes at those coordinates via PptxGenJS. This is the hero output —
 * the hardest format target. If the engine nails PPTX, everything else follows.
 */
export async function generatePPTX(
	template: Template,
	theme: BrandTheme,
	content: Content,
	options: GeneratePPTXOptions = {},
): Promise<GeneratePPTXResult> {
	const slideWidth = options.slideWidth ?? PPTX_SLIDE_WIDTH;
	const slideHeight = options.slideHeight ?? PPTX_SLIDE_HEIGHT;

	// Canvas for layout engine — use template-defined or sensible default
	const canvas: CanvasSize = template.canvasSize?.pptx ?? PPTX_DEFAULT_CANVAS;

	// Compute layout positions in canvas coordinates
	const elements = computeLayout(template, canvas);

	// Build position lookup: id → PositionedElement
	const posMap = new Map<string, PositionedElement>();
	for (const el of elements) {
		posMap.set(el.id, el);
	}

	// Scale factors: canvas coords → inches
	const scaleX = slideWidth / canvas.width;
	const scaleY = slideHeight / canvas.height;

	// Create presentation
	const pptx = new PptxGenJS();
	pptx.defineLayout({ name: "CUSTOM", width: slideWidth, height: slideHeight });
	pptx.layout = "CUSTOM";

	// Generate slides from pages
	for (let i = 0; i < template.pages.length; i++) {
		const page = template.pages[i];
		const contentPage = content.pages[i];
		const slide = pptx.addSlide();

		for (const section of page.sections) {
			const contentSection = contentPage?.sections.find((cs) => cs.sectionId === section.id);
			renderSectionToSlide(slide, section, contentSection, theme, posMap, scaleX, scaleY);
		}
	}

	const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Uint8Array;
	return { buffer, slideCount: template.pages.length };
}

// ── Theme Resolution ───────────────────────────────────────────────

interface ResolvedTheme {
	typography: {
		heading: TypographyStyle;
		subheading: TypographyStyle;
		body: TypographyStyle;
		caption?: TypographyStyle;
		button?: TypographyStyle;
	};
	colors: {
		primary: string;
		secondary: string;
		background: string;
		text: string;
		accent: string;
	};
	button?: ButtonStyle;
}

function resolveThemeForSection(section: Section, theme: BrandTheme): ResolvedTheme {
	const base: ResolvedTheme = {
		typography: { ...theme.typography },
		colors: { ...theme.colors },
		button: theme.button ? { ...theme.button } : undefined,
	};

	if (!section.name || !theme.sectionOverrides?.[section.name]) {
		return base;
	}

	const override = theme.sectionOverrides[section.name];
	return mergeOverride(base, override);
}

function mergeOverride(base: ResolvedTheme, override: SectionOverride): ResolvedTheme {
	const result = { ...base };

	if (override.colors) {
		result.colors = { ...base.colors, ...override.colors };
	}

	if (override.typography) {
		result.typography = { ...base.typography };
		if (override.typography.heading) {
			result.typography.heading = { ...base.typography.heading, ...override.typography.heading };
		}
		if (override.typography.subheading) {
			result.typography.subheading = {
				...base.typography.subheading,
				...override.typography.subheading,
			};
		}
		if (override.typography.body) {
			result.typography.body = { ...base.typography.body, ...override.typography.body };
		}
		if (override.typography.caption) {
			result.typography.caption = {
				...(base.typography.caption ?? base.typography.body),
				...override.typography.caption,
			};
		}
		if (override.typography.button) {
			result.typography.button = {
				...(base.typography.button ?? base.typography.body),
				...override.typography.button,
			};
		}
	}

	if (override.button) {
		result.button = { ...(base.button ?? {}), ...override.button };
	}

	return result;
}

// ── Section Rendering ──────────────────────────────────────────────

function renderSectionToSlide(
	slide: PptxGenJS.Slide,
	section: Section,
	contentSection: ContentSection | undefined,
	theme: BrandTheme,
	posMap: Map<string, PositionedElement>,
	scaleX: number,
	scaleY: number,
): void {
	const resolved = resolveThemeForSection(section, theme);

	// Render section background (from theme override)
	const sectionPos = posMap.get(section.id);
	if (sectionPos && section.name && theme.sectionOverrides?.[section.name]?.colors?.background) {
		const bgColor = theme.sectionOverrides[section.name].colors?.background;
		if (bgColor) {
			slide.addShape("rect", {
				x: sectionPos.x * scaleX,
				y: sectionPos.y * scaleY,
				w: sectionPos.width * scaleX,
				h: sectionPos.height * scaleY,
				fill: { color: stripHash(bgColor) },
			});
		}
	}

	// Background fields first (for correct z-ordering)
	const bgFields = section.fields.filter((f) => f.type === "background");
	const nonBgFields = section.fields.filter((f) => f.type !== "background");

	for (const field of bgFields) {
		const value = contentSection?.fields[field.id];
		renderFieldToSlide(slide, field, value, resolved, posMap, scaleX, scaleY);
	}

	for (const field of nonBgFields) {
		const value = contentSection?.fields[field.id];
		renderFieldToSlide(slide, field, value, resolved, posMap, scaleX, scaleY);
	}

	// Cards
	for (const card of section.cards) {
		const contentCard = contentSection?.cards.find((cc) => cc.cardId === card.id);
		renderCardToSlide(slide, card, contentCard, resolved, posMap, scaleX, scaleY);
	}

	// Child sections (recursive)
	for (const child of section.children) {
		const contentChild = contentSection?.children.find((cc) => cc.sectionId === child.id);
		renderSectionToSlide(slide, child, contentChild, theme, posMap, scaleX, scaleY);
	}
}

// ── Field Rendering ────────────────────────────────────────────────

function renderFieldToSlide(
	slide: PptxGenJS.Slide,
	field: Field,
	value: FieldValue | undefined,
	theme: ResolvedTheme,
	posMap: Map<string, PositionedElement>,
	scaleX: number,
	scaleY: number,
): void {
	const pos = posMap.get(field.id);
	if (!pos || !value) return;

	const box = toInches(pos, scaleX, scaleY);

	switch (value.type) {
		case "title":
			addTextBox(slide, value.text, box, theme.typography.heading, theme.colors.text);
			break;

		case "subtitle":
			addTextBox(slide, value.text, box, theme.typography.subheading, theme.colors.text);
			break;

		case "paragraph":
			addTextBox(slide, value.text, box, theme.typography.body, theme.colors.text);
			break;

		case "button":
			addButton(slide, value.text, value.url, box, theme);
			break;

		case "featured-content":
			addImage(slide, value.src, value.alt, box);
			break;

		case "featured-content-caption":
			addTextBox(
				slide,
				value.text,
				box,
				theme.typography.caption ?? theme.typography.body,
				theme.colors.secondary,
			);
			break;

		case "background":
			addBackground(slide, value.value, box);
			break;
	}
}

// ── Card Rendering ─────────────────────────────────────────────────

function renderCardToSlide(
	slide: PptxGenJS.Slide,
	card: Card,
	contentCard: ContentCard | undefined,
	theme: ResolvedTheme,
	posMap: Map<string, PositionedElement>,
	scaleX: number,
	scaleY: number,
): void {
	const cardPos = posMap.get(card.id);
	if (!cardPos) return;

	// Card background/border
	const box = toInches(cardPos, scaleX, scaleY);
	slide.addShape("rect", {
		x: box.x,
		y: box.y,
		w: box.w,
		h: box.h,
		fill: { color: stripHash(theme.colors.background) },
		line: { color: stripHash(theme.colors.secondary), width: 0.5 },
	});

	// Card fields
	for (const field of card.fields) {
		const value = contentCard?.fields[field.id];
		const fieldPos = posMap.get(field.id);
		if (!fieldPos || !value) continue;

		const fieldBox = toInches(fieldPos, scaleX, scaleY);

		switch (value.type) {
			case "title":
				addTextBox(slide, value.text, fieldBox, theme.typography.heading, theme.colors.text);
				break;
			case "subtitle":
				addTextBox(slide, value.text, fieldBox, theme.typography.subheading, theme.colors.text);
				break;
			case "paragraph":
				addTextBox(slide, value.text, fieldBox, theme.typography.body, theme.colors.text);
				break;
			case "button":
				addButton(slide, value.text, value.url, fieldBox, theme);
				break;
			case "featured-content":
				addImage(slide, value.src, value.alt, fieldBox);
				break;
			case "background":
				addBackground(slide, value.value, fieldBox);
				break;
		}
	}
}

// ── Shape Helpers ──────────────────────────────────────────────────

interface InchBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

function toInches(pos: PositionedElement, scaleX: number, scaleY: number): InchBox {
	return {
		x: pos.x * scaleX,
		y: pos.y * scaleY,
		w: pos.width * scaleX,
		h: pos.height * scaleY,
	};
}

function addTextBox(
	slide: PptxGenJS.Slide,
	text: string,
	box: InchBox,
	typo: TypographyStyle,
	color: string,
): void {
	slide.addText(text, {
		x: box.x,
		y: box.y,
		w: box.w,
		h: box.h,
		fontSize: typo.fontSize * PX_TO_PT,
		fontFace: cleanFontFace(typo.fontFamily),
		color: stripHash(color),
		bold: isBold(typo.fontWeight),
		valign: "top",
		wrap: true,
		margin: 0,
	});
}

function addButton(
	slide: PptxGenJS.Slide,
	text: string,
	url: string,
	box: InchBox,
	theme: ResolvedTheme,
): void {
	const btnStyle = theme.button;
	const typo = theme.typography.button ?? theme.typography.body;
	const fillColor = btnStyle?.fill ?? theme.colors.primary;
	const textColor = btnStyle?.textColor ?? "#ffffff";
	const borderRadius = btnStyle?.borderRadius
		? Math.min(btnStyle.borderRadius * PX_TO_PT * (1 / 72), 1)
		: 0.1;

	slide.addText(text, {
		x: box.x,
		y: box.y,
		w: box.w,
		h: box.h,
		fontSize: typo.fontSize * PX_TO_PT,
		fontFace: cleanFontFace(typo.fontFamily),
		color: stripHash(textColor),
		bold: isBold(typo.fontWeight),
		fill: { color: stripHash(fillColor) },
		align: "center",
		valign: "middle",
		shape: "roundRect",
		rectRadius: borderRadius,
		hyperlink: { url },
		margin: 0,
	});
}

function addImage(
	slide: PptxGenJS.Slide,
	src: string,
	alt: string | undefined,
	box: InchBox,
): void {
	// PptxGenJS needs either a file path, URL, or base64 data
	// For URLs and local paths, use the path property
	if (src.startsWith("data:")) {
		slide.addImage({
			data: src,
			x: box.x,
			y: box.y,
			w: box.w,
			h: box.h,
			altText: alt,
		});
	} else {
		// Use a placeholder rectangle for non-resolvable paths
		// (local paths like /assets/icon.svg won't resolve in PPTX generation)
		slide.addShape("rect", {
			x: box.x,
			y: box.y,
			w: box.w,
			h: box.h,
			fill: { color: "E5E7EB" },
			line: { color: "9CA3AF", width: 0.5 },
		});
		// Add alt text or filename as label
		const label = alt ?? src.split("/").pop() ?? "Image";
		slide.addText(label, {
			x: box.x,
			y: box.y,
			w: box.w,
			h: box.h,
			fontSize: 10,
			fontFace: "Arial",
			color: "6B7280",
			align: "center",
			valign: "middle",
			margin: 0,
		});
	}
}

function addBackground(slide: PptxGenJS.Slide, value: string, box: InchBox): void {
	if (value.startsWith("linear-gradient") || value.startsWith("radial-gradient")) {
		// PptxGenJS typed API doesn't expose gradient fills — use first color as fallback
		const firstColor = extractFirstColorFromGradient(value);
		slide.addShape("rect", {
			x: box.x,
			y: box.y,
			w: box.w,
			h: box.h,
			fill: { color: stripHash(firstColor) },
		});
	} else if (value.startsWith("url(") || value.startsWith("http") || value.startsWith("/")) {
		// Image background — placeholder for non-resolvable paths
		slide.addShape("rect", {
			x: box.x,
			y: box.y,
			w: box.w,
			h: box.h,
			fill: { color: "E5E7EB" },
		});
	} else {
		// Solid color
		slide.addShape("rect", {
			x: box.x,
			y: box.y,
			w: box.w,
			h: box.h,
			fill: { color: stripHash(value) },
		});
	}
}

// ── Utility Functions ──────────────────────────────────────────────

/** Strip '#' prefix from hex color for PptxGenJS (expects bare hex) */
function stripHash(hex: string): string {
	return hex.startsWith("#") ? hex.slice(1) : hex;
}

/** Extract first hex color from a CSS gradient string */
function extractFirstColorFromGradient(gradient: string): string {
	// Match hex colors (#RGB, #RRGGBB, #RRGGBBAA)
	const hexMatch = gradient.match(/#[0-9a-fA-F]{3,8}/);
	if (hexMatch) return hexMatch[0];

	// Match rgb/rgba
	const rgbMatch = gradient.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
	if (rgbMatch) {
		const r = Number.parseInt(rgbMatch[1], 10).toString(16).padStart(2, "0");
		const g = Number.parseInt(rgbMatch[2], 10).toString(16).padStart(2, "0");
		const b = Number.parseInt(rgbMatch[3], 10).toString(16).padStart(2, "0");
		return `#${r}${g}${b}`;
	}

	// Fallback
	return "#808080";
}

/** Remove CSS font stack fallbacks — PptxGenJS only accepts a single font name */
function cleanFontFace(fontFamily: string): string {
	// Take the first font from a CSS font stack like "Inter, sans-serif"
	const first = fontFamily.split(",")[0].trim();
	// Remove quotes if present
	return first.replace(/^["']|["']$/g, "");
}

/** Determine if a font weight value represents bold */
function isBold(weight: number | string): boolean {
	if (typeof weight === "number") return weight >= 600;
	return weight === "bold" || weight === "bolder";
}
