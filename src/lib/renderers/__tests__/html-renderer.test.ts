import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BrandThemeSchema } from "../../schemas/brand-theme";
import type { ContentSection } from "../../schemas/content-schema";
import { ContentSchema } from "../../schemas/content-schema";
import type { Section } from "../../schemas/template-schema";
import { TemplateSchema } from "../../schemas/template-schema";
import { renderHTML, renderHTMLFragment } from "../html-renderer";

// ── Load fixtures ──────────────────────────────────────────────────
const fixturesDir = join(import.meta.dir, "../../../../fixtures");

const template = TemplateSchema.parse(
	JSON.parse(readFileSync(join(fixturesDir, "sample-template.json"), "utf-8")),
);
const theme = BrandThemeSchema.parse(
	JSON.parse(readFileSync(join(fixturesDir, "sample-theme.json"), "utf-8")),
);
const content = ContentSchema.parse(
	JSON.parse(readFileSync(join(fixturesDir, "sample-content.json"), "utf-8")),
);

// ── Helpers ─────────────────────────────────────────────────────────

function makeMinimalTemplate(sections: Section[] = []) {
	return TemplateSchema.parse({
		id: "test",
		name: "Test",
		pages: [{ id: "p1", name: "P1", sections }],
	});
}

function makeMinimalContent(sections: ContentSection[] = []) {
	return ContentSchema.parse({
		templateRef: "test",
		themeRef: "test-theme",
		pages: [{ pageId: "p1", sections }],
	});
}

function makeMinimalTheme() {
	return BrandThemeSchema.parse({
		name: "Test Theme",
		typography: {
			heading: { fontFamily: "Arial", fontSize: 32, fontWeight: 700 },
			subheading: { fontFamily: "Arial", fontSize: 24, fontWeight: 600 },
			body: { fontFamily: "Arial", fontSize: 16, fontWeight: 400 },
		},
		colors: {
			primary: "#0000ff",
			secondary: "#666666",
			background: "#ffffff",
			text: "#000000",
			accent: "#ff0000",
		},
		spacing: { padding: 20, margin: 10, gap: 10 },
	});
}

// ── Full document rendering ─────────────────────────────────────────

describe("renderHTML — full document", () => {
	test("produces a valid HTML document with DOCTYPE", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain('<html lang="en">');
		expect(html).toContain("</html>");
	});

	test("includes template name as title", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("<title>Sample Marketing Deck</title>");
	});

	test("includes CSS custom properties from theme", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("--color-primary: #1a56db");
		expect(html).toContain("--color-background: #ffffff");
		expect(html).toContain("--font-heading-family: Inter, sans-serif");
		expect(html).toContain("--font-heading-size: 36px");
		expect(html).toContain("--spacing-padding: 24px");
		expect(html).toContain("--button-border-radius: 8px");
	});

	test("renders all 4 pages", () => {
		const html = renderHTML(template, theme, content);
		const pageCount = (html.match(/class="ce-page"/g) || []).length;
		expect(pageCount).toBe(4);
	});

	test("uses html canvas size by default", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("width: 1280px");
		expect(html).toContain("min-height: 720px");
	});
});

// ── Canvas size resolution ──────────────────────────────────────────

describe("renderHTML — canvas size", () => {
	test("uses specified format canvas size", () => {
		const html = renderHTML(template, theme, content, { format: "pdf" });
		expect(html).toContain("width: 595.28px");
	});

	test("uses explicit width/height override", () => {
		const html = renderHTML(template, theme, content, {
			canvasWidth: 1920,
			canvasHeight: 1080,
		});
		expect(html).toContain("width: 1920px");
		expect(html).toContain("min-height: 1080px");
	});

	test("falls back to defaults when no canvas size", () => {
		const t = makeMinimalTemplate();
		const c = makeMinimalContent();
		const th = makeMinimalTheme();
		const html = renderHTML(t, th, c);
		expect(html).toContain("width: 1280px");
		expect(html).toContain("min-height: 720px");
	});
});

// ── Page rendering ──────────────────────────────────────────────────

describe("renderHTML — page structure", () => {
	test("pages have data-page-id attributes", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('data-page-id="page-1"');
		expect(html).toContain('data-page-id="page-2"');
		expect(html).toContain('data-page-id="page-3"');
		expect(html).toContain('data-page-id="page-4"');
	});

	test("pages have data-page-name attributes", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('data-page-name="Hero Slide"');
		expect(html).toContain('data-page-name="Features"');
	});

	test("page boundaries have visual separation via CSS", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain(".ce-page + .ce-page");
	});
});

