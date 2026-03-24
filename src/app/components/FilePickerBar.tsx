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

	const saveFile = useCallback((data: unknown, filename: string) => {
		const json = JSON.stringify(data, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	const saveTheme = useCallback(() => {
		if (state.theme) {
			saveFile(state.theme, state.themePath || "theme.json");
		}
	}, [state.theme, state.themePath, saveFile]);

	const saveContent = useCallback(() => {
		if (state.content) {
			saveFile(state.content, state.contentPath || "content.json");
		}
	}, [state.content, state.contentPath, saveFile]);

	return (
		<div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6 flex-wrap">
			<FilePicker
				label="Template"
				currentPath={state.templatePath}
				onFileSelected={handleTemplate}
			/>
			<div className="flex items-center gap-2">
				<FilePicker label="Theme" currentPath={state.themePath} onFileSelected={handleTheme} />
				{state.theme && (
					<button
						type="button"
						onClick={saveTheme}
						className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
						title="Save theme JSON"
					>
						Save
					</button>
				)}
			</div>
			<div className="flex items-center gap-2">
				<FilePicker
					label="Content"
					currentPath={state.contentPath}
					onFileSelected={handleContent}
				/>
				{state.content && (
					<button
						type="button"
						onClick={saveContent}
						className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
						title="Save content JSON"
					>
						Save
					</button>
				)}
			</div>
		</div>
	);
}
