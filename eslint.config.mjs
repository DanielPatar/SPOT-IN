import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import react from "eslint-plugin-react";

// FR-M25-05: every user-facing string lives in messages/id.json. A literal string in
// JSX text fails the build. Punctuation and symbols are allowed.
const allowedStrings = ["·", "—", "–", "/", "|", "×", "•", ":", "(", ")", "*", "→", "←", "+", "-", "%", "#", "…", "✓", "Rp", "m²", "kVA"];

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: ["docs/mockups/**", ".claude/**", ".next/**", "node_modules/**", "storage/**", ".local/**", "playwright-report/**", "test-results/**", "next-env.d.ts"],
  },
  {
    files: ["src/**/*.tsx"],
    plugins: { react },
    rules: {
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true, allowedStrings }],
    },
  },
  {
    rules: {
      // Files are served through signed, expiring URLs; next/image optimisation would cache them publicly.
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;
