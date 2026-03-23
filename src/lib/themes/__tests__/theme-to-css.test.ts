import { describe, expect, it } from "bun:test";
import sampleTheme from "../../../../fixtures/sample-theme.json";
import { BrandThemeSchema } from "../../schemas/brand-theme";
import { sectionOverrideToCSS, themeToCSS } from "../theme-to-css";

const theme = BrandThemeSchema.parse(sampleTheme);

describe("themeToCSS", () => {
	it("produces color custom properties", () => {
		const vars = themeToCSS(theme);
		expect(vars["--color-primary"]).toBe("#1a56db");
		expect(vars["--color-secondary"]).toBe("#6b7280");
		expect(vars["--color-background"]).toBe("#ffffff");
		expect(vars["--color-text"]).toBe("#111827");
		expect(vars["--color-accent"]).toBe("#f59e0b");
	});

	it("produces typography custom properties for heading", () => {
		const vars = themeToCSS(theme);
		expect(vars["--font-heading-family"]).toBe("Inter, sans-serif");
		expect(vars["--font-heading-size"]).toBe("36px");
		expect(vars["--font-heading-weight"]).toBe("700");
		expect(vars["--font-heading-line-height"]).toBe("1.2");
	});

	it("produces typography custom properties for body", () => {
		const vars = themeToCSS(theme);
		expect(vars["--font-body-family"]).toBe("Inter, sans-serif");
		expect(vars["--font-body-size"]).toBe("16px");
		expect(vars["--font-body-weight"]).toBe("400");
		expect(vars["--font-body-line-height"]).toBe("1.6");
	});

	it("produces spacing custom properties", () => {
		const vars = themeToCSS(theme);
		expect(vars["--spacing-padding"]).toBe("24px");
		expect(vars["--spacing-margin"]).toBe("16px");
		expect(vars["--spacing-gap"]).toBe("16px");
	});

	it("produces button custom properties", () => {
		const vars = themeToCSS(theme);
		expect(vars["--button-border-radius"]).toBe("8px");
		expect(vars["--button-padding-x"]).toBe("24px");
		expect(vars["--button-padding-y"]).toBe("12px");
		expect(vars["--button-fill"]).toBe("#1a56db");
		expect(vars["--button-text-color"]).toBe("#ffffff");
	});

	it("includes caption typography when present", () => {
		const vars = themeToCSS(theme);
		expect(vars["--font-caption-family"]).toBe("Inter, sans-serif");
		expect(vars["--font-caption-size"]).toBe("12px");
	});

	it("includes button typography when present", () => {
		const vars = themeToCSS(theme);
		expect(vars["--font-button-text-family"]).toBe("Inter, sans-serif");
		expect(vars["--font-button-text-size"]).toBe("14px");
	});

	it("returns only string values", () => {
		const vars = themeToCSS(theme);
		for (const [_key, value] of Object.entries(vars)) {
			expect(typeof value).toBe("string");
		}
	});
});

describe("sectionOverrideToCSS", () => {
	it("produces only overridden properties for hero section", () => {
		const heroOverride = theme.sectionOverrides?.hero ?? {};
		const vars = sectionOverrideToCSS(heroOverride);
		expect(vars["--color-background"]).toBe("#1e3a5f");
		expect(vars["--color-text"]).toBe("#ffffff");
		expect(vars["--font-heading-size"]).toBe("48px");
		// Should NOT include non-overridden global values
		expect(vars["--color-accent"]).toBeUndefined();
		expect(vars["--spacing-padding"]).toBeUndefined();
	});

	it("produces button overrides for cta section", () => {
		const ctaOverride = theme.sectionOverrides?.cta ?? {};
		const vars = sectionOverrideToCSS(ctaOverride);
		expect(vars["--button-fill"]).toBe("#111827");
		expect(vars["--button-text-color"]).toBe("#ffffff");
		expect(vars["--button-border-radius"]).toBe("24px");
	});

	it("returns empty object for empty override", () => {
		const vars = sectionOverrideToCSS({});
		expect(Object.keys(vars)).toHaveLength(0);
	});
});
