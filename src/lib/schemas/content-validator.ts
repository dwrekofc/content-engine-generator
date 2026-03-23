import type { Content, ContentSection, FieldValue } from "./content-schema";
import type { Field, Section, Template } from "./template-schema";

export interface ContentValidationError {
	path: string;
	message: string;
}

/**
 * Validates content JSON against its referenced template.
 * Checks:
 * - Required fields are present
 * - Field IDs in content match template field slot IDs
 * - Field value types match template field types
 * - No orphan values (content fields that don't exist in template)
 * - Card field IDs match template card slot IDs
 */
export function validateContent(content: Content, template: Template): ContentValidationError[] {
	const errors: ContentValidationError[] = [];

	if (content.pages.length !== template.pages.length) {
		errors.push({
			path: "pages",
			message: `Content has ${content.pages.length} pages but template has ${template.pages.length}`,
		});
		return errors;
	}

	for (let pi = 0; pi < template.pages.length; pi++) {
		const tPage = template.pages[pi];
		const cPage = content.pages[pi];
		const pagePath = `pages[${pi}]`;

		if (cPage.pageId !== tPage.id) {
			errors.push({
				path: `${pagePath}.pageId`,
				message: `Content page ID "${cPage.pageId}" does not match template page ID "${tPage.id}"`,
			});
			continue;
		}

		validateSections(tPage.sections, cPage.sections, pagePath, errors);
	}

	return errors;
}

function validateSections(
	templateSections: Section[],
	contentSections: ContentSection[],
	basePath: string,
	errors: ContentValidationError[],
): void {
	// Build a map of template sections by ID for lookup
	const templateMap = new Map<string, Section>();
	for (const ts of templateSections) {
		templateMap.set(ts.id, ts);
	}

	// Check for orphan content sections (not in template)
	for (const cs of contentSections) {
		if (!templateMap.has(cs.sectionId)) {
			errors.push({
				path: `${basePath}.sections`,
				message: `Content section "${cs.sectionId}" has no matching template section`,
			});
		}
	}

	// Build content section map
	const contentMap = new Map<string, ContentSection>();
	for (const cs of contentSections) {
		contentMap.set(cs.sectionId, cs);
	}

	// Validate each template section
	for (const ts of templateSections) {
		const cs = contentMap.get(ts.id);
		const sectionPath = `${basePath}.sections[${ts.id}]`;

		if (!cs) {
			// Check if any required fields exist in this section
			const requiredFields = ts.fields.filter((f) => f.required);
			if (requiredFields.length > 0) {
				errors.push({
					path: sectionPath,
					message: `Missing content for section "${ts.id}" which has required fields: ${requiredFields.map((f) => f.id).join(", ")}`,
				});
			}
			continue;
		}

		// Validate fields
		validateFields(ts.fields, cs.fields, sectionPath, errors);

		// Validate cards
		const templateCardMap = new Map(ts.cards.map((c) => [c.id, c]));
		const contentCardIds = new Set<string>();

		for (const cc of cs.cards) {
			contentCardIds.add(cc.cardId);
			const tc = templateCardMap.get(cc.cardId);
			if (!tc) {
				errors.push({
					path: `${sectionPath}.cards`,
					message: `Content card "${cc.cardId}" has no matching template card`,
				});
				continue;
			}
			validateFields(tc.fields, cc.fields, `${sectionPath}.cards[${cc.cardId}]`, errors);
		}

		// Check for template cards with required fields missing from content
		for (const tc of ts.cards) {
			if (!contentCardIds.has(tc.id)) {
				const requiredFields = tc.fields.filter((f) => f.required);
				if (requiredFields.length > 0) {
					errors.push({
						path: `${sectionPath}.cards[${tc.id}]`,
						message: `Missing content for card "${tc.id}" which has required fields: ${requiredFields.map((f) => f.id).join(", ")}`,
					});
				}
			}
		}

		// Recurse into children
		validateSections(ts.children, cs.children, sectionPath, errors);
	}
}

function validateFields(
	templateFields: Field[],
	contentFields: Record<string, FieldValue>,
	basePath: string,
	errors: ContentValidationError[],
): void {
	const templateFieldMap = new Map(templateFields.map((f) => [f.id, f]));
	const fieldPath = `${basePath}.fields`;

	// Check for orphan content fields
	for (const fieldId of Object.keys(contentFields)) {
		if (!templateFieldMap.has(fieldId)) {
			errors.push({
				path: `${fieldPath}[${fieldId}]`,
				message: `Content field "${fieldId}" has no matching template field slot`,
			});
		}
	}

	// Check required fields and type matches
	for (const tf of templateFields) {
		const cv = contentFields[tf.id];

		if (!cv) {
			if (tf.required) {
				errors.push({
					path: `${fieldPath}[${tf.id}]`,
					message: `Required field "${tf.id}" (${tf.type}) is missing from content`,
				});
			}
			continue;
		}

		// Validate field type matches
		if (cv.type !== tf.type) {
			errors.push({
				path: `${fieldPath}[${tf.id}]`,
				message: `Field "${tf.id}" type mismatch: template expects "${tf.type}" but content has "${cv.type}"`,
			});
		}
	}
}