// ── Layout primitive rendering ──────────────────────────────────────

describe("renderHTML — layout primitives", () => {
	test("section layout renders as block", () => {
		const html = renderHTML(template, theme, content);
		// features-header uses "section" layout → ce-section--block class appears before data attr
		expect(html).toContain('ce-section--block" data-section-id="features-header"');
	});

	test("flex layout renders with display:flex CSS class", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('ce-section--flex" data-section-id="showcase-section"');
	});

	test("flex config applied as inline styles", () => {
		const html = renderHTML(template, theme, content);
		// showcase-section has flexConfig: direction:row, gap:32, align:center
		expect(html).toContain("flex-direction: row");
		expect(html).toContain("gap: 32px");
		expect(html).toContain("align-items: center");
	});

	test("grid layout renders with display:grid CSS class", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('ce-section--grid" data-section-id="features-grid"');
	});

	test("grid config applied as inline styles", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("grid-template-columns: repeat(3, 1fr)");
		expect(html).toContain("grid-template-rows: repeat(1, 1fr)");
		expect(html).toContain("gap: 24px");
	});

	test("stack layout renders with stack CSS class", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('ce-section--stack" data-section-id="hero-section"');
	});

	test("free-position layout renders with free-position CSS class", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('ce-section--free-position" data-section-id="free-section"');
	});

	test("free-position children have absolute positioning", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("ce-free-child");
		expect(html).toContain("left: 50px");
		expect(html).toContain("top: 30px");
		expect(html).toContain("width: 400px");
		expect(html).toContain("height: 80px");
	});
});

// ── Flex layout config variations ───────────────────────────────────

describe("renderHTML — flex config details", () => {
	test("column direction flex", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "flex",
				flexConfig: { direction: "column", gap: 16 },
				fields: [],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([{ sectionId: "s1", fields: {}, cards: [], children: [] }]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain("flex-direction: column");
		expect(html).toContain("gap: 16px");
	});

	test("flex wrap enabled", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "flex",
				flexConfig: { direction: "row", wrap: true },
				fields: [],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([{ sectionId: "s1", fields: {}, cards: [], children: [] }]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain("flex-wrap: wrap");
	});

	test("flex align end maps to flex-end", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "flex",
				flexConfig: { direction: "row", align: "end" },
				fields: [],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([{ sectionId: "s1", fields: {}, cards: [], children: [] }]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain("align-items: flex-end");
	});
});

// ── Grid config variations ──────────────────────────────────────────

describe("renderHTML — grid config details", () => {
	test("custom column sizes use fr units", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "grid",
				gridConfig: { columns: 3, rows: 1, columnSizes: [2, 1, 1] },
				fields: [],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([{ sectionId: "s1", fields: {}, cards: [], children: [] }]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain("grid-template-columns: 2fr 1fr 1fr");
	});

	test("custom row sizes use fr units", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "grid",
				gridConfig: { columns: 2, rows: 2, rowSizes: [3, 1] },
				fields: [],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([{ sectionId: "s1", fields: {}, cards: [], children: [] }]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain("grid-template-rows: 3fr 1fr");
	});
});

// ── Theme application ───────────────────────────────────────────────

describe("renderHTML — theme application", () => {
	test("all 5 color tokens rendered as CSS vars", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("--color-primary:");
		expect(html).toContain("--color-secondary:");
		expect(html).toContain("--color-background:");
		expect(html).toContain("--color-text:");
		expect(html).toContain("--color-accent:");
	});

	test("typography tokens rendered as CSS vars", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("--font-heading-family:");
		expect(html).toContain("--font-heading-size:");
		expect(html).toContain("--font-heading-weight:");
		expect(html).toContain("--font-body-family:");
		expect(html).toContain("--font-subheading-family:");
	});

	test("spacing tokens rendered as CSS vars", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("--spacing-padding:");
		expect(html).toContain("--spacing-margin:");
		expect(html).toContain("--spacing-gap:");
	});

	test("button tokens rendered as CSS vars", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("--button-border-radius:");
		expect(html).toContain("--button-padding-x:");
		expect(html).toContain("--button-padding-y:");
		expect(html).toContain("--button-fill:");
		expect(html).toContain("--button-text-color:");
	});
});

// ── Section overrides ───────────────────────────────────────────────

