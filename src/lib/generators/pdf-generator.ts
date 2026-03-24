import { chromium } from "playwright";
import { type RenderHTMLOptions, renderHTML } from "../renderers/html-renderer";
import type { BrandTheme } from "../schemas/brand-theme";
import type { Content } from "../schemas/content-schema";
import type { Template } from "../schemas/template-schema";

/** Standard page sizes in inches (width × height) */
const PAGE_SIZES: Record<string, { width: number; height: number }> = {
	a4: { width: 8.27, height: 11.69 },
	letter: { width: 8.5, height: 11 },
	a3: { width: 11.69, height: 16.54 },
	legal: { width: 8.5, height: 14 },
};

/** Options for PDF generation */
export interface GeneratePDFOptions {
	/** Page size name or custom dimensions in inches */
	pageSize?: string | { width: number; height: number };
	/** Landscape orientation (default: false) */
	landscape?: boolean;
	/** Renderer options (format, canvas size) — used when rendering from JSON inputs */
	renderOptions?: RenderHTMLOptions;
}

/** Result of PDF generation */
export interface GeneratePDFResult {
	/** The PDF file contents as a Buffer */
	buffer: Buffer;
	/** Number of pages in the template */
	templatePages: number;
}

/**
 * Generates a PDF from template + theme + content JSON inputs.
 *
 * Uses Playwright to render the HTML preview and print to PDF.
 * Page/slide boundaries from the template become CSS page breaks.
 * No custom PDF layout logic — relies entirely on the HTML renderer.
 */
export async function generatePDF(
	template: Template,
	theme: BrandTheme,
	content: Content,
	options: GeneratePDFOptions = {},
): Promise<GeneratePDFResult> {
	const html = renderHTMLForPDF(template, theme, content, options.renderOptions);
	const buffer = await htmlToPDF(html, options);

	return {
		buffer,
		templatePages: template.pages.length,
	};
}

/**
 * Generates a PDF from a URL pointing to a running HTML preview server.
 *
 * Navigates Playwright to the URL and prints to PDF.
 */
export async function generatePDFFromURL(
	url: string,
	options: GeneratePDFOptions = {},
): Promise<GeneratePDFResult> {
	const browser = await chromium.launch();
	try {
		const context = await browser.newContext();
		const page = await context.newPage();
		await page.goto(url, { waitUntil: "networkidle" });

		const pageSize = resolvePageSize(options);
		const buffer = Buffer.from(
			await page.pdf({
				width: `${pageSize.width}in`,
				height: `${pageSize.height}in`,
				landscape: options.landscape ?? false,
				printBackground: true,
			}),
		);

		// Count template pages from the HTML content
		const templatePages = await page.evaluate(() => {
			return document.querySelectorAll(".ce-page").length;
		});

		return { buffer, templatePages: templatePages || 1 };
	} finally {
		await browser.close();
	}
}

// ── Internal helpers ────────────────────────────────────────────────

/**
 * Renders HTML with page-break CSS injected for PDF generation.
 * Each .ce-page element triggers a CSS page break before it (except the first).
 */
function renderHTMLForPDF(
	template: Template,
	theme: BrandTheme,
	content: Content,
	renderOptions?: RenderHTMLOptions,
): string {
	const pdfRenderOptions: RenderHTMLOptions = {
		...renderOptions,
		format: renderOptions?.format ?? "pdf",
	};

	let html = renderHTML(template, theme, content, pdfRenderOptions);

	// Inject PDF-specific styles: page breaks at slide boundaries, remove page gaps
	const pdfStyles = `<style>
@media print {
  body { background: none; margin: 0; }
  .ce-document { width: 100%; margin: 0; }
  .ce-page { height: auto; width: 100%; overflow: visible; }
  .ce-page + .ce-page {
    break-before: page;
    margin-top: 0;
    border-top: none;
  }
}
</style>`;

	html = html.replace("</head>", `${pdfStyles}\n</head>`);
	return html;
}

async function htmlToPDF(html: string, options: GeneratePDFOptions): Promise<Buffer> {
	const browser = await chromium.launch();
	try {
		const context = await browser.newContext();
		const page = await context.newPage();
		await page.setContent(html, { waitUntil: "networkidle" });

		const pageSize = resolvePageSize(options);

		return Buffer.from(
			await page.pdf({
				width: `${pageSize.width}in`,
				height: `${pageSize.height}in`,
				landscape: options.landscape ?? false,
				printBackground: true,
			}),
		);
	} finally {
		await browser.close();
	}
}

function resolvePageSize(options: GeneratePDFOptions): { width: number; height: number } {
	if (!options.pageSize) {
		return PAGE_SIZES.a4;
	}
	if (typeof options.pageSize === "string") {
		const normalized = options.pageSize.toLowerCase();
		return PAGE_SIZES[normalized] ?? PAGE_SIZES.a4;
	}
	return options.pageSize;
}
