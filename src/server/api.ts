import { ZodError } from "zod";
import { generatePDF } from "../lib/generators/pdf-generator";
import { generatePPTX } from "../lib/generators/pptx-generator";
import { renderHTML } from "../lib/renderers/html-renderer";
import { type BrandTheme, BrandThemeSchema } from "../lib/schemas/brand-theme";
import { type Content, ContentSchema } from "../lib/schemas/content-schema";
import { validateContent } from "../lib/schemas/content-validator";
import { type Template, TemplateSchema } from "../lib/schemas/template-schema";

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

	// Validate inputs against schemas — Zod errors are caught and returned as 400
	let parsedTemplate: Template;
	let parsedTheme: BrandTheme;
	let parsedContent: Content;
	try {
		parsedTemplate = TemplateSchema.parse(template);
	} catch (err) {
		if (err instanceof ZodError) {
			return jsonError(`Template validation failed: ${formatZodError(err)}`, 400);
		}
		throw err;
	}
	try {
		parsedTheme = BrandThemeSchema.parse(theme);
	} catch (err) {
		if (err instanceof ZodError) {
			return jsonError(`Theme validation failed: ${formatZodError(err)}`, 400);
		}
		throw err;
	}
	try {
		parsedContent = ContentSchema.parse(content);
	} catch (err) {
		if (err instanceof ZodError) {
			return jsonError(`Content validation failed: ${formatZodError(err)}`, 400);
		}
		throw err;
	}

	// Validate content against template structure
	const contentErrors = validateContent(parsedContent, parsedTemplate);
	if (contentErrors.length > 0) {
		const details = contentErrors.map((e) => `${e.path}: ${e.message}`).join("; ");
		return jsonError(`Content does not match template: ${details}`, 400);
	}

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

/** Formats a ZodError into a human-readable string with field paths */
function formatZodError(err: ZodError): string {
	return err.issues
		.map((issue) => {
			const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
			return `${path}: ${issue.message}`;
		})
		.slice(0, 5) // Limit to first 5 issues to avoid huge error messages
		.join("; ");
}

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
