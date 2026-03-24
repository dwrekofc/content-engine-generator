/**
 * Puck component configuration for the Template Builder.
 *
 * Maps the template schema's layout primitives and field types to Puck components.
 * Each component renders a wireframe preview using real CSS grid/flex — ensuring
 * structural consistency with the HTML renderer (per template-builder-wireframe.md).
 *
 * Nesting uses Puck's slot system: Section has a `children` slot that accepts
 * other Sections, Cards, and Fields. This enables 3+ levels of nesting.
 */

import type { Config } from "@measured/puck";
import type { CSSProperties, ReactNode } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any -- Puck's render signature uses `any` props */

// ── Wireframe styles ────────────────────────────────────────────────

const wireframeBox: CSSProperties = {
	border: "2px dashed #cbd5e1",
	borderRadius: 6,
	padding: 8,
	minHeight: 40,
	position: "relative",
};

const wireframeLabel: CSSProperties = {
	fontSize: 10,
	fontWeight: 700,
	fontFamily: "monospace",
	color: "#94a3b8",
	textTransform: "uppercase",
	letterSpacing: "0.05em",
	position: "absolute",
	top: 2,
	left: 6,
};

const fieldBox = (color: string): CSSProperties => ({
	background: `${color}15`,
	border: `1px solid ${color}40`,
	borderRadius: 4,
	padding: "8px 12px",
	minHeight: 32,
	display: "flex",
	alignItems: "center",
	gap: 8,
});

const fieldLabel: CSSProperties = {
	fontSize: 11,
	fontWeight: 600,
	fontFamily: "monospace",
	textTransform: "uppercase",
};

// ── Helper: Slot render wrapper ─────────────────────────────────────

function SlotRender({ children }: { children: ReactNode }) {
	return <div style={{ minHeight: 24 }}>{children}</div>;
}

/**
 * CSS for layer order badges on free-position children.
 *
 * Why: spec AC #4 requires layer order to be visually reflected in the wireframe.
 * DOM order = z-order (later children paint on top). CSS counters number each
 * direct child within a free-position container so the user can see stacking order.
 */
const layerBadgeCSS = `
.ce-free-pos { counter-reset: layer-order; }
.ce-free-pos > * { counter-increment: layer-order; }
.ce-free-pos > *::after {
  content: "z" counter(layer-order);
  position: absolute;
  top: -6px;
  right: -6px;
  background: #ef4444;
  color: #fff;
  font-size: 8px;
  font-family: monospace;
  font-weight: 700;
  min-width: 18px;
  height: 14px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  z-index: 10000;
  pointer-events: none;
  line-height: 1;
}
`;

// ── Layout CSS from section config ──────────────────────────────────

function getLayoutStyle(
	layout: string,
	flexDirection?: string,
	flexGap?: number,
	flexAlign?: string,
	gridColumns?: number,
	gridRows?: number,
	gridGap?: number,
): CSSProperties {
	switch (layout) {
		case "flex":
			return {
				display: "flex",
				flexDirection: (flexDirection as CSSProperties["flexDirection"]) || "column",
				gap: flexGap ?? 8,
				alignItems:
					flexAlign === "center" ? "center" : flexAlign === "end" ? "flex-end" : "stretch",
			};
		case "grid":
			return {
				display: "grid",
				gridTemplateColumns: `repeat(${gridColumns || 2}, 1fr)`,
				gridTemplateRows: `repeat(${gridRows || 1}, auto)`,
				gap: gridGap ?? 8,
			};
		case "stack":
			return {
				position: "relative",
				minHeight: 80,
			};
		case "free-position":
			return {
				position: "relative",
				minHeight: 120,
			};
		default: // "section" — vertical block
			return {
				display: "flex",
				flexDirection: "column",
				gap: 8,
			};
	}
}

// ── Puck Config ─────────────────────────────────────────────────────

// ── Free-position absolute style helper ─────────────────────────────

function getFreePositionStyle(props: any): CSSProperties | undefined {
	if (props.posX != null && props.posY != null && props.posWidth && props.posHeight) {
		return {
			position: "absolute",
			left: props.posX,
			top: props.posY,
			width: props.posWidth,
			height: props.posHeight,
		};
	}
	return undefined;
}

