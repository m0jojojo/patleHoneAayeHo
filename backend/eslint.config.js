const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const globals = require("globals");

module.exports = tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.worker,
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
		},
	},
	{
		files: ["eslint.config.js"],
		languageOptions: {
			sourceType: "commonjs",
			globals: {
				...globals.node,
			},
		},
		rules: {
			"@typescript-eslint/no-require-imports": "off",
		},
	},
	{
		files: ["**/*.d.ts"],
		rules: {
			"@typescript-eslint/no-empty-object-type": "off",
		},
	},
	{
		ignores: ["node_modules/**", ".wrangler/**"],
	},
);
