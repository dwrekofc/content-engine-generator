import { useCallback, useRef } from "react";

interface FilePickerProps {
	label: string;
	accept?: string;
	currentPath: string | null;
	onFileSelected: (path: string, content: string) => void;
}

/**
 * File picker for selecting JSON files from the local filesystem.
 * Uses a standard file input — works in any browser without special APIs.
 */
export function FilePicker({
	label,
	accept = ".json",
	currentPath,
	onFileSelected,
}: FilePickerProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const handleChange = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			const text = await file.text();
			onFileSelected(file.name, text);

			// Reset input so the same file can be re-selected
			if (inputRef.current) inputRef.current.value = "";
		},
		[onFileSelected],
	);

	return (
		<div className="flex items-center gap-2">
			<span className="text-sm font-medium text-gray-700 min-w-[80px]">{label}</span>
			<label className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer">
				{currentPath ? shortName(currentPath) : "Choose file..."}
				<input
					ref={inputRef}
					type="file"
					accept={accept}
					onChange={handleChange}
					className="hidden"
				/>
			</label>
		</div>
	);
}

function shortName(path: string): string {
	const parts = path.split("/");
	return parts[parts.length - 1] || path;
}