// Helper to make a field component render function
function makeFieldRender(typeName: string, color: string) {
	return (props: any) => {
		const freeStyle = getFreePositionStyle(props);
		return (
			<div
				style={{
					...(typeName === "FEATURED CONTENT"
						? { ...fieldBox(color), minHeight: 60 }
						: fieldBox(color)),
					...freeStyle,
				}}
			>
				<span style={{ ...fieldLabel, color }}>{typeName}</span>
				{props.required && <span style={{ color: "#ef4444", fontSize: 10 }}>*</span>}
				{props.fieldId && (
					<span style={{ fontSize: 9, color: "#94a3b8" }}>({props.fieldId})</span>
				)}
			</div>
		);
	};
}

// ── Free-position coordinate fields ─────────────────────────────────
// These appear on all droppable components. Only meaningful when the
// component sits inside a free-position container.

const positionFields = {
	posX: { type: "number" as const, label: "X Position", min: 0 },
	posY: { type: "number" as const, label: "Y Position", min: 0 },
	posWidth: { type: "number" as const, label: "Width", min: 1 },
	posHeight: { type: "number" as const, label: "Height", min: 1 },
};

const positionDefaults = { posX: 0, posY: 0, posWidth: 200, posHeight: 60 };

// Standard field config (shared by all 7 field types)
const fieldFields = {
	fieldId: { type: "text" as const, label: "Field ID" },
	required: {
		type: "radio" as const,
		label: "Required",
		options: [
			{ label: "Yes", value: true },
			{ label: "No", value: false },
		],
	},
	label: { type: "text" as const, label: "Label" },
	...positionFields,
};

