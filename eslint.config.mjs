import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const next = require("eslint-config-next/core-web-vitals");

export default [
  ...next,
  {
    ignores: [
      "content/**",
      "public/**",
      ".next/**",
      "tina/__generated__/**",
      "node_modules/**",
    ],
  },
  {
    rules: {
      "@next/next/no-css-tags": "off",
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
    },
  },
];
