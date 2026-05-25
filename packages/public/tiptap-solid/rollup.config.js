// rollup.config.js
import withSolid from "rollup-preset-solid";
const config = withSolid({
  targets: ["esm", "cjs"],
  babelOptions: {
    plugins: [
      [
        "@babel/plugin-transform-typescript",
        {
          allowDeclareFields: true,
        },
      ],
    ],
  },
});

export default config;
