import { afterEach, describe, expect, test } from "bun:test";
import type { BrandTheme } from "../../lib/schemas/brand-theme";
import type { Content } from "../../lib/schemas/content-schema";
import type { Template } from "../../lib/schemas/template-schema";
import { type APIServerInstance, startAPIServer } from "../api";

// ── Fixtures (inline, same pattern as other tests) ─────────────────

const minimalTemplate: Template = {
	id: "test-tpl",
	name: "Test Template",
	pages: [
		{
			id: "page-1",
			name: "Page 1",
			sections: [
				{
					id: "section-1",
					name: "hero",
					layout: "section",
					fields: [{ id: "title-1", type: "title", required: true }],
					cards: [],
					children: [],
				},
			],
		},
	],
};

const minimalTheme: BrandTheme = {
	name: "Test Theme",
	typography: {
		heading: { fontFamily: "Arial", fontSize: 32, fontWeight: 700, lineHeight: 1.2 },
		subheading: { fontFamily: "Arial", fontSize: 24, fontWeight: 600, lineHeight: 1.3 },
		body: { fontFamily: "Arial", fontSize: 16, fontWeight: 400, lineHeight: 1.5 },
		caption: { fontFamily: "Arial", fontSize: 12, fontWeight: 400, lineHeight: 1.4 },
		button: { fontFamily: "Arial", fontSize: 14, fontWeight: 600, lineHeight: 1 },
	},
	colors: {
		primary: "#1a56db",
		secondary: "#6b7280",
		background: "#ffffff",
		text: "#111827",
		accent: "#f59e0b",
	},
	spacing: { padding: 20, margin: 0, gap: 16 },
};

const minimalContent: Content = {
	templateRef: "test-tpl",
	themeRef: "Test Theme",
	pages: [
		{
			pageId: "page-1",
			sections: [
				{
					sectionId: "section-1",
					fields: {
						"title-1": { type: "title", text: "Hello World" },
					},
					cards: [],
					children: [],
				},
			],
		},
	],
};

// ── Server lifecycle ───────────────────────────────────────────────

let portCounter = 9400;
function nextPort() {
	return portCounter++;
}

let server: APIServerInstance | null = null;

afterEach(() => {
	if (server) {
		server.stop();
		server = null;
	}
});

// ── Tests ──────────────────────────────────────────────────────────

describe("API server — startup", () => {
	test("starts on specified port", () => {
		const port = nextPort();
		server = startAPIServer(port);
		expect(server.port).toBe(port);
		expect(server.url).toBe(`http://localhost:${port}`);
	});

	test("health check returns ok", async () => {
		const port = nextPort();
		server = startAPIServer(port);
		const res = await fetch(`${server.url}/api/health`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ status: "ok" });
	});
});

describe("API server — CORS", () => {
	test("OPTIONS preflight returns 204 with CORS headers", async () => {
		const port = nextPort();
		server = startAPIServer(port);
		const res = await fetch(`${server.url}/api/generate`, { method: "OPTIONS" });
		expect(res.status).toBe(204);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
		expect(res.headers.get("Access-Control-Allow-Methods")).toContain("POST");
	});
});

describe("API server — validation", () => {
	test("rejects unknown format", async () => {
		const port = nextPort();
		server = startAPIServer(port);
		const res = await fetch(`${server.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "docx",
				template: minimalTemplate,
				theme: minimalTheme,
				content: minimalContent,
			}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain("Unknown format");
	});

	test("rejects missing fields", async () => {
		const port = nextPort();
		server = startAPIServer(port);
		const res = await fetch(`${server.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ format: "html-static" }),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain("Missing required fields");
	});

	test("rejects invalid template schema", async () => {
		const port = nextPort();
		server = startAPIServer(port);
		const res = await fetch(`${server.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "html-static",
				template: { invalid: true },
				theme: minimalTheme,
				content: minimalContent,
			}),
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toContain("Template validation failed");
	});

	test("returns 404 for unknown routes", async () => {
		const port = nextPort();
		server = startAPIServer(port);
		const res = await fetch(`${server.url}/unknown`);
		expect(res.status).toBe(404);
	});
});

describe("API server — HTML static generation", () => {
	test("generates HTML and returns as attachment", async () => {
		const port = nextPort();
		server = startAPIServer(port);
		const res = await fetch(`${server.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "html-static",
				template: minimalTemplate,
				theme: minimalTheme,
				content: minimalContent,
			}),
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Type")).toContain("text/html");
		expect(res.headers.get("Content-Disposition")).toContain("output.html");

		const html = await res.text();
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("Hello World");
	});
});

describe("API server — PPTX generation", () => {
	test("generates PPTX and returns as attachment", async () => {
		const port = nextPort();
		server = startAPIServer(port);
		const res = await fetch(`${server.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "pptx",
				template: minimalTemplate,
				theme: minimalTheme,
				content: minimalContent,
			}),
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Disposition")).toContain("output.pptx");

		const buffer = await res.arrayBuffer();
		// PPTX files are ZIP archives — check for PK magic bytes
		const bytes = new Uint8Array(buffer);
		expect(bytes[0]).toBe(0x50); // P
		expect(bytes[1]).toBe(0x4b); // K
	});
});

describe("API server — PDF generation", () => {
	test("generates PDF and returns as attachment", async () => {
		const port = nextPort();
		server = startAPIServer(port);
		const res = await fetch(`${server.url}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				format: "pdf",
				template: minimalTemplate,
				theme: minimalTheme,
				content: minimalContent,
			}),
		});
		expect(res.status).toBe(200);
		expect(res.headers.get("Content-Disposition")).toContain("output.pdf");

		const buffer = await res.arrayBuffer();
		const bytes = new Uint8Array(buffer);
		// PDF files start with %PDF magic bytes
		expect(bytes[0]).toBe(0x25); // %
		expect(bytes[1]).toBe(0x50); // P
		expect(bytes[2]).toBe(0x44); // D
		expect(bytes[3]).toBe(0x46); // F
	}, 30_000); // PDF generation via Playwright can be slow
});