describe("renderHTML — section overrides", () => {
	test("hero section gets override CSS vars as inline style", () => {
		const html = renderHTML(template, theme, content);
		// hero-section has name "hero" matching theme.sectionOverrides.hero
		const heroMatch = html.match(/data-section-id="hero-section"[^>]*style="([^"]*)"/);
		expect(heroMatch).toBeTruthy();
		const style = heroMatch?.[1];
		expect(style).toContain("--color-background: #1e3a5f");
		expect(style).toContain("--color-text: #ffffff");
		expect(style).toContain("--font-heading-size: 48px");
	});

	test("sections without matching overrides get no override styles", () => {
		const html = renderHTML(template, theme, content);
		const headerMatch = html.match(/data-section-id="features-header"[^>]*/);
		expect(headerMatch).toBeTruthy();
		// features-header has name "features-header" — no matching override
		// Should not have override CSS vars
		expect(headerMatch?.[0]).not.toContain("--color-background:");
	});

	test("override applies background-color directly", () => {
		const html = renderHTML(template, theme, content);
		const heroMatch = html.match(/data-section-id="hero-section"[^>]*style="([^"]*)"/);
		expect(heroMatch).toBeTruthy();
		expect(heroMatch?.[1]).toContain("background-color: #1e3a5f");
	});
});

// ── Field type rendering ────────────────────────────────────────────

describe("renderHTML — field types", () => {
	test("title renders as h1", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('<h1 class="ce-field ce-field--title"');
		expect(html).toContain("Transform Your Business");
	});

	test("subtitle renders as h2", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('<h2 class="ce-field ce-field--subtitle"');
		expect(html).toContain("The platform that powers growth");
	});

	test("paragraph renders as p", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('<p class="ce-field ce-field--paragraph"');
		expect(html).toContain("processes requests in milliseconds");
	});

	test("button renders as anchor with href", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('<a class="ce-field ce-field--button"');
		expect(html).toContain('href="https://example.com/trial"');
		expect(html).toContain("Start Free Trial");
	});

	test("featured-content renders as img", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('class="ce-field ce-field--featured-content"');
		expect(html).toContain('src="/assets/icon-speed.svg"');
		expect(html).toContain('alt="Speed icon"');
	});

	test("featured-content-caption renders as figcaption", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('<figcaption class="ce-field ce-field--featured-content-caption"');
		expect(html).toContain("Real-time analytics dashboard");
	});

	test("background with gradient renders as div with background style", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('class="ce-field ce-field--background"');
		expect(html).toContain("linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)");
	});

	test("background with plain color renders as background-color", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("background-color: #f8fafc");
	});
});

// ── Card rendering ──────────────────────────────────────────────────

describe("renderHTML — cards", () => {
	test("cards rendered with data-card-id", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('data-card-id="feature-card-1"');
		expect(html).toContain('data-card-id="feature-card-2"');
		expect(html).toContain('data-card-id="feature-card-3"');
	});

	test("card fields are filled with content", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("Lightning Fast");
		expect(html).toContain("Enterprise Security");
		expect(html).toContain("Infinite Scale");
	});

	test("card featured-content renders images", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('src="/assets/icon-speed.svg"');
		expect(html).toContain('src="/assets/icon-secure.svg"');
		expect(html).toContain('src="/assets/icon-scale.svg"');
	});
});

// ── Nested sections ─────────────────────────────────────────────────

describe("renderHTML — nested sections", () => {
	test("child sections rendered within parent", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('data-section-id="showcase-text-group"');
	});

	test("nested flex child renders with its own flex styles", () => {
		const html = renderHTML(template, theme, content);
		// showcase-text-group has flexConfig: direction:column, gap:16
		expect(html).toContain("flex-direction: column");
		expect(html).toContain("gap: 16px");
	});

	test("free-position children wrapped in ce-free-child", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("ce-free-child");
		// free-title-box position: x:50, y:30, width:400, height:80
		expect(html).toContain("left: 50px");
		expect(html).toContain("top: 30px");
		// free-body-box position: x:50, y:130, width:500, height:200
		expect(html).toContain("left: 50px; top: 130px; width: 500px; height: 200px");
	});
});

// ── Empty/missing content ───────────────────────────────────────────

