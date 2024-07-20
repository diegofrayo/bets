import * as prettier from "prettier";

import { addLeftPadding, replaceAll } from "../../../@diegofrayo/utils/strings";
import v from "../../../@diegofrayo/v";

import prettierConfig from "../../../../.prettierrc.js";

export function formatDate(date: Date) {
	return `${date.getFullYear()}-${addLeftPadding(date.getMonth() + 1)}-${addLeftPadding(
		date.getDate(),
	)}`;
}

// https://prettier.io/docs/en/options#parser
export async function formatCode(input: string | object, parser: "css" | "json") {
	const formattedCode = await prettier.format(
		v.isObject(input) || v.isArray(input) ? JSON.stringify(input) : String(input),
		{
			parser,
			...(prettierConfig as prettier.Config),
		},
	);

	return replaceAll(formattedCode, "\\r", "");
}
