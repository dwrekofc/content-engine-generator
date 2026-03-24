import { existsSync } from "node:fs";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { type RenderHTMLOptions, renderHTML } from "../renderers/html-renderer";
import type { BrandTheme } from "../schemas/brand-theme";
import type { Content, ContentSection, FieldValue } from "../schemas/content-schema";
import type { Template } from "../schemas/template-schema";

/** Options for the HTML static site generator */
export interface GenerateHTMLStaticOptions {
	/** Absolute path to the output directory */
	outputDir: string;
	/** Canvas format key (e.g. "html", "pdf") */
	format?: string;
	/** Override canvas width in px */
	canvasWidth?: number;
	/** Override canvas height in px */
	canvasHeight?: number;
}

/** Result of static site generation */
export interface GenerateHTMLStaticResult {
	/** Absolute path to the output directory */
	outputDir: string;
	/** List of generated file paths relative to outputDir */
	files: string[];
}

/**
 * Generates a deployable static HTML site from template + theme + content.
 *
 * Single-page templates produce a single `index.html`.
 * Multi-page templates produce separate HTML files with inter-page navigation.
 * All CSS is inlined. Referenced assets are copied to an `assets/` subdirectory.
 * Output is self-contained — no external dependencies, no JS, no build step.
 */
export async function generateHTMLStatic(
	template: Template,
	theme: BrandTheme,
	content: Content,
	options: GenerateHTMLStaticOptions,
): Promise<GenerateHTMLStaticResult> {
	const outputDir = resolve(options.outputDir);
	await mkdir(outputDir, { recursive: true });

	const renderOptions: RenderHTMLOptions = {
		format: options.format,
		canvasWidth: options.canvasWidth,
		canvasHeight: options.canvasHeight,
	};

	const files: string[] = [];

	if (template.pages.length <= 1) {
		// Single-page: render full document as index.html
		const html = renderHTML(template, theme, content, renderOptions);
		await writeFile(join(outputDir, "index.html"), html, "utf-8");
		files.push("index.html");
	} else {
		// Multi-page: each page gets its own file, with inter-page navigation
		const pageFiles = template.pages.map((page, i) => ({
			filename: i === 0 ? "index.html" : `${slugify(page.name || `page-${i + 1}`)}.html`,
			page,
			index: i,
		}));

		for (const { filename, page, index } of pageFiles) {
			// Build a single-page template containing only this page
			const singlePageTemplate: Template = {
				...template,
				pages: [page],
			};
			const singlePageContent: Content = {
				...content,
				pages: content.pages[index] ? [content.pages[index]] : [],
			};

			let html = renderHTML(singlePageTemplate, theme, singlePageContent, renderOptions);

			// Inject navigation before closing </body>
			const nav = buildNavigation(pageFiles, index);
			html = html.replace("</body>", `${nav}\n</body>`);

			await writeFile(join(outputDir, filename), html, "utf-8");
			files.push(filename);
		}
	}

	// Collect and copy referenced assets
	const assetPaths = collectAssetPaths(content);
	if (assetPaths.length > 0) {
		const assetsDir = join(outputDir, "assets");
		await mkdir(assetsDir, { recursive: true });

		for (const assetPath of assetPaths) {
			const resolved = resolve(assetPath);
			if (existsSync(resolved)) {
				const destName = basename(resolved);
				await cp(resolved, join(assetsDir, destName));
				if (!files.includes(`assets/${destName}`)) {
					files.push(`assets/${destName}`);
				}
			}
		}
	}

	return { outputDir, files };
}

// ── Navigation ──────────────────────────────────────────────────────

function buildNavigation(
	pageFiles: { filename: string; page: { name?: string }; index: number }[],
	currentIndex: number,
): string {
	const links = pageFiles
		.map(({ filename, page, index }) => {
			const label = page.name || `Page ${index + 1}`;
			if (index === currentIndex) {
				return `<span class="ce-nav-current">${escapeHTML(label)}</span>`;
			}
			return `<a href="${escapeAttr(filename)}">${escapeHTML(label)}</a>`;
		})
		.join("\n    ");

	return `<nav class="ce-nav" style="display: flex; gap: 16px; justify-content: center; padding: 24px; font-family: sans-serif; font-size: 14px;">
    ${links}
  </nav>
  <style>
  .ce-nav a { color: var(--color-primary, #1a56db); text-decoration: none; }
  .ce-nav a:hover { text-decoration: underline; }
  .ce-nav-current { font-weight: 700; color: var(--color-text, #111827); }
  </style>`;
}

// ── Asset collection ────────────────────────────────────────────────

function collectAssetPaths(content: Content): string[] {
	const paths: string[] = [];

	for (const page of content.pages) {
		for (const section of page.sections) {
			collectFromSection(section, paths);
		}
	}

	return [...new Set(paths)];
}

function collectFromSection(section: ContentSection, paths: string[]): void {
	for (const value of Object.values(section.fields)) {
		collectFromFieldValue(value as FieldValue, paths);
	}
	if (section.cards) {
		for (const card of section.cards) {
			for (const value of Object.values(card.fields)) {
				collectFromFieldValue(value as FieldValue, paths);
			}
		}
	}
	if (section.children) {
		for (const child of section.children) {
			collectFromSection(child, paths);
		}
	}
}

function collectFromFieldValue(value: FieldValue, paths: string[]): void {
	if (value.type === "featured-content" && value.src) {
		collectLocalPath(value.src, paths);
	}
	if (value.type === "background" && value.value) {
		// Extract local image paths from background values like "url(/assets/bg.jpg)"
		const urlMatch = value.value.match(/url\(["']?([^"')]+)["']?\)/);
		if (urlMatch?.[1]) {
			collectLocalPath(urlMatch[1], paths);
		}
	}
}

function collectLocalPath(src: string, paths: string[]): void {
	if (!src.startsWith("data:") && !src.startsWith("http://") && !src.startsWith("https://")) {
		paths.push(src);
	}
}

// ── Helpers ─────────────────────────────────────────────────────────

function slugify(str: string): string {
	return str
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

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