describe("renderHTML — empty content handling", () => {
	test("missing field values render empty placeholders", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "section",
				fields: [{ id: "f1", type: "title", required: true }],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([{ sectionId: "s1", fields: {}, cards: [], children: [] }]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain("ce-field--empty");
		expect(html).toContain('data-field-id="f1"');
	});

	test("missing content section still renders section structure", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "section",
				fields: [{ id: "f1", type: "title", required: true }],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([]); // no sections in content
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain('data-section-id="s1"');
		expect(html).toContain("ce-field--empty");
	});
});

// ── HTML escaping ───────────────────────────────────────────────────

describe("renderHTML — HTML escaping", () => {
	test("title text with special characters is escaped", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "section",
				fields: [{ id: "f1", type: "title", required: true }],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([
			{
				sectionId: "s1",
				fields: {
					f1: { type: "title", text: '<script>alert("xss")</script>' },
				},
				cards: [],
				children: [],
			},
		]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;");
	});

	test("template name with HTML is escaped in title", () => {
		const t = TemplateSchema.parse({
			id: "test",
			name: '<img src="x">Test',
			pages: [{ id: "p1", sections: [] }],
		});
		const c = makeMinimalContent();
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).not.toContain('<img src="x">');
		expect(html).toContain("&lt;img");
	});
});

// ── renderHTMLFragment ──────────────────────────────────────────────

describe("renderHTMLFragment", () => {
	test("returns pages without document wrapper", () => {
		const fragment = renderHTMLFragment(template, theme, content);
		expect(fragment).not.toContain("<!DOCTYPE");
		expect(fragment).not.toContain("<html");
		expect(fragment).not.toContain("<head");
		expect(fragment).toContain("ce-page");
	});

	test("renders all pages", () => {
		const fragment = renderHTMLFragment(template, theme, content);
		const pageCount = (fragment.match(/class="ce-page"/g) || []).length;
		expect(pageCount).toBe(4);
	});
});

// ── CSS class structure ─────────────────────────────────────────────

describe("renderHTML — CSS base styles", () => {
	test("includes box-sizing reset", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain("box-sizing: border-box");
	});

	test("includes field type CSS classes", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain(".ce-field--title");
		expect(html).toContain(".ce-field--subtitle");
		expect(html).toContain(".ce-field--paragraph");
		expect(html).toContain(".ce-field--button");
		expect(html).toContain(".ce-field--featured-content");
		expect(html).toContain(".ce-field--featured-content-caption");
	});

	test("stack CSS positions children absolutely with background at z-index 0", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain(".ce-section--stack > *");
		expect(html).toContain(".ce-section--stack > .ce-field--background");
	});
});

// ── Data attributes ─────────────────────────────────────────────────

describe("renderHTML — data attributes", () => {
	test("fields have data-field-id", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('data-field-id="hero-title"');
		expect(html).toContain('data-field-id="hero-subtitle"');
		expect(html).toContain('data-field-id="hero-bg"');
	});

	test("sections have data-section-id and data-section-name", () => {
		const html = renderHTML(template, theme, content);
		expect(html).toContain('data-section-id="hero-section"');
		expect(html).toContain('data-section-name="hero"');
	});
});

// ── Background field variations ─────────────────────────────────────

describe("renderHTML — background field variations", () => {
	test("background with url() syntax", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "section",
				fields: [{ id: "bg", type: "background", required: true }],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([
			{
				sectionId: "s1",
				fields: {
					bg: { type: "background", value: "url(/images/hero.jpg)" },
				},
				cards: [],
				children: [],
			},
		]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain("url(/images/hero.jpg) center/cover no-repeat");
	});

	test("background with http URL auto-wraps in url()", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "section",
				fields: [{ id: "bg", type: "background", required: true }],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([
			{
				sectionId: "s1",
				fields: {
					bg: { type: "background", value: "https://example.com/bg.jpg" },
				},
				cards: [],
				children: [],
			},
		]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain("url(https://example.com/bg.jpg)");
	});

	test("background with radial-gradient", () => {
		const t = makeMinimalTemplate([
			{
				id: "s1",
				layout: "section",
				fields: [{ id: "bg", type: "background", required: true }],
				cards: [],
				children: [],
			},
		]);
		const c = makeMinimalContent([
			{
				sectionId: "s1",
				fields: {
					bg: { type: "background", value: "radial-gradient(circle, #fff, #000)" },
				},
				cards: [],
				children: [],
			},
		]);
		const html = renderHTML(t, makeMinimalTheme(), c);
		expect(html).toContain("radial-gradient(circle, #fff, #000)");
	});
});
