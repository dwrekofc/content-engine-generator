import { useCallback } from "react";
import { BrandThemeSchema } from "@/lib/schemas/brand-theme";
import { ContentSchema } from "@/lib/schemas/content-schema";
import { TemplateSchema } from "@/lib/schemas/template-schema";
import type { AppState } from "../App";
import { FilePicker } from "./FilePicker";

interface FilePickerBarProps {
	state: AppState;
	updateState: (updates: Partial<AppState>) => void;
}

/**
 * Shared file picker bar for selecting template, theme, and content JSON files.
 * Validates JSON against Zod schemas before accepting.
 */
export function FilePickerBar({ state, updateState }: FilePickerBarProps) {
	const handleTemplate = useCallback(
		(name: string, text: string) => {
			try {
				const parsed = JSON.parse(text);
				const template = TemplateSchema.parse(parsed);
				updateState({ template, templatePath: name });
			} catch (err) {
				alert(`Invalid template JSON: ${err instanceof Error ? err.message : String(err)}`);
			}
		},
		[updateState],
	);

	const handleTheme = useCallback(
		(name: string, text: string) => {
			try {
				const parsed = JSON.parse(text);
				const theme = BrandThemeSchema.parse(parsed);
				updateState({ theme, themePath: name });
			} catch (err) {
				alert(`Invalid theme JSON: ${err instanceof Error ? err.message : String(err)}`);
			}
		},
		[updateState],
	);

	const handleContent = useCallback(
		(name: string, text: string) => {
			try {
				const parsed = JSON.parse(text);
				const content = ContentSchema.parse(parsed);
				updateState({ content, contentPath: name });
			} catch (err) {
				alert(`Invalid content JSON: ${err instanceof Error ? err.message : String(err)}`);
			}
		},
		[updateState],
	);

	return (
		<div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 flex-wrap">
			<FilePicker
				label="Template"
				currentPath={state.templatePath}
				onFileSelected={handleTemplate}
			/>
			<FilePicker label="Theme" currentPath={state.themePath} onFileSelected={handleTheme} />
			<FilePicker label="Content" currentPath={state.contentPath} onFileSelected={handleContent} />
		</div>
	);
}
