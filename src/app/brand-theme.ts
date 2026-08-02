import { createLightTheme, createDarkTheme, type BrandVariants, type Theme } from "@fluentui/react-components";

/**
 * Saturated teal-cyan "guardian" brand ramp -- ported from the design
 * reference at github.com/mazoochian/warden-control-hub (2026-07-28,
 * updated to its "Fluent 2 UI" pass 2026-08-02), which independently
 * arrived at the same "Fluent UI + custom brand" approach this app
 * already uses, just more polished.
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

// Fluent 2 / WinUI 3 corner radii: 4px controls, 8px surfaces & flyouts.
const fluent2 = (theme: Theme): Theme => ({
  ...theme,
  borderRadiusNone: "0",
  borderRadiusSmall: "3px",
  borderRadiusMedium: "4px",
  borderRadiusLarge: "7px",
  borderRadiusXLarge: "8px",
  borderRadiusCircular: "10000px",
});

/** Mica-like window backdrop colors used behind the content layer. */
export const micaLight = "#f3f3f3";
export const micaDark = "#202020";
/** WinUI 3 content layer ("Solid background base"). */
export const layerLight = "#ffffff";
export const layerDark = "#272727";

export const wardenLightTheme = fluent2(createLightTheme(wardenBrand));

export const wardenDarkTheme = fluent2({
  ...createDarkTheme(wardenBrand),
  colorBrandForeground1: wardenBrand[110],
  colorBrandForeground2: wardenBrand[120],
});
