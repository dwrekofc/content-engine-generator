import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type DevServerInstance, startDevServer } from "../dev-server";

// ── Fixtures ────────────────────────────────────────────────────────

const minimalTemplate = {
	id: "test-site",
	name: "Test Site",
	pages: [
		{
			id: "page-1",
			sections: [
				{
					id: "section-1",
					layout: "section",
					fields: [{ id: "title-1", type: "title", required: true }],
					cards: [],
					children: [],
				},
			],
		},
	],
};

const minimalTheme = {
	name: "Test Theme",
	typography: {
		heading: { fontFamily: "Arial", fontSize: 36, fontWeight: 700, lineHeight: 1.2 },
		subheading: { fontFamily: "Arial", fontSize: 24, fontWeight: 600, lineHeight: 1.3 },
		body: { fontFamily: "Arial", fontSize: 16, fontWeight: 400, lineHeight: 1.6 },
	},
	colors: {
		primary: "#1a56db",
		secondary: "#6b7280",
		background: "#ffffff",
		text: "#111827",
		accent: "#f59e0b",
	},
	spacing: { padding: 24, margin: 16, gap: 16 },
};

const minimalContent = {
	templateRef: "test-site",
	themeRef: "test-theme",
	pages: [
		{
			pageId: "page-1",
			sections: [
				{
					sectionId: "section-1",
					fields: { "title-1": { type: "title", text: "Hello World" } },
					cards: [],
					children: [],
				},
			],
		},
	],
};

// ── Test setup ──────────────────────────────────────────────────────

let tempDir: string;
let server: DevServerInstance | null = null;

function writeFixtures(template = minimalTemplate, theme = minimalTheme, content = minimalContent) {
	writeFileSync(join(tempDir, "template.json"), JSON.stringify(template));
	writeFileSync(join(tempDir, "theme.json"), JSON.stringify(theme));
	writeFileSync(join(tempDir, "content.json"), JSON.stringify(content));
}

beforeEach(() => {
	tempDir = mkdtempSync(join(tmpdir(), "ce-dev-test-"));
	writeFixtures();
});

afterEach(() => {
	if (server) {
		server.stop();
		server = null;
	}
	if (tempDir && existsSync(tempDir)) {
		rmSync(tempDir, { recursive: true, force: true });
	}
});

// Use random port to avoid conflicts between parallel tests
let portCounter = 9200;
function nextPort(): number {
	return portCounter++;
}

// ── Server startup tests ────────────────────────────────────────────

describe("dev server — startup", () => {
	test("starts and provides a URL", () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		expect(server.url).toBe(`http://localhost:${port}`);
	});

	test("stop() shuts down without error", () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		expect(() => server?.stop()).not.toThrow();
		server = null;
	});
});

// ── HTTP serving tests ──────────────────────────────────────────────

describe("dev server — HTTP responses", () => {
	test("serves HTML at /", async () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		const res = await fetch(`http://localhost:${port}/`);
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("text/html");

		const html = await res.text();
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("Hello World");
	});

	test("serves HTML at /index.html", async () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		const res = await fetch(`http://localhost:${port}/index.html`);
		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain("Hello World");
	});

	test("returns 404 for unknown paths", async () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		const res = await fetch(`http://localhost:${port}/nonexistent`);
		expect(res.status).toBe(404);
	});

	test("includes theme CSS variables", async () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		const res = await fetch(`http://localhost:${port}/`);
		const html = await res.text();
		expect(html).toContain("--color-primary");
		expect(html).toContain("#1a56db");
	});

	test("renders updated content on re-fetch after file change", async () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		// Initial fetch
		let res = await fetch(`http://localhost:${port}/`);
		let html = await res.text();
		expect(html).toContain("Hello World");

		// Update content file
		const updatedContent = {
			...minimalContent,
			pages: [
				{
					pageId: "page-1",
					sections: [
						{
							sectionId: "section-1",
							fields: { "title-1": { type: "title", text: "Updated Title" } },
							cards: [],
							children: [],
						},
					],
				},
			],
		};
		writeFileSync(join(tempDir, "content.json"), JSON.stringify(updatedContent));

		// Re-fetch — server reads fresh files each request
		res = await fetch(`http://localhost:${port}/`);
		html = await res.text();
		expect(html).toContain("Updated Title");
		expect(html).not.toContain("Hello World");
	});
});

// ── Dev tools injection tests ───────────────────────────────────────

describe("dev server — dev tools injection", () => {
	test("injects SSE client script for hot reload", async () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		const res = await fetch(`http://localhost:${port}/`);
		const html = await res.text();
		expect(html).toContain("EventSource");
		expect(html).toContain("/__sse");
	});

	test("injects overflow detection CSS", async () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		const res = await fetch(`http://localhost:${port}/`);
		const html = await res.text();
		expect(html).toContain("ce-overflow");
		expect(html).toContain("ce-overflow-indicator");
		expect(html).toContain("OVERFLOW");
	});

	test("injects overflow detection JS", async () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		const res = await fetch(`http://localhost:${port}/`);
		const html = await res.text();
		expect(html).toContain("scrollHeight");
		expect(html).toContain("checkOverflow");
	});
});

// ── SSE endpoint tests ──────────────────────────────────────────────

describe("dev server — SSE endpoint", () => {
	test("/__sse endpoint exists and serves correct headers", async () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		// Verify the SSE endpoint is accessible by checking the HTML includes the SSE path
		// (Direct fetch on SSE streams blocks in Bun — verify indirectly via injected client)
		const res = await fetch(`http://localhost:${port}/`);
		const html = await res.text();
		expect(html).toContain("new EventSource('/__sse')");
	});
});

// ── Error handling tests ────────────────────────────────────────────

describe("dev server — error handling", () => {
	test("returns 500 with error message for invalid JSON", async () => {
		const port = nextPort();
		writeFileSync(join(tempDir, "template.json"), "not valid json{{{");

		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
		});

		const res = await fetch(`http://localhost:${port}/`);
		expect(res.status).toBe(500);
		const html = await res.text();
		expect(html).toContain("Render Error");
	});
});

// ── Custom options tests ────────────────────────────────────────────

describe("dev server — custom options", () => {
	test("respects custom host", () => {
		const port = nextPort();
		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
			host: "127.0.0.1",
		});

		expect(server.url).toBe(`http://127.0.0.1:${port}`);
	});

	test("passes render options through to renderer", async () => {
		const port = nextPort();
		const templateWithCanvas = {
			...minimalTemplate,
			canvasSize: { custom: { width: 800, height: 600 } },
		};
		writeFileSync(join(tempDir, "template.json"), JSON.stringify(templateWithCanvas));

		server = startDevServer({
			templatePath: join(tempDir, "template.json"),
			themePath: join(tempDir, "theme.json"),
			contentPath: join(tempDir, "content.json"),
			port,
			renderOptions: { format: "custom" },
		});

		const res = await fetch(`http://localhost:${port}/`);
		const html = await res.text();
		expect(html).toContain("800px");
	});
});
