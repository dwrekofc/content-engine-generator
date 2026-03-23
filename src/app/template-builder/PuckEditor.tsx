/**
 * Puck Editor wrapper for the Template Builder.
 *
 * Integrates the Puck visual editor with our template schema system.
 * Provides real-time JSON export, save/load, and template ↔ Puck data conversion.
 */

import { Puck } from "@measured/puck";
import "@measured/puck/puck.css";
import type { Data } from "@measured/puck";
import { useCallback, useMemo, useRef, useState } from "react";
import type { Template } from "@/lib/schemas/template-schema";
import { puckConfig } from "./puck-config";
import { puckDataToTemplate } from "./puck-to-template";
import { templateToPuckData } from "./template-to-puck";

interface PuckEditorProps {
	template: Template | null;
	onTemplateChange: (template: Template) => void;
}

const emptyData: Data = {
	root: { props: { title: "New Template" } },
	content: [],
};

export function PuckEditor({ template, onTemplateChange }: PuckEditorProps) {
	const [showJSON, setShowJSON] = useState(false);
	const [currentTemplate, setCurrentTemplate] = useState<Template | null>(template);
	const lastDataRef = useRef<Data | null>(null);

	const initialData = useMemo(() => {
		if (template) {
			try {
				return templateToPuckData(template);
			} catch {
				return emptyData;
			}
		}
		return emptyData;
	}, [template]);

	const handleChange = useCallback(
		(data: Data) => {
			lastDataRef.current = data;
			try {
				const t = puckDataToTemplate(data, template?.id);
				setCurrentTemplate(t);
				onTemplateChange(t);
			} catch {
				// Ignore transient invalid states during editing
			}
		},
		[template?.id, onTemplateChange],
	);

	const handleSave = useCallback(() => {
		if (!currentTemplate) return;
		const json = JSON.stringify(currentTemplate, null, 2);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${currentTemplate.id || "template"}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}, [currentTemplate]);

	return (
		<div className="h-[calc(100vh-100px)]">
			<Puck
				config={puckConfig}
				data={initialData}
				onChange={handleChange}
				onPublish={handleSave}
				headerTitle="Template Builder"
				renderHeaderActions={() => (
					<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
						<button
							type="button"
							onClick={() => setShowJSON(!showJSON)}
							style={{
								padding: "4px 12px",
								fontSize: 12,
								border: "1px solid #d1d5db",
								borderRadius: 4,
								background: showJSON ? "#eff6ff" : "white",
								cursor: "pointer",
							}}
						>
							{showJSON ? "Hide JSON" : "Show JSON"}
						</button>
					</div>
				)}
			/>

			{showJSON && currentTemplate && (
				<div
					style={{
						position: "fixed",
						bottom: 0,
						right: 0,
						width: 480,
						maxHeight: "50vh",
						overflow: "auto",
						background: "#1e293b",
						color: "#e2e8f0",
						padding: 16,
						fontSize: 11,
						fontFamily: "monospace",
						zIndex: 9999,
						borderTopLeftRadius: 8,
						boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
					}}
				>
					<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
						<span style={{ fontWeight: 700 }}>Template JSON</span>
						<button
							type="button"
							onClick={() => setShowJSON(false)}
							style={{ color: "#94a3b8", cursor: "pointer", background: "none", border: "none" }}
						>
							Close
						</button>
					</div>
					<pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
						{JSON.stringify(currentTemplate, null, 2)}
					</pre>
				</div>
			)}
		</div>
	);
}
