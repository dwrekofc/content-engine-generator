import { useCallback, useState } from "react";
import type { AppState } from "../App";
import { FilePickerBar } from "../components/FilePickerBar";

type OutputFormat = "pptx" | "pdf" | "html-static";
type GenerationStatus = "idle" | "generating" | "done" | "error";

interface GenerateModeProps {
	state: AppState;
	updateState: (updates: Partial<AppState>) => void;
}

const FORMAT_LABELS: Record<OutputFormat, string> = {
	pptx: "PowerPoint (PPTX)",
	pdf: "PDF Document",
	"html-static": "HTML Static Site",
};

const FORMAT_DESCRIPTIONS: Record<OutputFormat, string> = {
	pptx: "Uses layout engine for absolute positioning on 10×7.5in slides",
	pdf: "Renders HTML preview via Playwright and prints to PDF (A4)",
	"html-static": "Saves the HTML preview as deployable static files",
};

const FILE_EXTENSIONS: Record<OutputFormat, string> = {
	pptx: "pptx",
	pdf: "pdf",
	"html-static": "html",
};

const MIME_TYPES: Record<OutputFormat, string> = {
	pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	pdf: "application/pdf",
	"html-static": "text/html",
};

/**
 * Triggers a browser file download from a Blob.
 */
function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Generate mode — select output format, call the API server, and download results.
 *
 * All three formats (PPTX, PDF, HTML static) are generated server-side via
 * POST /api/generate. The API server must be running (`bun run dev:api`).
 */
export function GenerateMode({ state, updateState }: GenerateModeProps) {
	const [format, setFormat] = useState<OutputFormat>("html-static");
	const [status, setStatus] = useState<GenerationStatus>("idle");
	const [message, setMessage] = useState("");

	const { template, theme, content } = state;
	const canGenerate = template && theme && content;

	const handleGenerate = useCallback(async () => {
		if (!template || !theme || !content) return;

		setStatus("generating");
		setMessage("");

		try {
			const response = await fetch("/api/generate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ format, template, theme, content }),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => null);
				const errorMsg = errorData?.error || `Server returned ${response.status}`;
				throw new Error(errorMsg);
			}

			const blob = await response.blob();
			// Use response headers to determine actual type (API may return zip for multi-file html-static)
			const contentType = response.headers.get("Content-Type") || MIME_TYPES[format];
			const contentDisp = response.headers.get("Content-Disposition");
			const filenameMatch = contentDisp?.match(/filename="([^"]+)"/);
			const filename = filenameMatch?.[1] || `output.${FILE_EXTENSIONS[format]}`;
			const typedBlob = new Blob([blob], { type: contentType });
			downloadBlob(typedBlob, filename);

			setStatus("done");
			setMessage(`${FORMAT_LABELS[format]} generated and downloaded.`);
		} catch (err) {
			setStatus("error");
			if (err instanceof TypeError && err.message.includes("fetch")) {
				setMessage("Cannot reach API server. Start it with: bun run dev:api");
			} else {
				setMessage(err instanceof Error ? err.message : String(err));
			}
		}
	}, [template, theme, content, format]);

	return (
		<div className="flex flex-col h-full">
			<FilePickerBar state={state} updateState={updateState} />

			<div className="flex-1 flex items-center justify-center p-8">
				<div className="w-full max-w-lg">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">Generate Output</h2>

					{/* Format selector */}
					<div className="space-y-3 mb-6">
						{(Object.keys(FORMAT_LABELS) as OutputFormat[]).map((f) => (
							<label
								key={f}
								className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
									format === f
										? "border-blue-500 bg-blue-50"
										: "border-gray-200 bg-white hover:border-gray-300"
								}`}
							>
								<input
									type="radio"
									name="format"
									value={f}
									checked={format === f}
									onChange={() => setFormat(f)}
									className="mt-1"
								/>
								<div>
									<span className="text-sm font-medium text-gray-900">{FORMAT_LABELS[f]}</span>
									<p className="text-xs text-gray-500 mt-0.5">{FORMAT_DESCRIPTIONS[f]}</p>
								</div>
							</label>
						))}
					</div>

					{/* Generate button */}
					<button
						type="button"
						onClick={handleGenerate}
						disabled={!canGenerate || status === "generating"}
						className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
					>
						{status === "generating" ? "Generating..." : "Generate"}
					</button>

					{!canGenerate && (
						<p className="text-sm text-amber-600 mt-3 text-center">
							Select template, theme, and content files first.
						</p>
					)}

					{/* Status */}
					{message && (
						<div
							className={`mt-4 p-3 rounded-lg text-sm ${
								status === "error"
									? "bg-red-50 text-red-700 border border-red-200"
									: "bg-green-50 text-green-700 border border-green-200"
							}`}
						>
							{message}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
