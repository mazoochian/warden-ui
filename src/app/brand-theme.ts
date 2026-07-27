import { createLightTheme, createDarkTheme, type BrandVariants, type Theme } from "@fluentui/react-components";

/**
 * Saturated teal-cyan "guardian" brand ramp, sharpened corners (small
 * radii instead of Fluent's default pill-ish rounding) -- ported from
 * the design reference at github.com/mazoochian/warden-control-hub
 * (2026-07-28), which independently arrived at the same "Fluent UI +
 * custom brand" approach this app already uses, just more polished.
 */
export const wardenBrand: BrandVariants = {
  10: "#001417",
  20: "#00212A",
  30: "#003745",
  40: "#00475A",
  50: "#005870",
  60: "#006A87",
  70: "#007D9F",
  80: "#0090B8",
  90: "#00A4D1",
  100: "#00B8EA",
  110: "#12C6F5",
  120: "#3ED3FA",
  130: "#6BDEFC",
  140: "#95E8FD",
  150: "#BCF1FE",
  160: "#DEF8FF",
};

const sharpen = (theme: Theme): Theme => ({
  ...theme,
  borderRadiusSmall: "2px",
  borderRadiusMedium: "3px",
  borderRadiusLarge: "4px",
  borderRadiusXLarge: "6px",
});

export const wardenLightTheme = sharpen(createLightTheme(wardenBrand));

export const wardenDarkTheme = sharpen({
  ...createDarkTheme(wardenBrand),
  colorBrandForeground1: wardenBrand[110],
  colorBrandForeground2: wardenBrand[120],
});
