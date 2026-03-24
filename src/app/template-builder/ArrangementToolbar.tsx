/**
 * Arrangement toolbar for the template builder.
 *
 * Why: Template authors need design-tool-style spatial controls — alignment,
 * distribution, layer order, precise positioning, snap-to-grid, size matching,
 * and grouping. This toolbar integrates with Puck via the usePuck() hook to
 * read the current selection and dispatch data mutations.
 *
 * The toolbar is rendered inside the Puck component tree so usePuck() has
 * access to editor state. It appears as a fixed bottom panel when an element
 * is selected.
 */

import { usePuck } from "@measured/puck";
import type { ComponentData, Data } from "@measured/puck";
import { useCallback, useState } from "react";
import {
	type AlignReference,
	type HAlign,
	type Rect,
	type VAlign,
	alignHorizontal,
	alignVertical,
	distributeHorizontal,
	distributeVertical,
	matchHeight,
	matchSize,
	matchWidth,
	nudge,
	snapRectToGrid,
} from "./arrangement-utils";

// ── Styles ───────────────────────────────────────────────────────────

const toolbarStyle: React.CSSProperties = {
	position: "fixed",
	bottom: 0,
	left: 0,
	right: 0,
	background: "#1e293b",
	color: "#e2e8f0",
	padding: "8px 16px",
	display: "flex",
	alignItems: "center",
	gap: 12,
	fontSize: 11,
	fontFamily: "monospace",
	zIndex: 9998,
	borderTop: "1px solid #334155",
	flexWrap: "wrap",
};

const sectionStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: 4,
	borderRight: "1px solid #475569",
	paddingRight: 12,
};

const btnStyle: React.CSSProperties = {
	padding: "2px 6px",
	fontSize: 10,
	background: "#334155",
	color: "#e2e8f0",
	border: "1px solid #475569",
	borderRadius: 3,
	cursor: "pointer",
	whiteSpace: "nowrap",
};

const inputStyle: React.CSSProperties = {
	width: 50,
	padding: "2px 4px",
	fontSize: 10,
	background: "#0f172a",
	color: "#e2e8f0",
	border: "1px solid #475569",
	borderRadius: 3,
	textAlign: "right",
};

const labelStyle: React.CSSProperties = {
	fontSize: 9,
	color: "#94a3b8",
	textTransform: "uppercase",
};

// ── Helpers ──────────────────────────────────────────────────────────

/** Extract a Rect from a Puck component's position props. */
function getRect(comp: ComponentData): Rect {
	const p = comp.props;
	return {
		x: (p.posX as number) ?? 0,
		y: (p.posY as number) ?? 0,
		width: (p.posWidth as number) ?? 200,
		height: (p.posHeight as number) ?? 60,
	};
}

/** Apply a Rect back onto a Puck component's props (immutable). */
function applyRect(comp: ComponentData, rect: Rect): ComponentData {
	return {
		...comp,
		props: {
			...comp.props,
			posX: rect.x,
			posY: rect.y,
			posWidth: rect.width,
			posHeight: rect.height,
		},
	};
}

/**
 * Find the parent component and slot name for a given component ID by walking
 * the Puck data tree. Returns null if the component is at the root level.
 */
function findParentAndSlot(
	data: Data,
	targetId: string,
): { parent: ComponentData; slotName: string; siblings: ComponentData[] } | null {
	// Check root content
	for (const comp of data.content) {
		const result = searchComponent(comp, targetId);
		if (result) return result;
	}
	return null;
}

function searchComponent(
	comp: ComponentData,
	targetId: string,
): { parent: ComponentData; slotName: string; siblings: ComponentData[] } | null {
	// Check each prop that might be a slot (array of ComponentData)
	for (const [key, value] of Object.entries(comp.props)) {
		if (Array.isArray(value)) {
			const arr = value as ComponentData[];
			for (let i = 0; i < arr.length; i++) {
				if (arr[i].props?.id === targetId) {
					return { parent: comp, slotName: key, siblings: arr };
				}
				// Recurse into children
				const found = searchComponent(arr[i], targetId);
				if (found) return found;
			}
		}
	}
	return null;
}

