// HTML Static Site Generator
export {
	type GenerateHTMLStaticOptions,
	type GenerateHTMLStaticResult,
	generateHTMLStatic,
} from "./lib/generators/html-static-generator";
// PPTX Generator
export {
	type GeneratePPTXOptions,
	type GeneratePPTXResult,
	generatePPTX,
} from "./lib/generators/pptx-generator";
// Layout Engine
export { computeLayout } from "./lib/layout-engine/core";
export type {
	CanvasSize,
	ElementType,
	LayoutBounds,
	PositionedElement,
} from "./lib/layout-engine/types";
// HTML Renderer
export {
	type RenderHTMLOptions,
	renderHTML,
	renderHTMLFragment,
} from "./lib/renderers/html-renderer";
export { type BrandTheme, BrandThemeSchema, type SectionOverride } from "./lib/schemas/brand-theme";
export {
	type Content,
	type ContentCard,
	type ContentPage,
	ContentSchema,
	type ContentSection,
	type FieldValue,
} from "./lib/schemas/content-schema";
export { type ContentValidationError, validateContent } from "./lib/schemas/content-validator";
export {
	type Card,
	type Field,
	type LayoutPrimitive,
	type Page,
	type Section,
	type Template,
	TemplateSchema,
} from "./lib/schemas/template-schema";
export { sectionOverrideToCSS, themeToCSS } from "./lib/themes/theme-to-css";
