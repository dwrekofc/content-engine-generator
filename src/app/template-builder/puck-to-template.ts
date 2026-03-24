/**
 * Transforms Puck editor data into a canonical Template JSON schema.
 *
 * Why: Puck has its own data model (ComponentData with slots). Our template schema
 * has a domain-specific hierarchy (Document → Pages → Sections → Fields/Cards/Children).
 * This layer bridges the two so the editor output conforms to the template spec.
 */

import type { Data } from "@measured/puck";
import type {
	Card,
	CardFieldType,
	Field,
	FreePositionChild,
	Page,
	Section,
	Template,
} from "@/lib/schemas/template-schema";

/** Field type names in the template schema, mapped from Puck component names */
const FIELD_COMPONENT_MAP: Record<string, string> = {
	TitleField: "title",
	SubtitleField: "subtitle",
	ParagraphField: "paragraph",
	ButtonField: "button",
	FeaturedContentField: "featured-content",
	FeaturedContentCaptionField: "featured-content-caption",
	BackgroundField: "background",
};

interface PuckComponent {
	type: string;
	props: Record<string, unknown>;
}

/** Extract free-position coordinates from Puck props when all four are set */
function extractPosition(props: Record<string, unknown>): FreePositionChild | undefined {
	const x = props.posX as number | undefined;
	const y = props.posY as number | undefined;
	const w = props.posWidth as number | undefined;
	const h = props.posHeight as number | undefined;
	if (x != null && y != null && w != null && w > 0 && h != null && h > 0) {
		return { x, y, width: w, height: h };
	}
	return undefined;
}

/**
 * Converts Puck Data to a Template schema object.
 */
export function puckDataToTemplate(data: Data, templateId?: string): Template {
	const rootContent = data.content || [];
	const pages: Page[] = [];

	for (const item of rootContent) {
		if (item.type === "Page") {
			pages.push(convertPage(item as PuckComponent));
		}
	}

	return {
		id: templateId || `template-${Date.now()}`,
		name: ((data.root?.props as Record<string, unknown>)?.title as string) || "Untitled Template",
		pages,
	};
}

function convertPage(pageComponent: PuckComponent): Page {
	const props = pageComponent.props;
	const sections: Section[] = [];

	// Sections are in the slot prop
	const sectionSlot = props.sections as PuckComponent[] | undefined;
	if (Array.isArray(sectionSlot)) {
		for (const item of sectionSlot) {
			if (item.type === "Section") {
				sections.push(convertSection(item));
			}
		}
	}

	return {
		id: (props.id as string) || generateId("page"),
		name: (props.name as string) || undefined,
		sections,
	};
}

function convertSection(sectionComponent: PuckComponent): Section {
	const props = sectionComponent.props;
	const layout = (props.layout as string) || "section";

	const fields: Field[] = [];
	const cards: Card[] = [];
	const children: Section[] = [];

	// Children are in the slot prop
	const childSlot = props.children as PuckComponent[] | undefined;
	if (Array.isArray(childSlot)) {
		for (const item of childSlot) {
			if (item.type === "Section") {
				children.push(convertSection(item));
			} else if (item.type === "Card") {
				cards.push(convertCard(item));
			} else if (FIELD_COMPONENT_MAP[item.type]) {
				fields.push(convertField(item));
			}
		}
	}

	const position = extractPosition(props);
	const section: Section = {
		id: (props.id as string) || generateId("section"),
		name: (props.name as string) || undefined,
		layout: layout as Section["layout"],
		...(position ? { position } : {}),
		fields,
		cards,
		children,
	};

	// Add layout config
	if (layout === "flex") {
		section.flexConfig = {
			direction: (props.flexDirection as "row" | "column") || "column",
			gap: (props.flexGap as number) ?? undefined,
			align: (props.flexAlign as "start" | "center" | "end" | "stretch") || undefined,
		};
	}

	if (layout === "grid") {
		section.gridConfig = {
			columns: (props.gridColumns as number) || 2,
			rows: (props.gridRows as number) || 1,
			gap: (props.gridGap as number) ?? undefined,
		};
	}

	return section;
}

/** Card field types (6 types — no featured-content-caption per spec) */
const CARD_FIELD_TYPES = new Set([
	"title",
	"subtitle",
	"paragraph",
	"button",
	"featured-content",
	"background",
]);

function convertCard(cardComponent: PuckComponent): Card {
	const props = cardComponent.props;
	const fields: { id: string; type: CardFieldType; required: boolean; label?: string }[] = [];

	const childSlot = props.children as PuckComponent[] | undefined;
	if (Array.isArray(childSlot)) {
		for (const item of childSlot) {
			const fieldType = FIELD_COMPONENT_MAP[item.type];
			if (fieldType && CARD_FIELD_TYPES.has(fieldType)) {
				const f = convertField(item);
				fields.push({ ...f, type: f.type as CardFieldType });
			}
		}
	}

	return {
		id: (props.id as string) || generateId("card"),
		fields,
	};
}

function convertField(fieldComponent: PuckComponent): Field {
	const props = fieldComponent.props;
	const type = FIELD_COMPONENT_MAP[fieldComponent.type];

	return {
		id: (props.fieldId as string) || (props.id as string) || generateId("field"),
		type: type as Field["type"],
		required: (props.required as boolean) ?? false,
		label: (props.label as string) || undefined,
	};
}

let idCounter = 0;
function generateId(prefix: string): string {
	return `${prefix}-${++idCounter}`;
}

/** Reset the ID counter (useful for tests) */
export function resetIdCounter(): void {
	idCounter = 0;
}
