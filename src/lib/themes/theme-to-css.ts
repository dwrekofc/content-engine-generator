import type { BrandTheme, SectionOverride, TypographyStyle } from "../schemas/brand-theme";

/**
 * Converts a brand theme JSON to a map of CSS custom properties.
 * Consumed by the HTML renderer to apply theme tokens as CSS variables.
 *
 * Produces properties like:
 *   --color-primary, --color-secondary, --color-background, --color-text, --color-accent
 *   --font-heading-family, --font-heading-size, --font-heading-weight, --font-heading-line-height
 *   --font-body-family, --font-body-size, etc.
 *   --spacing-padding, --spacing-margin, --spacing-gap
 *   --button-border-radius, --button-padding-x, --button-padding-y, etc.
 */
export function themeToCSS(theme: BrandTheme): Record<string, string> {
	const vars: Record<string, string> = {};

	// Colors
	vars["--color-primary"] = theme.colors.primary;
	vars["--color-secondary"] = theme.colors.secondary;
	vars["--color-background"] = theme.colors.background;
	vars["--color-text"] = theme.colors.text;
	vars["--color-accent"] = theme.colors.accent;

	// Typography
	addTypographyVars(vars, "heading", theme.typography.heading);
	addTypographyVars(vars, "subheading", theme.typography.subheading);
	addTypographyVars(vars, "body", theme.typography.body);
	if (theme.typography.caption) {
		addTypographyVars(vars, "caption", theme.typography.caption);
	}
	if (theme.typography.button) {
		addTypographyVars(vars, "button-text", theme.typography.button);
	}

	// Spacing
	vars["--spacing-padding"] = `${theme.spacing.padding}px`;
	vars["--spacing-margin"] = `${theme.spacing.margin}px`;
	vars["--spacing-gap"] = `${theme.spacing.gap}px`;

	// Button styles
	if (theme.button) {
		if (theme.button.borderRadius !== undefined) {
			vars["--button-border-radius"] = `${theme.button.borderRadius}px`;
		}
		if (theme.button.paddingX !== undefined) {
			vars["--button-padding-x"] = `${theme.button.paddingX}px`;
		}
		if (theme.button.paddingY !== undefined) {
			vars["--button-padding-y"] = `${theme.button.paddingY}px`;
		}
		if (theme.button.fill) {
			vars["--button-fill"] = theme.button.fill;
		}
		if (theme.button.border) {
			vars["--button-border"] = theme.button.border;
		}
		if (theme.button.textColor) {
			vars["--button-text-color"] = theme.button.textColor;
		}
	}

	return vars;
}

/**
 * Generates CSS custom properties for a specific section override,
 * merging the override on top of the global theme.
 * Returns only the overridden properties — consumers apply these
 * after the global CSS vars to achieve the cascade.
 */
export function sectionOverrideToCSS(override: SectionOverride): Record<string, string> {
	const vars: Record<string, string> = {};

	if (override.colors) {
		if (override.colors.primary) vars["--color-primary"] = override.colors.primary;
		if (override.colors.secondary) vars["--color-secondary"] = override.colors.secondary;
		if (override.colors.background) vars["--color-background"] = override.colors.background;
		if (override.colors.text) vars["--color-text"] = override.colors.text;
		if (override.colors.accent) vars["--color-accent"] = override.colors.accent;
	}

	if (override.typography) {
		if (override.typography.heading) {
			addTypographyVars(vars, "heading", override.typography.heading);
		}
		if (override.typography.subheading) {
			addTypographyVars(vars, "subheading", override.typography.subheading);
		}
		if (override.typography.body) {
			addTypographyVars(vars, "body", override.typography.body);
		}
		if (override.typography.caption) {
			addTypographyVars(vars, "caption", override.typography.caption);
		}
		if (override.typography.button) {
			addTypographyVars(vars, "button-text", override.typography.button);
		}
	}

	if (override.spacing) {
		if (override.spacing.padding !== undefined) {
			vars["--spacing-padding"] = `${override.spacing.padding}px`;
		}
		if (override.spacing.margin !== undefined) {
			vars["--spacing-margin"] = `${override.spacing.margin}px`;
		}
		if (override.spacing.gap !== undefined) {
			vars["--spacing-gap"] = `${override.spacing.gap}px`;
		}
	}

	if (override.button) {
		if (override.button.borderRadius !== undefined) {
			vars["--button-border-radius"] = `${override.button.borderRadius}px`;
		}
		if (override.button.paddingX !== undefined) {
			vars["--button-padding-x"] = `${override.button.paddingX}px`;
		}
		if (override.button.paddingY !== undefined) {
			vars["--button-padding-y"] = `${override.button.paddingY}px`;
		}
		if (override.button.fill) {
			vars["--button-fill"] = override.button.fill;
		}
		if (override.button.border) {
			vars["--button-border"] = override.button.border;
		}
		if (override.button.textColor) {
			vars["--button-text-color"] = override.button.textColor;
		}
	}

	return vars;
}

function addTypographyVars(
	vars: Record<string, string>,
	prefix: string,
	style: Partial<TypographyStyle>,
): void {
	if (style.fontFamily) {
		vars[`--font-${prefix}-family`] = style.fontFamily;
	}
	if (style.fontSize !== undefined) {
		vars[`--font-${prefix}-size`] = `${style.fontSize}px`;
	}
	if (style.fontWeight !== undefined) {
		vars[`--font-${prefix}-weight`] = String(style.fontWeight);
	}
	if (style.lineHeight !== undefined) {
		vars[`--font-${prefix}-line-height`] = String(style.lineHeight);
	}
	if (style.letterSpacing !== undefined) {
		vars[`--font-${prefix}-letter-spacing`] = `${style.letterSpacing}px`;
	}
}