/** Check if a parent component uses free-position layout. */
function isParentFreePosition(parent: ComponentData): boolean {
	return parent.props?.layout === "free-position";
}

/**
 * Deep-update a specific component by ID within the data tree.
 * Returns a new Data object with the component replaced.
 */
function updateComponentInData(
	data: Data,
	targetId: string,
	updater: (comp: ComponentData) => ComponentData,
): Data {
	return {
		...data,
		content: data.content.map((comp) => updateComponentInTree(comp, targetId, updater)),
	};
}

function updateComponentInTree(
	comp: ComponentData,
	targetId: string,
	updater: (comp: ComponentData) => ComponentData,
): ComponentData {
	if (comp.props?.id === targetId) {
		return updater(comp);
	}
	let changed = false;
	const newProps = { ...comp.props };
	for (const [key, value] of Object.entries(comp.props)) {
		if (Array.isArray(value)) {
			const arr = value as ComponentData[];
			const newArr = arr.map((child) => {
				const updated = updateComponentInTree(child, targetId, updater);
				if (updated !== child) changed = true;
				return updated;
			});
			if (changed) newProps[key] = newArr;
		}
	}
	return changed ? { ...comp, props: newProps } : comp;
}

/**
 * Update all siblings in a slot by applying transformed rects.
 */
function updateSiblingsInData(
	data: Data,
	parentId: string,
	slotName: string,
	updater: (siblings: ComponentData[]) => ComponentData[],
): Data {
	return {
		...data,
		content: data.content.map((comp) =>
			updateSlotInTree(comp, parentId, slotName, updater),
		),
	};
}

function updateSlotInTree(
	comp: ComponentData,
	parentId: string,
	slotName: string,
	updater: (siblings: ComponentData[]) => ComponentData[],
): ComponentData {
	if (comp.props?.id === parentId) {
		const slot = comp.props[slotName] as ComponentData[] | undefined;
		if (Array.isArray(slot)) {
			return {
				...comp,
				props: { ...comp.props, [slotName]: updater(slot) },
			};
		}
		return comp;
	}
	let changed = false;
	const newProps = { ...comp.props };
	for (const [key, value] of Object.entries(comp.props)) {
		if (Array.isArray(value)) {
			const arr = value as ComponentData[];
			const newArr = arr.map((child) => {
				const updated = updateSlotInTree(child, parentId, slotName, updater);
				if (updated !== child) changed = true;
				return updated;
			});
			if (changed) newProps[key] = newArr;
		}
	}
	return changed ? { ...comp, props: newProps } : comp;
}

// ── Component ────────────────────────────────────────────────────────

