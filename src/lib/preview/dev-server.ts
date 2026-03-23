import { type FSWatcher, readFileSync, watch } from "node:fs";
import { resolve } from "node:path";
import { type RenderHTMLOptions, renderHTML } from "../renderers/html-renderer";
import type { BrandTheme } from "../schemas/brand-theme";
import type { Content } from "../schemas/content-schema";
import type { Template } from "../schemas/template-schema";

/** Options for starting the preview dev server */
export interface DevServerOptions {
	/** Path to the template JSON file */
	templatePath: string;
	/** Path to the theme JSON file */
	themePath: string;
	/** Path to the content JSON file */
	contentPath: string;
	/** Port to listen on (default: 3000) */
	port?: number;
	/** Host to bind to (default: "localhost") */
	host?: string;
	/** Renderer options (format, canvas size) */
	renderOptions?: RenderHTMLOptions;
}

/** Running dev server instance */
export interface DevServerInstance {
	/** The URL the server is listening on */
	url: string;
	/** Stop the server and all file watchers */
	stop(): void;
}

/**
 * Starts an HTML preview dev server with hot reload.
 *
 * Serves the HTML renderer output and watches template, theme, and content
 * JSON files for changes. Uses Server-Sent Events to push instant updates
 * to the browser without manual refresh.
 *
 * Injects overflow detection CSS: containers whose content overflows are
 * highlighted with a red outline and "OVERFLOW" badge.
 */
export function startDevServer(options: DevServerOptions): DevServerInstance {
	const port = options.port ?? 3000;
	const host = options.host ?? "localhost";
	const renderOptions = options.renderOptions ?? {};

	const templatePath = resolve(options.templatePath);
	const themePath = resolve(options.themePath);
	const contentPath = resolve(options.contentPath);

	// SSE clients
	const sseClients = new Set<ReadableStreamDefaultController>();

	// Load JSON files
	function loadJSON<T>(path: string): T {
		return JSON.parse(readFileSync(path, "utf-8")) as T;
	}

	function renderPreview(): string {
		const template = loadJSON<Template>(templatePath);
		const theme = loadJSON<BrandTheme>(themePath);
		const content = loadJSON<Content>(contentPath);
		const html = renderHTML(template, theme, content, renderOptions);
		return injectDevTools(html);
	}

	// Inject hot reload client + overflow detection
	function injectDevTools(html: string): string {
		const devScript = `<script>
(function() {
  var es = new EventSource('/__sse');
  es.onmessage = function(e) {
    if (e.data === 'reload') window.location.reload();
  };
  es.onerror = function() {
    setTimeout(function() { window.location.reload(); }, 1000);
  };

  // Overflow detection
  function checkOverflow() {
    document.querySelectorAll('.ce-overflow-indicator').forEach(function(el) { el.remove(); });
    document.querySelectorAll('.ce-section, .ce-card').forEach(function(el) {
      el.classList.remove('ce-overflow');
      if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) {
        el.classList.add('ce-overflow');
        var badge = document.createElement('div');
        badge.className = 'ce-overflow-indicator';
        badge.textContent = 'OVERFLOW';
        el.style.position = el.style.position || 'relative';
        el.appendChild(badge);
      }
    });
  }
  window.addEventListener('load', checkOverflow);
  new MutationObserver(checkOverflow).observe(document.body, { childList: true, subtree: true });
})();
</script>`;

		const overflowCSS = `<style>
.ce-overflow { outline: 2px dashed #ef4444 !important; outline-offset: -2px; }
.ce-overflow-indicator {
  position: absolute; top: 2px; right: 2px; z-index: 9999;
  background: #ef4444; color: #fff; font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 3px; font-family: monospace;
  pointer-events: none;
}
</style>`;

		return html
			.replace("</head>", `${overflowCSS}\n</head>`)
			.replace("</body>", `${devScript}\n</body>`);
	}

	// Notify all SSE clients to reload
	function notifyReload() {
		for (const controller of sseClients) {
			try {
				controller.enqueue(new TextEncoder().encode("data: reload\n\n"));
			} catch {
				sseClients.delete(controller);
			}
		}
	}

	// File watchers with debounce
	const watchers: FSWatcher[] = [];
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function setupWatcher(filePath: string) {
		const watcher = watch(filePath, () => {
			if (debounceTimer) clearTimeout(debounceTimer);
			debounceTimer = setTimeout(notifyReload, 100);
		});
		watchers.push(watcher);
	}

	setupWatcher(templatePath);
	setupWatcher(themePath);
	setupWatcher(contentPath);

	// Bun HTTP server
	const server = Bun.serve({
		port,
		hostname: host,
		fetch(req) {
			const url = new URL(req.url);

			// SSE endpoint
			if (url.pathname === "/__sse") {
				const stream = new ReadableStream({
					start(controller) {
						sseClients.add(controller);
						// Keep-alive comment every 30s
						const keepAlive = setInterval(() => {
							try {
								controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
							} catch {
								clearInterval(keepAlive);
								sseClients.delete(controller);
							}
						}, 30000);
					},
					cancel(controller) {
						sseClients.delete(controller);
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
						"Access-Control-Allow-Origin": "*",
					},
				});
			}

			// Serve rendered preview
			if (url.pathname === "/" || url.pathname === "/index.html") {
				try {
					const html = renderPreview();
					return new Response(html, {
						headers: { "Content-Type": "text/html; charset=utf-8" },
					});
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					return new Response(
						`<!DOCTYPE html><html><body><h1>Render Error</h1><pre>${message}</pre></body></html>`,
						{ status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
					);
				}
			}

			return new Response("Not Found", { status: 404 });
		},
	});

	const serverUrl = `http://${host}:${server.port}`;

	return {
		url: serverUrl,
		stop() {
			for (const w of watchers) w.close();
			for (const c of sseClients) {
				try {
					c.close();
				} catch {
					/* ignore */
				}
			}
			sseClients.clear();
			server.stop();
		},
	};
}
