import {
  presetTypography,
  presetWind3,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup,
  Preset,
  SourceCodeTransformer,
  escapeRegExp,
  expandVariantGroup
} from "unocss";
import { defineConfig } from "unocss/vite";
import { Theme, colors } from "unocss/preset-wind3";
import svgToDataUri from "mini-svg-data-uri";

interface CompileClassOptions {
  triggerLayerMapping?: Array<[string, string]>;
  classPrefix?: string;
  hashFn?: (str: string) => string;
  alwaysHash?: boolean;
  keepUnknown?: boolean;
}

const hash = (str: string) => {
  let i;
  let l;
  let hval = 0x811c9dc5;

  for (i = 0, l = str.length; i < l; i++) {
    hval ^= str.charCodeAt(i);
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  return `00000${(hval >>> 0).toString(36)}`.slice(-6);
};
const presetForms = (): Preset<Theme> => {
  return {
    name: "unocss-preset-forms",
    preflights: [
      {
        getCSS: ({ theme }) => {
          const spacing = Object.values(theme.spacing || {});
          const borderWidth = { DEFAULT: "1px" };
          const colors = (theme.colors || {}) as Record<string, Record<string, string>>;
          const inputsClasses = [
            ".font-input",
            ".form-multiselect",
            ".form-textarea",
            ".form-select"
          ];
          const rules = [
            {
              base: inputsClasses,
              class: [".form-input", ".form-textarea", ".form-select", ".form-multiselect"],
              styles: {
                "appearance": "none",
                "background-color": "#fff",
                "border-color": colors.gray["500"],
                "border-width": borderWidth.DEFAULT,
                "border-radius": theme.borderRadius?.none,
                "padding-top": spacing[2],
                "padding-right": spacing[3],
                "padding-bottom": spacing[2],
                "padding-left": spacing[3],
                "font-size": theme.fontSize?.base[0],
                "line-height": theme.fontSize?.base[0],
                "--un-shadow": "0 0 #0000"
              }
            },
            {
              base: inputsClasses.map((cssClass) => `${cssClass}:focus`),
              styles: {
                "--un-ring-inset": "var(--un-empty,/*!*/ /*!*/)",
                "--un-ring-offset-width": "0px",
                "--un-ring-offset-color": "#fff",
                "--un-ring-color": colors.blue["600"],
                "--un-ring-offset-shadow":
                  "var(--un-ring-inset) 0 0 0 var(--un-ring-offset-width) var(--un-ring-offset-color)",
                "--un-ring-shadow":
                  "var(--un-ring-inset) 0 0 0 calc(1px + var(--un-ring-offset-width)) var(--un-ring-color)",
                "box-shadow":
                  "var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow)",
                "border-color": colors.blue["600"]
              }
            },
            {
              base: ["input::placeholder", "textarea::placeholder"],
              class: [".form-input::placeholder", ".form-textarea::placeholder"],
              styles: {
                color: colors.gray["500"],
                opacity: "1"
              }
            },
            {
              base: ["::-webkit-datetime-edit-fields-wrapper"],
              class: [".form-input::-webkit-datetime-edit-fields-wrapper"],
              styles: {
                padding: "0"
              }
            },
            {
              base: ["::-webkit-date-and-time-value"],
              class: [".form-input::-webkit-date-and-time-value"],
              styles: {
                "min-height": "1.5em"
              }
            },
            {
              base: [
                "::-webkit-datetime-edit",
                "::-webkit-datetime-edit-year-field",
                "::-webkit-datetime-edit-month-field",
                "::-webkit-datetime-edit-day-field",
                "::-webkit-datetime-edit-hour-field",
                "::-webkit-datetime-edit-minute-field",
                "::-webkit-datetime-edit-second-field",
                "::-webkit-datetime-edit-millisecond-field",
                "::-webkit-datetime-edit-meridiem-field"
              ],
              class: [
                ".form-input::-webkit-datetime-edit",
                ".form-input::-webkit-datetime-edit-year-field",
                ".form-input::-webkit-datetime-edit-month-field",
                ".form-input::-webkit-datetime-edit-day-field",
                ".form-input::-webkit-datetime-edit-hour-field",
                ".form-input::-webkit-datetime-edit-minute-field",
                ".form-input::-webkit-datetime-edit-second-field",
                ".form-input::-webkit-datetime-edit-millisecond-field",
                ".form-input::-webkit-datetime-edit-meridiem-field"
              ],
              styles: {
                "padding-top": 0,
                "padding-bottom": 0
              }
            },
            {
              base: ["select"],
              class: [".form-select"],
              styles: {
                "background-image": `url("${svgToDataUri(
                  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"><path stroke="${colors.gray["500"]}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 8l4 4 4-4"/></svg>`
                )}")`,
                "background-position": `right ${spacing[2]} center`,
                "background-repeat": `no-repeat`,
                "background-size": `1.5em 1.5em`,
                "padding-right": spacing[10],
                "print-color-adjust": `exact`,
                "-webkit-transition": "none",
                "transition": "none"
              }
            },
            {
              base: ["[multiple]"],
              class: null,
              styles: {
                "background-image": "initial",
                "background-position": "initial",
                "background-repeat": "unset",
                "background-size": "initial",
                "padding-right": spacing[3],
                "print-color-adjust": "unset"
              }
            },
            {
              base: [`[type='checkbox']`, `[type='radio']`],
              class: [".form-checkbox", ".form-radio"],
              styles: {
                "appearance": "none",
                "padding": "0",
                "print-color-adjust": "exact",
                "display": "inline-block",
                "vertical-align": "middle",
                "background-origin": "border-box",
                "user-select": "none",
                "flex-shrink": "0",
                "height": spacing[4],
                "width": spacing[4],
                "color": colors.blue["600"],
                "background-color": "#fff",
                "border-color": colors.gray["500"],
                "border-width": borderWidth.DEFAULT,
                "--tw-shadow": "0 0 #0000"
              }
            },
            {
              base: [`[type='checkbox']`],
              class: [".form-checkbox"],
              styles: {
                "border-radius": theme.borderRadius?.none
              }
            },
            {
              base: [`[type='radio']`],
              class: [".form-radio"],
              styles: {
                "border-radius": "100%"
              }
            },
            {
              base: [`[type='checkbox']:focus`, `[type='radio']:focus`],
              class: [".form-checkbox:focus", ".form-radio:focus"],
              styles: {
                "outline": "2px solid transparent",
                "outline-offset": "2px",
                "--tw-ring-inset": "var(--tw-empty,/*!*/ /*!*/)",
                "--tw-ring-offset-width": "2px",
                "--tw-ring-offset-color": "#fff",
                "--tw-ring-color": colors.blue["600"],
                "--tw-ring-offset-shadow": `var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)`,
                "--tw-ring-shadow": `var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)`,
                "box-shadow": `var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)`
              }
            },
            {
              base: [`[type='checkbox']:checked`, `[type='radio']:checked`],
              class: [".form-checkbox:checked", ".form-radio:checked"],
              styles: {
                "border-color": `transparent`,
                "background-color": `currentColor`,
                "background-size": `100% 100%`,
                "background-position": `center`,
                "background-repeat": `no-repeat`
              }
            },
            {
              base: [`[type='checkbox']:checked`],
              class: [".form-checkbox:checked"],
              styles: {
                "background-image": `url("${svgToDataUri(
                  `<svg viewBox="0 0 16 16" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"/></svg>`
                )}")`
              }
            },
            {
              base: [`[type='radio']:checked`],
              class: [".form-radio:checked"],
              styles: {
                "background-image": `url("${svgToDataUri(
                  `<svg viewBox="0 0 16 16" fill="white" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="3"/></svg>`
                )}")`
              }
            },
            {
              base: [
                `[type='checkbox']:checked:hover`,
                `[type='checkbox']:checked:focus`,
                `[type='radio']:checked:hover`,
                `[type='radio']:checked:focus`
              ],
              class: [
                ".form-checkbox:checked:hover",
                ".form-checkbox:checked:focus",
                ".form-radio:checked:hover",
                ".form-radio:checked:focus"
              ],
              styles: {
                "border-color": "transparent",
                "background-color": "currentColor"
              }
            },
            {
              base: [`[type='checkbox']:indeterminate`],
              class: [".form-checkbox:indeterminate"],
              styles: {
                "background-image": `url("${svgToDataUri(
                  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16"><path stroke="white" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h8"/></svg>`
                )}")`,
                "border-color": `transparent`,
                "background-color": `currentColor`,
                "background-size": `100% 100%`,
                "background-position": `center`,
                "background-repeat": `no-repeat`
              }
            },
            {
              base: [
                `[type='checkbox']:indeterminate:hover`,
                `[type='checkbox']:indeterminate:focus`
              ],
              class: [".form-checkbox:indeterminate:hover", ".form-checkbox:indeterminate:focus"],
              styles: {
                "border-color": "transparent",
                "background-color": "currentColor"
              }
            },
            {
              base: [`[type='file']`],
              class: null,
              styles: {
                "background": "unset",
                "border-color": "inherit",
                "border-width": "0",
                "border-radius": "0",
                "padding": "0",
                "font-size": "unset",
                "line-height": "inherit"
              }
            },
            {
              base: [`[type='file']:focus`],
              class: null,
              styles: {
                outline: `1px solid ButtonText , 1px auto -webkit-focus-ring-color`
              }
            }
          ];
          const createStyleObject = ([key, value]: [string, string | object]): string => {
            if (typeof value === "object") {
              return Object.entries(value)
                .map((styles) => createStyleObject(styles))
                .join("\n");
            }

            return `${key}: ${value};`;
          };
          const style = rules.map((rule) => {
            const selector = rule.base.join(", ");
            const styles = Object.entries(rule.styles)
              .map((style) => createStyleObject(style))
              .join("\n");

            return `${selector} { ${styles} }`;
          });

          return style.join("\n");
        }
      }
    ]
  };
};
const transformerCompileClass = (options: CompileClassOptions = {}): SourceCodeTransformer => {
  const {
    triggerLayerMapping = [],
    classPrefix = "uno-",
    hashFn = hash,
    keepUnknown = true,
    alwaysHash = false
  } = options;
  const compiledClass = new Set();
  const regexps = triggerLayerMapping.map(([trigger]) => {
    return new RegExp(`(["'\`])${escapeRegExp(trigger)}\\s([^\\1]*?)\\1`, "g");
  });

  return {
    name: "@unocss/transformer-compile-class",
    enforce: "pre",
    async transform(s, _, { uno, tokens, invalidate }) {
      for (let i = 0; i < triggerLayerMapping.length; i++) {
        const regexp = regexps[i];
        const [_, layer] = triggerLayerMapping[i];
        const matches = [...s.original.matchAll(regexp)];

        if (!matches.length) return;

        const size = compiledClass.size;

        for (const match of matches) {
          let body =
            match.length === 4 && match.groups
              ? expandVariantGroup(match[3].trim())
              : expandVariantGroup(match[2].trim());

          const start = match.index!;
          const replacements = [];

          if (keepUnknown) {
            const result = await Promise.all(
              body
                .split(/\s+/)
                .filter(Boolean)
                .map(async (i) => [i, !!(await uno.parseToken(i))] as const)
            );
            const known = result.filter(([, matched]) => matched).map(([i]) => i);
            const unknown = result.filter(([, matched]) => !matched).map(([i]) => i);

            replacements.push(...unknown);
            body = known.join(" ");
          }

          if (body) {
            body = body.split(/\s+/).sort().join(" ");

            let hash: string;
            let explicitName = false;

            if (match.groups && match.groups.name) {
              hash = match.groups.name;
              if (alwaysHash) hash += `-${hashFn(body)}`;
              explicitName = true;
            } else {
              hash = hashFn(body);
            }
            const className = `${classPrefix}${hash}`;

            if (tokens && tokens.has(className) && explicitName) {
              const existing = uno.config.shortcuts.find((i) => i[0] === className);

              if (existing && existing[1] !== body)
                throw new Error(
                  `Duplicated compile class name "${className}". One is "${body}" and the other is "${existing[1]}". Please choose different class name or set 'alwaysHash' to 'true'.`
                );
            }

            compiledClass.add(className);
            replacements.unshift(className);

            if (layer) uno.config.shortcuts.push([className, body, { layer }]);
            else uno.config.shortcuts.push([className, body]);

            if (tokens) tokens.add(className);
          }

          s.overwrite(start + 1, start + match[0].length - 1, replacements.join(" "));
        }

        if (compiledClass.size > size) invalidate();
      }
    }
  };
};
const config = defineConfig({
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
      triggerLayerMapping: [
        [":base:", "b1"],
        [":base-2:", "b2"]
      ]
    }),

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
    presetTypography(),
    presetForms()
  ],
  theme: {
    colors: {
      primary: "var(--color-primary)",
      secondary: "var(--color-secondary)",
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
