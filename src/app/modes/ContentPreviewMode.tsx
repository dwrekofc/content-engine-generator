import { useCallback, useMemo } from "react";
import { renderHTML } from "@/lib/renderers/html-renderer";
import type { AppState } from "../App";
import { FilePickerBar } from "../components/FilePickerBar";

interface ContentPreviewModeProps {
	state: AppState;
	updateState: (updates: Partial<AppState>) => void;
}

/**
 * Overflow detection CSS + JS to inject into the preview HTML.
 * Mirrors the dev server's overflow detection (dev-server.ts:68-112):
 * red dashed outline + "OVERFLOW" badge on .ce-section/.ce-card elements
 * whose scroll dimensions exceed client dimensions.
 */
const OVERFLOW_CSS = `<style>
.ce-overflow { outline: 2px dashed #ef4444 !important; outline-offset: -2px; }
.ce-overflow-indicator {
  position: absolute; top: 2px; right: 2px; z-index: 9999;
  background: #ef4444; color: #fff; font-size: 10px; font-weight: 700;
  padding: 2px 6px; border-radius: 3px; font-family: monospace;
  pointer-events: none;
}
</style>`;

const OVERFLOW_SCRIPT = `<script>
(function() {
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

/**
 * Injects overflow detection CSS and JS into rendered HTML.
 * Same behavior as dev-server.ts injectDevTools() but without the SSE hot-reload
 * (iframe re-renders from React state changes instead).
 */
function injectOverflowDetection(html: string): string {
	return html
		.replace("</head>", `${OVERFLOW_CSS}\n</head>`)
		.replace("</body>", `${OVERFLOW_SCRIPT}\n</body>`);
}

/**
 * Content/Preview mode — shows live HTML preview of template + theme + content.
 *
 * Renders HTML inline via an iframe that updates when any input changes.
 * Includes overflow detection (red outline + badge) matching the dev server behavior.
 * "Open in New Tab" opens the rendered HTML in a separate browser tab.
 */
export function ContentPreviewMode({ state, updateState }: ContentPreviewModeProps) {
	const { template, theme, content } = state;

	const previewHTML = useMemo(() => {
		if (!template || !theme || !content) return null;
		try {
			const html = renderHTML(template, theme, content);
			return injectOverflowDetection(html);
		} catch {
			return null;
		}
	}, [template, theme, content]);

	const handleOpenInNewTab = useCallback(() => {
		if (!previewHTML) return;
		const blob = new Blob([previewHTML], { type: "text/html" });
		const url = URL.createObjectURL(blob);
		window.open(url, "_blank");
		// Revoke after a delay to allow the tab to load
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	}, [previewHTML]);

	return (
		<div className="flex flex-col h-[calc(100vh-52px)]">
			<FilePickerBar state={state} updateState={updateState} />

			{previewHTML ? (
				<div className="flex-1 bg-gray-100 p-4 overflow-auto">
					<div className="mx-auto" style={{ maxWidth: 1320 }}>
						<div className="flex justify-end mb-2">
							<button
								type="button"
								onClick={handleOpenInNewTab}
								className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors"
							>
								Open in New Tab
							</button>
						</div>
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
						{!template && <p className="text-sm text-amber-600 mt-2">Missing: template</p>}
						{!theme && <p className="text-sm text-amber-600 mt-2">Missing: theme</p>}
						{!content && <p className="text-sm text-amber-600 mt-2">Missing: content</p>}
					</div>
				</div>
			)}
		</div>
	);
}
