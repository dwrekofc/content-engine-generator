import type { BrandTheme } from "../schemas/brand-theme";
import type { Content, ContentCard, ContentSection, FieldValue } from "../schemas/content-schema";
import type { Card, Field, Page, Section, Template } from "../schemas/template-schema";
import { sectionOverrideToCSS, themeToCSS } from "../themes/theme-to-css";

/** Options for the HTML renderer */
export interface RenderHTMLOptions {
	/** Canvas format key to look up in template.canvasSize (e.g. "html", "pdf") */
	format?: string;
	/** Override canvas width in px */
	canvasWidth?: number;
	/** Override canvas height in px */
	canvasHeight?: number;
}

/** Default canvas dimensions when no canvasSize is specified */
const DEFAULT_CANVAS_WIDTH = 1280;
const DEFAULT_CANVAS_HEIGHT = 720;

/**
 * Renders a template + theme + content into a complete HTML document string.
 *
 * Uses native CSS grid/flex — does NOT consume layout engine positions.
 * This is the reference implementation for visual correctness.
 * PDF generation consumes this output via Playwright.
 */
export function renderHTML(
	template: Template,
	theme: BrandTheme,
	content: Content,
	options: RenderHTMLOptions = {},
): string {
	const canvasSize = resolveCanvasSize(template, options);
	const cssVars = themeToCSS(theme);
	const cssVarString = cssVarsToString(cssVars);

	const pagesHTML = template.pages
		.map((page, i) => {
			const contentPage = content.pages[i];
			return renderPage(page, theme, contentPage, canvasSize);
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(template.name)}</title>
<style>
:root {
${cssVarString}
}
${getBaseStyles(canvasSize)}
</style>
</head>
<body>
<div class="ce-document">
${pagesHTML}
</div>
</body>
</html>`;
}

/**
 * Renders just the body content (pages) without the full HTML document wrapper.
 * Useful for embedding in an existing page or for hot-reload scenarios.
 */
export function renderHTMLFragment(
	template: Template,
	theme: BrandTheme,
	content: Content,
	options: RenderHTMLOptions = {},
): string {
	const canvasSize = resolveCanvasSize(template, options);

	return template.pages
		.map((page, i) => {
			const contentPage = content.pages[i];
			return renderPage(page, theme, contentPage, canvasSize);
		})
		.join("\n");
}

// ── Canvas size resolution ──────────────────────────────────────────

function resolveCanvasSize(
	template: Template,
	options: RenderHTMLOptions,
): { width: number; height: number } {
	if (options.canvasWidth && options.canvasHeight) {
		return { width: options.canvasWidth, height: options.canvasHeight };
	}
	const format = options.format ?? "html";
	if (template.canvasSize?.[format]) {
		return template.canvasSize[format];
	}
	return { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT };
}

// ── Base styles ─────────────────────────────────────────────────────

function getBaseStyles(canvasSize: { width: number; height: number }): string {
	return `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-body-family, sans-serif);
  font-size: var(--font-body-size, 16px);
  font-weight: var(--font-body-weight, 400);
  line-height: var(--font-body-line-height, 1.6);
  color: var(--color-text, #111827);
  background: #f0f0f0;
}
.ce-document {
  width: ${canvasSize.width}px;
  margin: 0 auto;
}
.ce-page {
  width: ${canvasSize.width}px;
  height: ${canvasSize.height}px;
  background: var(--color-background, #ffffff);
  position: relative;
  overflow: visible;
}
.ce-page + .ce-page {
  margin-top: 32px;
  border-top: 4px solid var(--color-accent, #f59e0b);
}
.ce-section {
  padding: var(--spacing-padding, 24px);
  position: relative;
}
.ce-section--block {
  display: block;
}
.ce-section--flex {
  display: flex;
}
.ce-section--grid {
  display: grid;
}
.ce-section--stack {
  position: relative;
}
.ce-section--stack > * {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
.ce-section--stack > .ce-field--background {
  z-index: 0;
}
.ce-section--stack > *:not(.ce-field--background) {
  z-index: 1;
  position: relative;
}
.ce-section--free-position {
  position: relative;
}
.ce-section--free-position > .ce-free-child {
  position: absolute;
}
.ce-card {
  padding: var(--spacing-padding, 24px);
}
.ce-field--title {
  font-family: var(--font-heading-family, sans-serif);
  font-size: var(--font-heading-size, 36px);
  font-weight: var(--font-heading-weight, 700);
  line-height: var(--font-heading-line-height, 1.2);
  color: var(--color-text);
}
.ce-field--subtitle {
  font-family: var(--font-subheading-family, sans-serif);
  font-size: var(--font-subheading-size, 24px);
  font-weight: var(--font-subheading-weight, 600);
  line-height: var(--font-subheading-line-height, 1.3);
  color: var(--color-text);
}
.ce-field--paragraph {
  font-family: var(--font-body-family, sans-serif);
  font-size: var(--font-body-size, 16px);
  font-weight: var(--font-body-weight, 400);
  line-height: var(--font-body-line-height, 1.6);
  color: var(--color-text);
}
.ce-field--button {
  display: inline-block;
  padding: var(--button-padding-y, 12px) var(--button-padding-x, 24px);
  background: var(--button-fill, var(--color-primary));
  color: var(--button-text-color, #ffffff);
  border: var(--button-border, none);
  border-radius: var(--button-border-radius, 8px);
  font-family: var(--font-button-text-family, var(--font-body-family, sans-serif));
  font-size: var(--font-button-text-size, 14px);
  font-weight: var(--font-button-text-weight, 600);
  text-decoration: none;
  cursor: pointer;
}
.ce-field--featured-content img {
  max-width: 100%;
  height: auto;
  display: block;
}
.ce-field--featured-content-caption {
  font-family: var(--font-caption-family, var(--font-body-family, sans-serif));
  font-size: var(--font-caption-size, 12px);
  font-weight: var(--font-caption-weight, 400);
  line-height: var(--font-caption-line-height, 1.4);
  color: var(--color-secondary, #6b7280);
}
`;
}

// ── Page rendering ──────────────────────────────────────────────────

function renderPage(
	page: Page,
	theme: BrandTheme,
	contentPage: Content["pages"][number] | undefined,
	_canvasSize: { width: number; height: number },
): string {
	const sectionsHTML = page.sections
		.map((section) => {
			const contentSection = contentPage?.sections.find((cs) => cs.sectionId === section.id);
			return renderSection(section, theme, contentSection);
		})
		.join("\n");

	return `<div class="ce-page" data-page-id="${escapeAttr(page.id)}"${page.name ? ` data-page-name="${escapeAttr(page.name)}"` : ""}>
${sectionsHTML}
</div>`;
}

// ── Section rendering ───────────────────────────────────────────────

function renderSection(
	section: Section,
	theme: BrandTheme,
	contentSection: ContentSection | undefined,
): string {
	const layoutClass = getLayoutClass(section.layout);
	const inlineStyle = buildSectionStyle(section, theme);
	const overrideStyle = buildSectionOverrideStyle(section, theme);

	// Gather all renderable items: background fields first, then other fields, cards, children
	const bgFields = section.fields.filter((f) => f.type === "background");
	const nonBgFields = section.fields.filter((f) => f.type !== "background");

	let innerHTML = "";

	// Background fields rendered first (for stack layering)
	for (const field of bgFields) {
		const value = contentSection?.fields[field.id];
		innerHTML += renderField(field, value);
	}

	// Non-background fields
	for (const field of nonBgFields) {
		const value = contentSection?.fields[field.id];
		innerHTML += renderField(field, value);
	}

	// Cards (for grid sections)
	for (const card of section.cards) {
		const contentCard = contentSection?.cards.find((cc) => cc.cardId === card.id);
		innerHTML += renderCard(card, contentCard);
	}

	// Child sections (recursive)
	for (const child of section.children) {
		const contentChild = contentSection?.children.find((cc) => cc.sectionId === child.id);
		const childHTML = renderSection(child, theme, contentChild);

		// For free-position, wrap children with absolute positioning
		if (section.layout === "free-position" && child.position) {
			const pos = child.position;
			innerHTML += `<div class="ce-free-child" style="left: ${pos.x}px; top: ${pos.y}px; width: ${pos.width}px; height: ${pos.height}px;">
${childHTML}
</div>`;
		} else {
			innerHTML += childHTML;
		}
	}

	const style = [inlineStyle, overrideStyle].filter(Boolean).join(" ");

	return `<div class="ce-section ${layoutClass}" data-section-id="${escapeAttr(section.id)}"${section.name ? ` data-section-name="${escapeAttr(section.name)}"` : ""}${style ? ` style="${escapeAttr(style)}"` : ""}>
${innerHTML}
</div>`;
}

function getLayoutClass(layout: string): string {
	switch (layout) {
		case "flex":
			return "ce-section--flex";
		case "grid":
			return "ce-section--grid";
		case "stack":
			return "ce-section--stack";
		case "free-position":
			return "ce-section--free-position";
		default:
			return "ce-section--block";
	}
}

function buildSectionStyle(section: Section, _theme: BrandTheme): string {
	const parts: string[] = [];

	if (section.layout === "flex" && section.flexConfig) {
		const fc = section.flexConfig;
		parts.push(`flex-direction: ${fc.direction}`);
		if (fc.gap !== undefined) parts.push(`gap: ${fc.gap}px`);
		if (fc.align) {
			parts.push(`align-items: ${mapAlign(fc.align)}`);
		}
		if (fc.wrap) parts.push("flex-wrap: wrap");
	}

	if (section.layout === "grid" && section.gridConfig) {
		const gc = section.gridConfig;
		const colTemplate = gc.columnSizes
			? gc.columnSizes.map((s) => `${s}fr`).join(" ")
			: `repeat(${gc.columns}, 1fr)`;
		const rowTemplate = gc.rowSizes
			? gc.rowSizes.map((s) => `${s}fr`).join(" ")
			: `repeat(${gc.rows}, 1fr)`;
		parts.push(`grid-template-columns: ${colTemplate}`);
		parts.push(`grid-template-rows: ${rowTemplate}`);
		if (gc.gap !== undefined) parts.push(`gap: ${gc.gap}px`);
	}

	if (section.layout === "free-position") {
		// Container needs a minimum height for absolute children
		let maxBottom = 0;
		for (const child of section.children) {
			if (child.position) {
				const bottom = child.position.y + child.position.height;
				if (bottom > maxBottom) maxBottom = bottom;
			}
		}
		if (maxBottom > 0) {
			parts.push(`min-height: ${maxBottom + 20}px`);
		}
	}

	return parts.length > 0 ? `${parts.join("; ")};` : "";
}

function buildSectionOverrideStyle(section: Section, theme: BrandTheme): string {
	if (!section.name || !theme.sectionOverrides?.[section.name]) {
		return "";
	}

	const override = theme.sectionOverrides[section.name];
	const overrideVars = sectionOverrideToCSS(override);
	const parts = Object.entries(overrideVars).map(([key, val]) => `${key}: ${val}`);

	// Apply background color from override
	if (override.colors?.background) {
		parts.push(`background-color: ${override.colors.background}`);
	}
	// Apply text color from override
	if (override.colors?.text) {
		parts.push(`color: ${override.colors.text}`);
	}

	return parts.length > 0 ? `${parts.join("; ")};` : "";
}

function mapAlign(align: string): string {
	switch (align) {
		case "start":
			return "flex-start";
		case "end":
			return "flex-end";
		case "center":
			return "center";
		case "stretch":
			return "stretch";
		default:
			return "stretch";
	}
}

// ── Field rendering ─────────────────────────────────────────────────

function renderField(field: Field, value: FieldValue | undefined): string {
	if (!value) {
		// Render empty placeholder for the field slot
		return `<div class="ce-field ce-field--${field.type} ce-field--empty" data-field-id="${escapeAttr(field.id)}" data-field-type="${escapeAttr(field.type)}"></div>\n`;
	}

	switch (value.type) {
		case "title":
			return `<h1 class="ce-field ce-field--title" data-field-id="${escapeAttr(field.id)}">${escapeHTML(value.text)}</h1>\n`;

		case "subtitle":
			return `<h2 class="ce-field ce-field--subtitle" data-field-id="${escapeAttr(field.id)}">${escapeHTML(value.text)}</h2>\n`;

		case "paragraph":
			return `<p class="ce-field ce-field--paragraph" data-field-id="${escapeAttr(field.id)}">${escapeHTML(value.text)}</p>\n`;

		case "button":
			return `<a class="ce-field ce-field--button" data-field-id="${escapeAttr(field.id)}" href="${escapeAttr(value.url)}">${escapeHTML(value.text)}</a>\n`;

		case "featured-content":
			return `<div class="ce-field ce-field--featured-content" data-field-id="${escapeAttr(field.id)}"><img src="${escapeAttr(value.src)}"${value.alt ? ` alt="${escapeAttr(value.alt)}"` : ""} /></div>\n`;

		case "featured-content-caption":
			return `<figure class="ce-field ce-field--featured-content-caption" data-field-id="${escapeAttr(field.id)}"><figcaption>${escapeHTML(value.text)}</figcaption></figure>\n`;

		case "background": {
			const bg = value.value;
			// Detect if it's a gradient, image URL, or plain color
			let bgStyle: string;
			if (bg.startsWith("linear-gradient") || bg.startsWith("radial-gradient")) {
				bgStyle = `background: ${bg};`;
			} else if (bg.startsWith("url(") || bg.startsWith("http") || bg.startsWith("/")) {
				const url = bg.startsWith("url(") ? bg : `url(${bg})`;
				bgStyle = `background: ${url} center/cover no-repeat;`;
			} else {
				bgStyle = `background-color: ${bg};`;
			}
			return `<div class="ce-field ce-field--background" data-field-id="${escapeAttr(field.id)}" style="${escapeAttr(bgStyle)}"></div>\n`;
		}

		default:
			return "";
	}
}

// ── Card rendering ──────────────────────────────────────────────────

function renderCard(card: Card, contentCard: ContentCard | undefined): string {
	let fieldsHTML = "";
	for (const field of card.fields) {
		const value = contentCard?.fields[field.id];
		fieldsHTML += renderField(field as Field, value);
	}

	return `<div class="ce-card" data-card-id="${escapeAttr(card.id)}">
${fieldsHTML}
</div>`;
}

// ── HTML escaping ───────────────────────────────────────────────────

function escapeHTML(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function escapeAttr(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function cssVarsToString(vars: Record<string, string>): string {
	return Object.entries(vars)
		.map(([key, val]) => `  ${key}: ${val};`)
		.join("\n");
}
