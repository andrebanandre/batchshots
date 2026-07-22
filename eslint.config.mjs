import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "react-hooks/exhaustive-deps": "off",
      // New react-hooks v6 rules — pre-existing violations, fix as files are touched
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "public/js/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
