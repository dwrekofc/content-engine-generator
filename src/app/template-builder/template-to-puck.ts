/**
 * Transforms a canonical Template JSON schema into Puck editor data.
 *
 * Why: When loading an existing template for editing, we need to convert our
 * domain-specific schema back into Puck's component data model. This is the
 * reverse of puck-to-template.ts.
 */

import type { ComponentData, Data } from "@measured/puck";
import type { Card, Field, Page, Section, Template } from "@/lib/schemas/template-schema";

/** Reverse mapping: template field type → Puck component name */
const FIELD_TYPE_TO_COMPONENT: Record<string, string> = {
	title: "TitleField",
	subtitle: "SubtitleField",
	paragraph: "ParagraphField",
	button: "ButtonField",
	"featured-content": "FeaturedContentField",
	"featured-content-caption": "FeaturedContentCaptionField",
	background: "BackgroundField",
};

/**
 * Converts a Template schema object into Puck Data for loading into the editor.
 */
export function templateToPuckData(template: Template): Data {
	const content: ComponentData[] = template.pages.map((page) => convertPage(page));

	return {
		root: { props: { title: template.name } },
		content,
	};
}

function convertPage(page: Page): ComponentData {
	const sections = page.sections.map((section) => convertSection(section));

	return {
		type: "Page",
		props: {
			id: page.id,
			name: page.name || "",
			sections,
		},
	};
}

function convertSection(section: Section): ComponentData {
	const children: ComponentData[] = [];

	// Fields first
	for (const field of section.fields) {
		children.push(convertField(field));
	}

	// Cards
	for (const card of section.cards) {
		children.push(convertCard(card));
	}

	// Child sections
	for (const child of section.children) {
		children.push(convertSection(child));
	}

	return {
		type: "Section",
		props: {
			id: section.id,
			name: section.name || "",
			layout: section.layout,
			required: section.required ?? false,
			flexDirection: section.flexConfig?.direction || "column",
			flexGap: section.flexConfig?.gap ?? 8,
			flexAlign: section.flexConfig?.align || "stretch",
			gridColumns: section.gridConfig?.columns || 2,
			gridRows: section.gridConfig?.rows || 1,
			gridGap: section.gridConfig?.gap ?? 8,
			posX: section.position?.x ?? 0,
			posY: section.position?.y ?? 0,
			posWidth: section.position?.width ?? 300,
			posHeight: section.position?.height ?? 200,
			children,
		},
	};
}

function convertCard(card: Card): ComponentData {
	const children = card.fields.map((field) => convertField(field));

	return {
		type: "Card",
		props: {
			id: card.id,
			name: "",
			posX: 0,
			posY: 0,
			posWidth: 200,
			posHeight: 120,
			children,
		},
	};
}

function convertField(field: Field): ComponentData {
	const componentType = FIELD_TYPE_TO_COMPONENT[field.type];
	if (!componentType) {
		throw new Error(`Unknown field type: ${field.type}`);
	}

	return {
		type: componentType,
		props: {
			id: field.id,
			fieldId: field.id,
			required: field.required ?? false,
			label: field.label || "",
			posX: 0,
			posY: 0,
			posWidth: 200,
			posHeight: 60,
		},
	};
}
