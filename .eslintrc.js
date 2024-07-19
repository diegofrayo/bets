const warnRulesValue = process.env.NO_LINT_WARNINGS ? "off" : "warn";

module.exports = {
	parser: "@typescript-eslint/parser",
	plugins: ["prettier", "@typescript-eslint"],
	ignorePatterns: [
		".eslintrc.js",
		"src/scripts/browser-extension",
		"src/**/*.js",
		"src/scripts/predictions/analysis/markets/*.ts",
	],
	root: true,
	extends: [
		"airbnb",
		"airbnb-typescript",
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:import/errors",
		"plugin:import/typescript",
		"plugin:import/warnings",
		"plugin:prettier/recommended",
		"prettier",
	],
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: "module",
		project: "./tsconfig.json",
		tsconfigRootDir: __dirname,
		ecmaFeatures: {},
	},
	globals: {
		console: true,
		module: true,
		process: true,
	},
	rules: {
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/lines-between-class-members": "off",
		"@typescript-eslint/no-use-before-define": "off",
		"class-methods-use-this": "off",
		"import/extensions": "off",
		"import/no-unresolved": "off",
		"import/order": "off",
		"import/prefer-default-export": "off",
		"no-console": "off",
		"no-nested-ternary": "off",

		"no-restricted-syntax": warnRulesValue,
		"no-alert": warnRulesValue,
		"no-debugger": warnRulesValue,
		"@typescript-eslint/ban-ts-comment": warnRulesValue,
		"@typescript-eslint/ban-types": [
			warnRulesValue,
			{
				types: {
					Function: true,
				},
				extendDefaults: true,
			},
		],

		"@typescript-eslint/naming-convention": [
			"error",
			{
				selector: "interface",
				format: ["PascalCase"],
				prefix: ["I_"],
			},
			{
				selector: "typeAlias",
				format: ["PascalCase"],
				prefix: ["T_"],
			},
		],
		"@typescript-eslint/no-explicit-any": "error",
		"@typescript-eslint/no-shadow": ["error", { allow: ["params", "data", "result"] }],
		"@typescript-eslint/no-unused-vars": "error",
		"no-restricted-exports": ["error", { restrictedNamedExports: [] }],
		"prettier/prettier": [
			"error",
			{
				endOfLine: "auto",
			},
		],
	},
};
