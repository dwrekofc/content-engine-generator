// HTML Static Site Generator
export {
	type GenerateHTMLStaticOptions,
	type GenerateHTMLStaticResult,
	generateHTMLStatic,
} from "./lib/generators/html-static-generator";
// PDF Generator
export {
	type GeneratePDFOptions,
	type GeneratePDFResult,
	generatePDF,
	generatePDFFromURL,
} from "./lib/generators/pdf-generator";
// PPTX Generator
export {
	type GeneratePPTXOptions,
	type GeneratePPTXResult,
	generatePPTX,
} from "./lib/generators/pptx-generator";
// Layout Engine
export { computeLayout, computeSectionIntrinsicHeight } from "./lib/layout-engine/core";
export {
	layoutFlexPrimitive,
	layoutFreePositionPrimitive,
	layoutGridPrimitive,
	layoutSectionPrimitive,
	layoutStackPrimitive,
} from "./lib/layout-engine/primitives/index";
export type {
	CanvasSize,
	ElementType,
	LayoutBounds,
	PositionedElement,
	SizedItem,
} from "./lib/layout-engine/types";
// Preview Dev Server
export {
	type DevServerInstance,
	type DevServerOptions,
	startDevServer,
} from "./lib/preview/dev-server";
// HTML Renderer
export {
	type RenderHTMLOptions,
	renderHTML,
	renderHTMLFragment,
} from "./lib/renderers/html-renderer";
// Brand Theme Schema
export {
	type BrandTheme,
	BrandThemeSchema,
	type ButtonStyle,
	ButtonStyleSchema,
	type ColorTokens,
	ColorTokensSchema,
	type SectionOverride,
	SectionOverrideSchema,
	type SpacingTokens,
	SpacingTokensSchema,
	type TypographyStyle,
	TypographyStyleSchema,
	type TypographyTokens,
	TypographyTokensSchema,
} from "./lib/schemas/brand-theme";
// Content Schema
export {
	type Content,
	type ContentCard,
	type ContentPage,
	ContentSchema,
	type ContentSection,
	type FieldValue,
} from "./lib/schemas/content-schema";
export { type ContentValidationError, validateContent } from "./lib/schemas/content-validator";
// Template Schema
export {
	type Card,
	type CardFieldType,
	CardFieldTypeSchema,
	type Field,
	FieldSchema,
	type FlexConfig,
	FlexConfigSchema,
	type FreePositionChild,
	FreePositionChildSchema,
	type GridConfig,
	GridConfigSchema,
	type LayoutPrimitive,
	LayoutPrimitiveSchema,
	type Page,
	type Section,
	type SectionFieldType,
	SectionFieldTypeSchema,
	type Template,
	TemplateSchema,
} from "./lib/schemas/template-schema";
export { sectionOverrideToCSS, themeToCSS } from "./lib/themes/theme-to-css";
// API Server
export { type APIServerInstance, startAPIServer } from "./server/api";
