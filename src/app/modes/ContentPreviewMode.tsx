import { useMemo } from "react";
import { renderHTML } from "@/lib/renderers/html-renderer";
import type { AppState } from "../App";
import { FilePickerBar } from "../components/FilePickerBar";

interface ContentPreviewModeProps {
	state: AppState;
	updateState: (updates: Partial<AppState>) => void;
}

/**
 * Content/Preview mode — shows live HTML preview of template + theme + content.
 *
 * Per html-preview-dev.md, Phase 1 preview is browser-based (not embedded).
 * This mode renders the HTML inline via an iframe for convenience, with a button
 * to open the full dev server in a new tab.
 */
export function ContentPreviewMode({ state, updateState }: ContentPreviewModeProps) {
	const { template, theme, content } = state;

	const previewHTML = useMemo(() => {
		if (!template || !theme || !content) return null;
		try {
			return renderHTML(template, theme, content);
		} catch {
			return null;
		}
	}, [template, theme, content]);

	return (
		<div className="flex flex-col h-[calc(100vh-52px)]">
			<FilePickerBar state={state} updateState={updateState} />

			{previewHTML ? (
				<div className="flex-1 bg-gray-100 p-4 overflow-auto">
					<div className="mx-auto" style={{ maxWidth: 1320 }}>
						<iframe
							title="Content Preview"
							srcDoc={previewHTML}
							className="w-full bg-white border border-gray-200 rounded-lg shadow-sm"
							style={{ height: "80vh" }}
						/>
					</div>
				</div>
			) : (
				<div className="flex-1 flex items-center justify-center text-gray-500">
					<div className="text-center">
						<p className="text-lg mb-2">No preview available</p>
						<p className="text-sm">
							Select a template, theme, and content JSON file to see the preview.
						</p>
						{template && !theme && <p className="text-sm text-amber-600 mt-2">Missing: theme</p>}
						{template && !content && (
							<p className="text-sm text-amber-600 mt-2">Missing: content</p>
						)}
						{!template && <p className="text-sm text-amber-600 mt-2">Missing: template</p>}
					</div>
				</div>
			)}
		</div>
	);
}
