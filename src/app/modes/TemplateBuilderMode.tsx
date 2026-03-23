import type { AppState } from "../App";
import { FilePickerBar } from "../components/FilePickerBar";

interface TemplateBuilderModeProps {
	state: AppState;
	updateState: (updates: Partial<AppState>) => void;
}

/**
 * Template Builder mode — visual editor for creating/editing layout templates.
 * Phase 1: Puck editor integration placeholder. Full implementation in P6-2/P6-3/P6-4.
 */
export function TemplateBuilderMode({ state, updateState }: TemplateBuilderModeProps) {
	return (
		<div className="flex flex-col h-full">
			<FilePickerBar state={state} updateState={updateState} />

			<div className="flex-1 flex items-center justify-center p-8">
				{state.template ? (
					<div className="w-full max-w-4xl">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Template: {state.template.name}
						</h2>
						<div className="bg-white rounded-lg border border-gray-200 p-6">
							<p className="text-sm text-gray-600 mb-4">
								{state.template.pages.length} page{state.template.pages.length !== 1 ? "s" : ""}
							</p>
							<div className="space-y-3">
								{state.template.pages.map((page, i) => (
									<div key={page.id} className="border border-gray-100 rounded p-3">
										<span className="text-sm font-medium text-gray-800">
											{page.name || `Page ${i + 1}`}
										</span>
										<span className="text-xs text-gray-400 ml-2">
											{page.sections.length} section{page.sections.length !== 1 ? "s" : ""}
										</span>
									</div>
								))}
							</div>
							<p className="text-xs text-gray-400 mt-4">Puck editor integration coming in P6-2.</p>
						</div>
					</div>
				) : (
					<div className="text-center text-gray-500">
						<p className="text-lg mb-2">No template loaded</p>
						<p className="text-sm">Select a template JSON file above to begin editing.</p>
					</div>
				)}
			</div>
		</div>
	);
}
