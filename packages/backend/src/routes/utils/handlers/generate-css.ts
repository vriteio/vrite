import { z } from "zod";
import { createGenerator } from "@unocss/core";
import transformerCompileClass from "@unocss/transformer-compile-class";
import transformerVariantGroup from "@unocss/transformer-variant-group";
import presetWind from "@unocss/preset-wind";
import presetTypography from "@unocss/preset-typography";
import extractorArbitrary from "@unocss/extractor-arbitrary-variants";
import { Context } from "#lib/context";

const inputSchema = z.object({ cssString: z.string(), uid: z.string().optional() });
const outputSchema = z.object({ css: z.string() });
const handler = async (
  _ctx: Context,
  input: z.infer<typeof inputSchema>
): Promise<z.infer<typeof outputSchema>> => {
  const generator = createGenerator({
    postprocess: [
      (obj) => {
        const darkSubSelectorIndex = obj.selector.indexOf(".dark ");

        obj.selector =
          `${darkSubSelectorIndex >= 0 ? ".dark " : ""}${input.uid ? `[data-uid="${input.uid}"]` : ""} ${darkSubSelectorIndex >= 0 ? obj.selector.substring(darkSubSelectorIndex + 6) : obj.selector}`.trim();
      }
    ],
    extractors: [extractorArbitrary],
    layers: {
      "b1": -3,
      "b2": -2,
      "components": -1,
      "default": 1,
      "utilities": 2,
      "my-layer": 3
    },
    transformers: [
      transformerCompileClass({ layer: "b1", trigger: ":base:" }),
      transformerCompileClass({ layer: "b2", trigger: ":base-2:" }),
      transformerVariantGroup()
    ],
    presets: [presetWind(), presetTypography()],
    theme: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)"
      }
    }
  });
  const { css } = await generator.generate(input.cssString, {
    id: "generated.css",
    preflights: false
  });

  return {
    css
  };
};

export { inputSchema, outputSchema, handler };
