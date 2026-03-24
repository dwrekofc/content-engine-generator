/**
 * Visual overlay for smart alignment guide lines.
 *
 * Why: spec AC #6 requires guide lines to appear when elements are near
 * alignment targets. These lines help users align elements precisely without
 * manual coordinate entry. The overlay renders colored lines at snap positions
 * computed by arrangement-utils.snapToGuides().
 *
 * Puck has no public API for real-time drag position (only isDragging boolean),
 * so guides are rendered during keyboard nudge, numeric input positioning, and
 * best-effort during actual drags via DOM observation.
 */

import type { GuideLine } from "./arrangement-utils";

interface SmartGuideOverlayProps {
	guides: GuideLine[];
	containerWidth: number;
	containerHeight: number;
}

const EDGE_COLOR = "#3b82f6";
const CENTER_COLOR = "#f59e0b";

export function SmartGuideOverlay({
	guides,
	containerWidth,
	containerHeight,
}: SmartGuideOverlayProps) {
	if (guides.length === 0) return null;

	return (
		<svg
			role="img"
			aria-label="Smart alignment guides"
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: containerWidth,
				height: containerHeight,
				pointerEvents: "none",
				zIndex: 9999,
				overflow: "visible",
			}}
		>
			{guides.map((guide) => {
				const color = guide.type === "center" ? CENTER_COLOR : EDGE_COLOR;
				const dashArray = guide.type === "center" ? "4,4" : "none";

				if (guide.axis === "x") {
					return (
						<line
							key={`x-${guide.position}-${guide.type}`}
							x1={guide.position}
							y1={0}
							x2={guide.position}
							y2={containerHeight}
							stroke={color}
							strokeWidth={1}
							strokeDasharray={dashArray}
							opacity={0.8}
						/>
					);
				}
				return (
					<line
						key={`y-${guide.position}-${guide.type}`}
						x1={0}
						y1={guide.position}
						x2={containerWidth}
						y2={guide.position}
						stroke={color}
						strokeWidth={1}
						strokeDasharray={dashArray}
						opacity={0.8}
					/>
				);
			})}
		</svg>
	);
}
