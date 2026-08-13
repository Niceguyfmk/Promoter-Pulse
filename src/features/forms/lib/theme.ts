import { LayeredLightPanelless } from "survey-core/themes";

export const promoterPulseTheme = {
  ...LayeredLightPanelless,
  themeName: "promoterPulseTheme",
  colorPalette: "light",
  isPanelless: true,
  cssVariables: {
    ...LayeredLightPanelless.cssVariables,
    // Garnet for main accents (borders on focus, buttons, active states)
    "--sjs-primary-backcolor": "#8e2a3b",
    "--sjs-primary-backcolor-dark": "#6e202e",

    // Light neutral for the input fields background
    "--sjs-general-backcolor-dim": "#fff",
    "--sjs-general-backcolor-dim-light": "#f7f7f4",
    "--sjs-general-backcolor-dim-dark": "#f3ecdf"
  }
};
