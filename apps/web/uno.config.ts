import {
  presetTypography,
  presetWind3,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup
} from "unocss";
import { defineConfig } from "unocss/vite";
import { colors } from "unocss/preset-wind3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformerCompileClass } from "unocss";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = defineConfig({
  content: {
    filesystem: [
      `${projectRoot}/src/**/*.{ts,tsx,html}`,
      `${workspaceRoot}/packages/private/components/src/**/*.{ts,tsx,html}`,
      `${workspaceRoot}/packages/private/editor/src/**/*.{ts,tsx,html}`
    ]
  },
  layers: {
    icons: -4,
    b1: -3,
    b2: -2,
    components: -1,
    default: 1,
    utilities: 2
  },
  transformers: [
    transformerDirectives(),
    transformerCompileClass({
      classPrefix: "uno-b1-",
      layer: "b1",
      trigger: ":base:"
    }),
    {
      ...transformerCompileClass({
        classPrefix: "uno-b2-",
        layer: "b2",
        trigger: ":base-2:"
      }),
      name: "@unocss/transformer-compile-class-2"
    },
    transformerVariantGroup()
  ],
  presets: [
    presetIcons({
      collections: {
        andesine: {
          logo: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.9069231,0 C13.0018372,0 13.9483357,0.635443279 14.397751,1.55766239 L18.5217192,9.80587694 C18.7187228,10.1865349 18.83,10.6187339 18.83,11.0769231 C18.83,12.606327 17.5901732,13.8461538 16.0607692,13.8461538 C14.9658551,13.8461538 14.0193566,13.2107106 13.5699414,12.2884915 L12.0384615,9.22476923 L6.15084166,22.3086788 C5.73044955,23.3025974 4.74628371,24 3.59923077,24 C2.06982685,24 0.83,22.7601732 0.83,21.2307692 C0.83,20.8083537 0.924579355,20.4080284 1.09371684,20.0498145 L9.35966608,1.68108512 C9.78247025,0.692617692 10.7638119,0 11.9069231,0 Z M18.3684615,14.7692308 C19.8978655,14.7692308 21.1376923,16.0090576 21.1376923,17.5384615 C21.1376923,19.0678655 19.8978655,20.3076923 18.3684615,20.3076923 C18.2141372,20.3076923 18.0627613,20.2950686 17.9153101,20.2707976 L12.83,19.8461538 L12.7298971,19.8440218 C11.5018339,19.7916084 10.5223077,18.7794252 10.5223077,17.5384615 C10.5223077,16.2639583 11.5554967,15.2307692 12.83,15.2307692 L17.9097768,14.8070421 C18.0589734,14.7821723 18.2122062,14.7692308 18.3684615,14.7692308 Z"></path></svg>`
        }
      }
    }),
    presetWind3(),
    presetTypography()
  ],
  theme: {
    colors: {
      primary: "#ff3617",
      secondary: "#f88f52",
      // Mix of primary and secondary
      tertiary: "#fc6335",
      gray: {
        ...colors,
        850: "#1b2534",
        950: "#0e1422"
      }
    }
  },
  rules: [
    [
      /^mask-edge-fading-(?:\[side=(t|b|r|l)\]|(t|b|r|l))-(\d+)$/,
      ([, bracketSide, shortSide, value]) => {
        const side = bracketSide || shortSide;
        const rem = Number(value) / 4;
        const direction = {
          t: "to bottom",
          b: "to top",
          r: "to left",
          l: "to right"
        }[side];

        return {
          "mask-image": `linear-gradient(${direction}, transparent 0%, black ${rem}rem, black 100%)`,
          "mask-repeat": "no-repeat"
        };
      }
    ],
    [
      /^mask-edge-fading-(\d+)$/,
      ([, value]) => {
        const rem = Number(value) / 4;

        return {
          "mask-image": [
            `linear-gradient(to top, black 0%, black 100%)`,
            `linear-gradient(to top, transparent 0%, black 100%)`,
            `linear-gradient(to right, transparent 0%, black 100%)`,
            `linear-gradient(to bottom, transparent 0%, black 100%)`,
            `linear-gradient(to left, transparent 0%, black 100%)`
          ].join(", "),
          "mask-position": `center, top, right, bottom, left`,
          "mask-size": `100% 100%, 100% ${rem}rem, ${rem}rem 100%, 100% ${rem}rem, ${rem}rem 100%`,
          "mask-repeat": "no-repeat, no-repeat, no-repeat, no-repeat, no-repeat",
          "mask-composite": "subtract, add, add, add"
        };
      }
    ]
  ]
});

export default config;
