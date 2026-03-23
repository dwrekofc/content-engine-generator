import { useCallback } from "react";
import type { Template } from "@/lib/schemas/template-schema";
import type { AppState } from "../App";
import { FilePickerBar } from "../components/FilePickerBar";
import { PuckEditor } from "../template-builder/PuckEditor";

interface TemplateBuilderModeProps {
	state: AppState;
	updateState: (updates: Partial<AppState>) => void;
}

/**
 * Template Builder mode — Puck-based visual editor for creating/editing templates.
 *
 * Integrates Puck editor with wireframe preview rendering. Drag-and-drop sections,
 * choose layouts (flex/grid/stack/free-position), nest containers, add field slots.
 * Real-time JSON template schema output. Save/load template files.
 */
export function TemplateBuilderMode({ state, updateState }: TemplateBuilderModeProps) {
	const handleTemplateChange = useCallback(
		(template: Template) => {
			updateState({ template });
		},
		[updateState],
	);

	return (
		<div className="flex flex-col h-full">
			<FilePickerBar state={state} updateState={updateState} />
			<PuckEditor template={state.template} onTemplateChange={handleTemplateChange} />
		</div>
	);
}
