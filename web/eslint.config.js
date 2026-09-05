import pluginVue from "eslint-plugin-vue";
import vueTsEslintConfig from "@vue/eslint-config-typescript";

export default [
  { ignores: ["dist/**", "dev-dist/**"] },
  ...pluginVue.configs["flat/recommended"],
  ...vueTsEslintConfig(),
];
