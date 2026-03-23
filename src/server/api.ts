import { generatePDF } from "../lib/generators/pdf-generator";
import { generatePPTX } from "../lib/generators/pptx-generator";
import { renderHTML } from "../lib/renderers/html-renderer";
import { BrandThemeSchema } from "../lib/schemas/brand-theme";
import { ContentSchema } from "../lib/schemas/content-schema";
import { TemplateSchema } from "../lib/schemas/template-schema";

// ── Constants ──────────────────────────────────────────────────────

const DEFAULT_API_PORT = 3001;

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

const CONTENT_TYPES: Record<string, string> = {
	"html-static": "text/html",
	pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	pdf: "application/pdf",
};

const FILE_EXTENSIONS: Record<string, string> = {
	"html-static": "html",
	pptx: "pptx",
	pdf: "pdf",
};

// ── Types ──────────────────────────────────────────────────────────

export interface APIServerInstance {
	/** The Bun server instance */
	server: ReturnType<typeof Bun.serve>;
	/** Stop the server */
	stop(): void;
	/** Server port */
	port: number;
	/** Server URL */
	url: string;
}

interface GenerateRequestBody {
	format: "html-static" | "pptx" | "pdf";
	template: unknown;
	theme: unknown;
	content: unknown;
}

// ── Request handlers ───────────────────────────────────────────────

async function handleGenerate(req: Request): Promise<Response> {
	const body = (await req.json()) as GenerateRequestBody;
	const { format, template, theme, content } = body;

	if (!format || !template || !theme || !content) {
		return jsonError("Missing required fields: format, template, theme, content", 400);
	}

	if (!CONTENT_TYPES[format]) {
		return jsonError(`Unknown format: ${format}. Expected: html-static, pptx, pdf`, 400);
	}

	// Validate inputs against schemas
	const parsedTemplate = TemplateSchema.parse(template);
	const parsedTheme = BrandThemeSchema.parse(theme);
	const parsedContent = ContentSchema.parse(content);

	const ext = FILE_EXTENSIONS[format];

	if (format === "html-static") {
		const html = renderHTML(parsedTemplate, parsedTheme, parsedContent);
		return new Response(html, {
			headers: {
				...CORS_HEADERS,
				"Content-Type": "text/html; charset=utf-8",
				"Content-Disposition": `attachment; filename="output.${ext}"`,
			},
		});
	}

	if (format === "pptx") {
		const result = await generatePPTX(parsedTemplate, parsedTheme, parsedContent);
		return new Response(new Uint8Array(result.buffer).buffer as ArrayBuffer, {
			headers: {
				...CORS_HEADERS,
				"Content-Type": CONTENT_TYPES.pptx,
				"Content-Disposition": `attachment; filename="output.${ext}"`,
			},
		});
	}

	// format === "pdf"
	const result = await generatePDF(parsedTemplate, parsedTheme, parsedContent);
	return new Response(new Uint8Array(result.buffer).buffer as ArrayBuffer, {
		headers: {
			...CORS_HEADERS,
			"Content-Type": CONTENT_TYPES.pdf,
			"Content-Disposition": `attachment; filename="output.${ext}"`,
		},
	});
}

function handleHealthCheck(): Response {
	return new Response(JSON.stringify({ status: "ok" }), {
		headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
	});
}

// ── Helpers ────────────────────────────────────────────────────────

function jsonError(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
	});
}

// ── Server factory ─────────────────────────────────────────────────

/**
 * Starts the generation API server.
 *
 * POST /api/generate — accepts { format, template, theme, content },
 * validates inputs, runs the appropriate generator, returns the file.
 *
 * GET /api/health — returns { status: "ok" }.
 */
export function startAPIServer(port = DEFAULT_API_PORT): APIServerInstance {
	const server = Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url);

			// CORS preflight
			if (req.method === "OPTIONS") {
				return new Response(null, { status: 204, headers: CORS_HEADERS });
			}

			try {
				if (url.pathname === "/api/generate" && req.method === "POST") {
					return await handleGenerate(req);
				}

				if (url.pathname === "/api/health" && req.method === "GET") {
					return handleHealthCheck();
				}

				return jsonError("Not found", 404);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				console.error("[api] Error:", message);
				return jsonError(message, 500);
			}
		},
	});

	const actualPort = server.port ?? port;
	const url = `http://localhost:${actualPort}`;

	return {
		server,
		port: actualPort,
		url,
		stop() {
			server.stop();
		},
	};
}

// ── CLI entry point ────────────────────────────────────────────────

if (import.meta.main) {
	const port = Number(process.env.API_PORT) || DEFAULT_API_PORT;
	const instance = startAPIServer(port);
	console.log(`Content Engine API server running at ${instance.url}`);
}