export const puckConfig: Config = {
	categories: {
		layout: {
			title: "Layout",
			components: ["Page", "Section", "Card"],
			defaultExpanded: true,
		},
		fields: {
			title: "Fields",
			components: [
				"TitleField",
				"SubtitleField",
				"ParagraphField",
				"ButtonField",
				"FeaturedContentField",
				"FeaturedContentCaptionField",
				"BackgroundField",
			],
			defaultExpanded: true,
		},
	},
	components: {
		// ── Page ────────────────────────────────────────────────────────
		Page: {
			label: "Page / Slide",
			defaultProps: { name: "Untitled Page" },
			fields: {
				name: { type: "text", label: "Page Name" },
				sections: {
					type: "slot",
					allow: ["Section"],
				},
			},
			render: (props: any) => (
				<div
					style={{
						border: "3px solid #3b82f6",
						borderRadius: 8,
						padding: 12,
						marginBottom: 16,
						background: "#f8fafc",
						position: "relative",
					}}
				>
					<div
						style={{
							fontSize: 12,
							fontWeight: 700,
							color: "#3b82f6",
							marginBottom: 8,
							fontFamily: "monospace",
						}}
					>
						PAGE: {props.name}
					</div>
					<SlotRender>{props.sections()}</SlotRender>
				</div>
			),
		},

		// ── Section ─────────────────────────────────────────────────────
		Section: {
			label: "Section",
			defaultProps: {
				name: "",
				layout: "section",
				flexDirection: "column",
				flexGap: 8,
				flexAlign: "stretch",
				gridColumns: 2,
				gridRows: 1,
				gridGap: 8,
				...positionDefaults,
				posWidth: 300,
				posHeight: 200,
			},
			fields: {
				name: { type: "text", label: "Section Name" },
				layout: {
					type: "select",
					label: "Layout",
					options: [
						{ label: "Block (vertical)", value: "section" },
						{ label: "Flex", value: "flex" },
						{ label: "Grid", value: "grid" },
						{ label: "Stack (layered)", value: "stack" },
						{ label: "Free Position", value: "free-position" },
					],
				},
				flexDirection: {
					type: "select",
					label: "Flex Direction",
					options: [
						{ label: "Column", value: "column" },
						{ label: "Row", value: "row" },
					],
				},
				flexGap: { type: "number", label: "Flex Gap", min: 0 },
				flexAlign: {
					type: "select",
					label: "Flex Align",
					options: [
						{ label: "Stretch", value: "stretch" },
						{ label: "Start", value: "start" },
						{ label: "Center", value: "center" },
						{ label: "End", value: "end" },
					],
				},
				gridColumns: { type: "number", label: "Grid Columns", min: 1, max: 12 },
				gridRows: { type: "number", label: "Grid Rows", min: 1, max: 12 },
				gridGap: { type: "number", label: "Grid Gap", min: 0 },
				...positionFields,
				children: {
					type: "slot",
					allow: [
						"Section",
						"Card",
						"TitleField",
						"SubtitleField",
						"ParagraphField",
						"ButtonField",
						"FeaturedContentField",
						"FeaturedContentCaptionField",
						"BackgroundField",
					],
				},
			},
			render: (props: any) => {
				const {
					name,
					layout,
					flexDirection,
					flexGap,
					flexAlign,
					gridColumns,
					gridRows,
					gridGap,
					children,
				} = props;
				const layoutStyle = getLayoutStyle(
					layout,
					flexDirection,
					flexGap,
					flexAlign,
					gridColumns,
					gridRows,
					gridGap,
				);
				const borderColor =
					layout === "flex"
						? "#8b5cf6"
						: layout === "grid"
							? "#10b981"
							: layout === "stack"
								? "#f59e0b"
								: layout === "free-position"
									? "#ef4444"
									: "#64748b";

				const freeStyle = getFreePositionStyle(props);
				const isFreePos = layout === "free-position";

				return (
					<div
						style={{
							...wireframeBox,
							borderColor,
							marginBottom: 8,
							paddingTop: 20,
							...freeStyle,
						}}
					>
						{/* Inject layer badge CSS for free-position containers */}
						{isFreePos && <style>{layerBadgeCSS}</style>}
						<span style={{ ...wireframeLabel, color: borderColor }}>
							{layout.toUpperCase()}
							{name ? `: ${name}` : ""}
						</span>
						<div style={layoutStyle} className={isFreePos ? "ce-free-pos" : undefined}>
							<SlotRender>{children()}</SlotRender>
						</div>
					</div>
				);
			},
		},

		// ── Card ────────────────────────────────────────────────────────
		Card: {
			label: "Card",
			defaultProps: { name: "", ...positionDefaults, posWidth: 200, posHeight: 120 },
			fields: {
				name: { type: "text", label: "Card Name" },
				...positionFields,
				children: {
					type: "slot",
					allow: [
						"TitleField",
						"SubtitleField",
						"ParagraphField",
						"ButtonField",
						"FeaturedContentField",
						"BackgroundField",
					],
					// No FeaturedContentCaptionField in cards per spec
				},
			},
			render: (props: any) => {
				const freeStyle = getFreePositionStyle(props);
				return (
					<div
						style={{
							...wireframeBox,
							borderColor: "#06b6d4",
							borderStyle: "solid",
							paddingTop: 20,
							...freeStyle,
						}}
					>
						<span style={{ ...wireframeLabel, color: "#06b6d4" }}>
							CARD{props.name ? `: ${props.name}` : ""}
						</span>
						<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
							<SlotRender>{props.children()}</SlotRender>
						</div>
					</div>
				);
			},
		},

		// ── Field Components ────────────────────────────────────────────

		TitleField: {
			label: "Title",
			defaultProps: { fieldId: "", required: true, label: "", ...positionDefaults },
			fields: fieldFields,
			render: makeFieldRender("TITLE", "#3b82f6"),
		},
		SubtitleField: {
			label: "Subtitle",
			defaultProps: { fieldId: "", required: false, label: "", ...positionDefaults },
			fields: fieldFields,
			render: makeFieldRender("SUBTITLE", "#6366f1"),
		},
		ParagraphField: {
			label: "Paragraph",
			defaultProps: { fieldId: "", required: false, label: "", ...positionDefaults },
			fields: fieldFields,
			render: makeFieldRender("PARAGRAPH", "#64748b"),
		},
		ButtonField: {
			label: "Button",
			defaultProps: { fieldId: "", required: false, label: "", ...positionDefaults },
			fields: fieldFields,
			render: makeFieldRender("BUTTON", "#10b981"),
		},
		FeaturedContentField: {
			label: "Featured Content",
			defaultProps: { fieldId: "", required: false, label: "", ...positionDefaults, posHeight: 80 },
			fields: fieldFields,
			render: makeFieldRender("FEATURED CONTENT", "#f59e0b"),
		},
		FeaturedContentCaptionField: {
			label: "Caption",
			defaultProps: { fieldId: "", required: false, label: "", ...positionDefaults },
			fields: fieldFields,
			render: makeFieldRender("CAPTION", "#a855f7"),
		},
		BackgroundField: {
			label: "Background",
			defaultProps: { fieldId: "", required: false, label: "", ...positionDefaults },
			fields: fieldFields,
			render: makeFieldRender("BACKGROUND", "#78716c"),
		},
	},
};
