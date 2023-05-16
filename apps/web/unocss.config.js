import { presetForms } from "./unocss-preset-forms.config";
import {
  presetTypography,
  presetWind,
  transformerDirectives,
  transformerVariantGroup,
  transformerCompileClass
} from "unocss";
import { defineConfig } from "unocss/vite";

export default defineConfig({
  layers: {
    "b1": -3,
    "b2": -2,
    "components": -1,
    "default": 1,
    "utilities": 2,
    "my-layer": 3
  },
  transformers: [
    transformerDirectives(),
    transformerCompileClass({ layer: "b1", trigger: ":base:" }),
    transformerCompileClass({ layer: "b2", trigger: ":base-2:" }),
    transformerVariantGroup()
  ],
  presets: [presetWind(), presetTypography(), presetForms()],
  theme: {
    colors: {
      primary: "var(--color-primary)",
      secondary: "var(--color-secondary)"
    }
  }
});
