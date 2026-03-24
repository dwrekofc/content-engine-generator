#!/usr/bin/env bun
/**
 * CLI entry point for the HTML preview dev server.
 *
 * Usage:
 *   bun run dev:preview -- --template fixtures/sample-template.json \
 *                          --theme fixtures/sample-theme.json \
 *                          --content fixtures/sample-content.json
 *
 * Starts a Bun HTTP server with SSE hot-reload that watches the three
 * JSON files and pushes browser refreshes on change.
 */
import { startDevServer } from "../lib/preview/dev-server";

function parseArgs(args: string[]): {
	template: string;
	theme: string;
	content: string;
	port: number;
} {
	let template = "";
	let theme = "";
	let content = "";
	let port = 3000;

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case "--template":
			case "-t":
				template = args[++i];
				break;
			case "--theme":
				theme = args[++i];
				break;
			case "--content":
			case "-c":
				content = args[++i];
				break;
			case "--port":
			case "-p":
				port = Number.parseInt(args[++i], 10);
				break;
		}
	}

	if (!template || !theme || !content) {
		console.error(
			"Usage: bun run dev:preview -- --template <path> --theme <path> --content <path> [--port <n>]",
		);
		process.exit(1);
	}

	return { template, theme, content, port };
}

const { template, theme, content, port } = parseArgs(process.argv.slice(2));

const server = startDevServer({
	templatePath: template,
	themePath: theme,
	contentPath: content,
	port,
});

console.log(`Preview server running at ${server.url}`);
console.log("Watching for changes… (Ctrl+C to stop)");
