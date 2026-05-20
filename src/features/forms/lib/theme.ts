import { LayeredLightPanelless } from "survey-core/themes";

export const promoterPulseTheme = {
  ...LayeredLightPanelless,
  themeName: "promoterPulseTheme",
  colorPalette: "light",
  isPanelless: true,
  cssVariables: {
    ...LayeredLightPanelless.cssVariables,
    // Teal-500 for main accents (borders on focus, buttons, active states)
    "--sjs-primary-backcolor": "#14b8a6",
    "--sjs-primary-backcolor-dark": "#0d9488",

    // Light teal for the input fields background
    "--sjs-general-backcolor-dim": "#fff",
    "--sjs-general-backcolor-dim-light": "#f0fdfa",
    "--sjs-general-backcolor-dim-dark": "#eef699ff",
  }
};