export function ArrangementToolbar() {
	const { appState, dispatch, selectedItem } = usePuck();
	const [snapEnabled, setSnapEnabled] = useState(false);
	const [gridSize, setGridSize] = useState(10);
	const [alignRef, setAlignRef] = useState<AlignReference>("selection");

	const data = appState.data;
	const selected = selectedItem;

	// Find parent context for the selected item
	const parentCtx = selected?.props?.id
		? findParentAndSlot(data, selected.props.id as string)
		: null;

	const isFreePos = parentCtx ? isParentFreePosition(parentCtx.parent) : false;

	const setData = useCallback(
		(newData: Data) => {
			dispatch({ type: "setData", data: newData });
		},
		[dispatch],
	);

	// ── Position update (single element) ─────────────────────────────

	const updatePosition = useCallback(
		(field: keyof Rect, value: number) => {
			if (!selected?.props?.id) return;
			const id = selected.props.id as string;
			const rect = getRect(selected);
			const newRect = { ...rect, [field]: value };
			const snapped = snapEnabled ? snapRectToGrid(newRect, gridSize) : newRect;
			setData(updateComponentInData(data, id, (comp) => applyRect(comp, snapped)));
		},
		[selected, data, snapEnabled, gridSize, setData],
	);

	// ── Layer order ──────────────────────────────────────────────────

	const moveLayer = useCallback(
		(direction: "up" | "down" | "top" | "bottom") => {
			if (!selected?.props?.id || !parentCtx) return;
			const { parent, slotName, siblings } = parentCtx;
			const idx = siblings.findIndex(
				(s) => s.props?.id === (selected.props.id as string),
			);
			if (idx === -1) return;

			setData(
				updateSiblingsInData(
					data,
					parent.props.id as string,
					slotName,
					(sibs) => {
						const arr = [...sibs];
						const [item] = arr.splice(idx, 1);
						let target: number;
						switch (direction) {
							case "up":
								target = Math.min(idx + 1, arr.length);
								break;
							case "down":
								target = Math.max(idx - 1, 0);
								break;
							case "top":
								target = arr.length;
								break;
							case "bottom":
								target = 0;
								break;
						}
						arr.splice(target, 0, item);
						return arr;
					},
				),
			);
		},
		[selected, parentCtx, data, setData],
	);

	// ── Alignment (all siblings in free-position container) ──────────

	const applyAlignment = useCallback(
		(hAlign?: HAlign, vAlign?: VAlign) => {
			if (!parentCtx || !isFreePos) return;
			const { parent, slotName, siblings } = parentCtx;
			const rects = siblings.map(getRect);
			const parentRect: Rect = {
				x: 0,
				y: 0,
				width: (parent.props.posWidth as number) ?? 960,
				height: (parent.props.posHeight as number) ?? 540,
			};

			let aligned = rects;
			if (hAlign) aligned = alignHorizontal(aligned, hAlign, alignRef, parentRect);
			if (vAlign) aligned = alignVertical(aligned, vAlign, alignRef, parentRect);

			setData(
				updateSiblingsInData(
					data,
					parent.props.id as string,
					slotName,
					(sibs) => sibs.map((s, i) => applyRect(s, aligned[i])),
				),
			);
		},
		[parentCtx, isFreePos, alignRef, data, setData],
	);

	// ── Distribution ─────────────────────────────────────────────────

	const applyDistribution = useCallback(
		(axis: "horizontal" | "vertical") => {
			if (!parentCtx || !isFreePos) return;
			const { parent, slotName, siblings } = parentCtx;
			const rects = siblings.map(getRect);
			const distributed =
				axis === "horizontal"
					? distributeHorizontal(rects)
					: distributeVertical(rects);

			setData(
				updateSiblingsInData(
					data,
					parent.props.id as string,
					slotName,
					(sibs) => sibs.map((s, i) => applyRect(s, distributed[i])),
				),
			);
		},
		[parentCtx, isFreePos, data, setData],
	);

	// ── Size matching ────────────────────────────────────────────────

	const applySizeMatch = useCallback(
		(mode: "width" | "height" | "both") => {
			if (!parentCtx || !isFreePos) return;
			const { parent, slotName, siblings } = parentCtx;
			const rects = siblings.map(getRect);
			const matched =
				mode === "width"
					? matchWidth(rects)
					: mode === "height"
						? matchHeight(rects)
						: matchSize(rects);

			setData(
				updateSiblingsInData(
					data,
					parent.props.id as string,
					slotName,
					(sibs) => sibs.map((s, i) => applyRect(s, matched[i])),
				),
			);
		},
		[parentCtx, isFreePos, data, setData],
	);

	// ── Grouping ─────────────────────────────────────────────────────

	const groupSiblings = useCallback(() => {
		if (!parentCtx || !isFreePos) return;
		const { parent, slotName, siblings } = parentCtx;
		if (siblings.length < 2) return;

		// Create a new Section that wraps all siblings
		const groupId = `group-${Date.now()}`;
		const groupSection: ComponentData = {
			type: "Section",
			props: {
				id: groupId,
				name: "Group",
				layout: "free-position",
				flexDirection: "column",
				flexGap: 8,
				flexAlign: "stretch",
				gridColumns: 2,
				gridRows: 1,
				gridGap: 8,
				posX: 0,
				posY: 0,
				posWidth: (parent.props.posWidth as number) ?? 300,
				posHeight: (parent.props.posHeight as number) ?? 200,
				children: [...siblings],
			},
		};

		setData(
			updateSiblingsInData(
				data,
				parent.props.id as string,
				slotName,
				() => [groupSection],
			),
		);
	}, [parentCtx, isFreePos, data, setData]);

	const ungroupSelected = useCallback(() => {
		if (!selected || !parentCtx) return;
		if (selected.type !== "Section") return;
		const children = selected.props.children as ComponentData[] | undefined;
		if (!Array.isArray(children) || children.length === 0) return;

		const { parent, slotName, siblings } = parentCtx;
		const idx = siblings.findIndex(
			(s) => s.props?.id === (selected.props.id as string),
		);
		if (idx === -1) return;

		setData(
			updateSiblingsInData(
				data,
				parent.props.id as string,
				slotName,
				(sibs) => {
					const result = [...sibs];
					result.splice(idx, 1, ...children);
					return result;
				},
			),
		);
	}, [selected, parentCtx, data, setData]);

	// ── Keyboard nudge ───────────────────────────────────────────────

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!selected?.props?.id || !isFreePos) return;
			const step = e.shiftKey ? (snapEnabled ? gridSize : 10) : (snapEnabled ? gridSize : 1);
			let dx = 0;
			let dy = 0;

			switch (e.key) {
				case "ArrowLeft":
					dx = -step;
					break;
				case "ArrowRight":
					dx = step;
					break;
				case "ArrowUp":
					dy = -step;
					break;
				case "ArrowDown":
					dy = step;
					break;
				default:
					return;
			}
			e.preventDefault();
			const id = selected.props.id as string;
			const rect = getRect(selected);
			const nudged = nudge(rect, dx, dy, snapEnabled ? gridSize : undefined);
			setData(updateComponentInData(data, id, (comp) => applyRect(comp, nudged)));
		},
		[selected, isFreePos, snapEnabled, gridSize, data, setData],
	);

	// ── Render ───────────────────────────────────────────────────────

	if (!selected) return null;

	const rect = getRect(selected);

	return (
		// biome-ignore lint/a11y/noNoninteractiveTabindex: toolbar needs focus for keyboard nudge
		<div style={toolbarStyle} onKeyDown={handleKeyDown} tabIndex={0}>
			{/* Position inputs */}
			<div style={sectionStyle}>
				<span style={labelStyle}>Position</span>
				<span style={labelStyle}>X</span>
				<input
					type="number"
					style={inputStyle}
					value={Math.round(rect.x)}
					onChange={(e) => updatePosition("x", Number(e.target.value))}
				/>
				<span style={labelStyle}>Y</span>
				<input
					type="number"
					style={inputStyle}
					value={Math.round(rect.y)}
					onChange={(e) => updatePosition("y", Number(e.target.value))}
				/>
				<span style={labelStyle}>W</span>
				<input
					type="number"
					style={inputStyle}
					value={Math.round(rect.width)}
					onChange={(e) => updatePosition("width", Math.max(1, Number(e.target.value)))}
				/>
				<span style={labelStyle}>H</span>
				<input
					type="number"
					style={inputStyle}
					value={Math.round(rect.height)}
					onChange={(e) => updatePosition("height", Math.max(1, Number(e.target.value)))}
				/>
			</div>

			{/* Layer order */}
			{parentCtx && (
				<div style={sectionStyle}>
					<span style={labelStyle}>Layer</span>
					<button type="button" style={btnStyle} onClick={() => moveLayer("top")} title="Bring to Front">
						⤒
					</button>
					<button type="button" style={btnStyle} onClick={() => moveLayer("up")} title="Bring Forward">
						↑
					</button>
					<button type="button" style={btnStyle} onClick={() => moveLayer("down")} title="Send Backward">
						↓
					</button>
					<button type="button" style={btnStyle} onClick={() => moveLayer("bottom")} title="Send to Back">
						⤓
					</button>
				</div>
			)}

			{/* Alignment (only for free-position containers) */}
			{isFreePos && (
				<div style={sectionStyle}>
					<span style={labelStyle}>Align</span>
					<select
						style={{ ...inputStyle, width: 70 }}
						value={alignRef}
						onChange={(e) => setAlignRef(e.target.value as AlignReference)}
					>
						<option value="selection">Selection</option>
						<option value="parent">Parent</option>
					</select>
					<button type="button" style={btnStyle} onClick={() => applyAlignment("left")} title="Align Left">
						⫷
					</button>
					<button type="button" style={btnStyle} onClick={() => applyAlignment("center")} title="Align Center H">
						⫿
					</button>
					<button type="button" style={btnStyle} onClick={() => applyAlignment("right")} title="Align Right">
						⫸
					</button>
					<button type="button" style={btnStyle} onClick={() => applyAlignment(undefined, "top")} title="Align Top">
						⊤
					</button>
					<button type="button" style={btnStyle} onClick={() => applyAlignment(undefined, "middle")} title="Align Middle V">
						⊶
					</button>
					<button type="button" style={btnStyle} onClick={() => applyAlignment(undefined, "bottom")} title="Align Bottom">
						⊥
					</button>
				</div>
			)}

			{/* Distribution */}
			{isFreePos && parentCtx && parentCtx.siblings.length >= 3 && (
				<div style={sectionStyle}>
					<span style={labelStyle}>Distribute</span>
					<button type="button" style={btnStyle} onClick={() => applyDistribution("horizontal")} title="Distribute Horizontal">
						⫾ H
					</button>
					<button type="button" style={btnStyle} onClick={() => applyDistribution("vertical")} title="Distribute Vertical">
						⫾ V
					</button>
				</div>
			)}

			{/* Size matching */}
			{isFreePos && (
				<div style={sectionStyle}>
					<span style={labelStyle}>Match</span>
					<button type="button" style={btnStyle} onClick={() => applySizeMatch("width")} title="Match Width">
						W
					</button>
					<button type="button" style={btnStyle} onClick={() => applySizeMatch("height")} title="Match Height">
						H
					</button>
					<button type="button" style={btnStyle} onClick={() => applySizeMatch("both")} title="Match Both">
						W+H
					</button>
				</div>
			)}

			{/* Snap to grid */}
			<div style={sectionStyle}>
				<span style={labelStyle}>Snap</span>
				<button
					type="button"
					style={{
						...btnStyle,
						background: snapEnabled ? "#3b82f6" : "#334155",
					}}
					onClick={() => setSnapEnabled(!snapEnabled)}
				>
					{snapEnabled ? "ON" : "OFF"}
				</button>
				{snapEnabled && (
					<input
						type="number"
						style={{ ...inputStyle, width: 36 }}
						value={gridSize}
						min={1}
						onChange={(e) => setGridSize(Math.max(1, Number(e.target.value)))}
					/>
				)}
			</div>

			{/* Grouping */}
			{isFreePos && (
				<div style={{ display: "flex", gap: 4, alignItems: "center" }}>
					<span style={labelStyle}>Group</span>
					<button
						type="button"
						style={btnStyle}
						onClick={groupSiblings}
						title="Group all siblings into a Section"
					>
						Group All
					</button>
					{selected.type === "Section" && (
						<button
							type="button"
							style={btnStyle}
							onClick={ungroupSelected}
							title="Ungroup selected container"
						>
							Ungroup
						</button>
					)}
				</div>
			)}
		</div>
	);
}
