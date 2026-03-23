import { describe, expect, it } from "bun:test";
import sampleTheme from "../../../../fixtures/sample-theme.json";
import { BrandThemeSchema, SectionOverrideSchema } from "../brand-theme";

describe("BrandThemeSchema", () => {
	it("validates the sample theme fixture", () => {
		const result = BrandThemeSchema.safeParse(sampleTheme);
		expect(result.success).toBe(true);
	});

	it("rejects theme with missing required fields", () => {
		const result = BrandThemeSchema.safeParse({
			name: "Incomplete",
			// missing typography, colors, spacing
		});
		expect(result.success).toBe(false);
	});

	it("accepts a minimal valid theme", () => {
		const result = BrandThemeSchema.safeParse({
			name: "Minimal",
			typography: {
				heading: { fontFamily: "Arial", fontSize: 32, fontWeight: 700 },
				subheading: { fontFamily: "Arial", fontSize: 24, fontWeight: 600 },
				body: { fontFamily: "Arial", fontSize: 16, fontWeight: 400 },
			},
			colors: {
				primary: "#000",
				secondary: "#666",
				background: "#fff",
				text: "#000",
				accent: "#f00",
			},
			spacing: { padding: 16, margin: 8, gap: 8 },
		});
		expect(result.success).toBe(true);
	});

	it("accepts optional brandName and version", () => {
		const parsed = BrandThemeSchema.parse(sampleTheme);
		expect(parsed.brandName).toBe("Acme Corp");
		expect(parsed.version).toBe("1.0.0");
	});
});

describe("SectionOverrideSchema", () => {
	it("validates a partial color override", () => {
		const result = SectionOverrideSchema.safeParse({
			colors: { background: "#1e3a5f", text: "#fff" },
		});
		expect(result.success).toBe(true);
	});

	it("validates a typography + button override", () => {
		const result = SectionOverrideSchema.safeParse({
			typography: {
				heading: { fontFamily: "Georgia", fontSize: 48, fontWeight: 800 },
			},
			button: { fill: "#000", borderRadius: 24 },
		});
		expect(result.success).toBe(true);
	});

	it("accepts empty override (all optional)", () => {
		const result = SectionOverrideSchema.safeParse({});
		expect(result.success).toBe(true);
	});
});

describe("Theme section overrides", () => {
	it("parses section overrides from sample fixture", () => {
		const parsed = BrandThemeSchema.parse(sampleTheme);
		expect(parsed.sectionOverrides).toBeDefined();
		const keys = Object.keys(parsed.sectionOverrides ?? {});
		expect(keys).toContain("hero");
		expect(keys).toContain("cta");
	});

	it("hero override has dark background and white text", () => {
		const parsed = BrandThemeSchema.parse(sampleTheme);
		const hero = parsed.sectionOverrides?.hero ?? {};
		expect(hero.colors?.background).toBe("#1e3a5f");
		expect(hero.colors?.text).toBe("#ffffff");
	});
});

describe("Round-trip serialization", () => {
	it("theme survives JSON serialize/deserialize", () => {
		const parsed = BrandThemeSchema.parse(sampleTheme);
		const json = JSON.stringify(parsed);
		const reparsed = BrandThemeSchema.parse(JSON.parse(json));
		expect(reparsed).toEqual(parsed);
	});
});
