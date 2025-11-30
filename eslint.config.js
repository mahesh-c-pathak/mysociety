// eslint.config.js
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  ...expoConfig,

  {
    ignores: ["dist/*"],

    // ✅ Explicitly load required plugins
    plugins: {
      "react-native": require("eslint-plugin-react-native"),
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
    },

    rules: {
      // 🧹 Detect unused styles in StyleSheet.create()
      "react-native/no-unused-styles": "warn",

      // 🧠 Clean up unused vars
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],

      // ✅ Allow modern React (no need for import React)
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // 🪶 Optional cleanups
      "import/no-unresolved": "off",
      "react-native/no-inline-styles": "off",
      "react-native/no-raw-text": "off",
    },
  },
]);
