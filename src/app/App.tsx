import { useCallback, useState } from "react";
import type { BrandTheme } from "@/lib/schemas/brand-theme";
import type { Content } from "@/lib/schemas/content-schema";
import type { Template } from "@/lib/schemas/template-schema";
import { ContentPreviewMode } from "./modes/ContentPreviewMode";
import { GenerateMode } from "./modes/GenerateMode";
import { TemplateBuilderMode } from "./modes/TemplateBuilderMode";

type AppMode = "template-builder" | "content-preview" | "generate";

/** Shared state for active file selections — preserved across mode switches */
export interface AppState {
	template: Template | null;
	theme: BrandTheme | null;
	content: Content | null;
	templatePath: string | null;
	themePath: string | null;
	contentPath: string | null;
}

const MODE_LABELS: Record<AppMode, string> = {
	"template-builder": "Template Builder",
	"content-preview": "Content / Preview",
	generate: "Generate",
};

export function App() {
	const [mode, setMode] = useState<AppMode>("template-builder");
	const [state, setState] = useState<AppState>({
		template: null,
		theme: null,
		content: null,
		templatePath: null,
		themePath: null,
		contentPath: null,
	});

	const updateState = useCallback((updates: Partial<AppState>) => {
		setState((prev) => ({ ...prev, ...updates }));
	}, []);

	return (
		<div className="min-h-screen bg-gray-50 flex flex-col">
			{/* Navigation */}
			<nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
				<h1 className="text-lg font-semibold text-gray-900 mr-4">Content Engine</h1>
				<div className="flex gap-1">
					{(Object.keys(MODE_LABELS) as AppMode[]).map((m) => (
						<button
							key={m}
							type="button"
							onClick={() => setMode(m)}
							className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
								mode === m
									? "bg-blue-600 text-white"
									: "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
							}`}
						>
							{MODE_LABELS[m]}
						</button>
					))}
				</div>
				<div className="ml-auto text-xs text-gray-400">
					{state.templatePath && <span className="mr-3">T: {shortPath(state.templatePath)}</span>}
					{state.themePath && <span className="mr-3">Th: {shortPath(state.themePath)}</span>}
					{state.contentPath && <span>C: {shortPath(state.contentPath)}</span>}
				</div>
			</nav>

			{/* Mode content */}
			<main className="flex-1">
				{mode === "template-builder" && (
					<TemplateBuilderMode state={state} updateState={updateState} />
				)}
				{mode === "content-preview" && (
					<ContentPreviewMode state={state} updateState={updateState} />
				)}
				{mode === "generate" && <GenerateMode state={state} updateState={updateState} />}
			</main>
		</div>
	);
}

function shortPath(path: string): string {
	const parts = path.split("/");
	return parts.length > 2 ? `.../${parts.slice(-2).join("/")}` : path;
}
