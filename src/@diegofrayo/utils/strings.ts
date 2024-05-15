import v from "../v";
import { createArray } from "./arrays-and-objects";

export function generateSlug(str: string) {
	let result = str.replace(/^\s+|\s+$/g, "").toLowerCase();

	result = removeAccents(result)
		.replace(/[^a-z0-9 -]/g, "") // remove invalid chars
		.replace(/\s+/g, "-") // collapse whitespace and replace by -
		.replace(/-+/g, "-"); // collapse dashes

	return result;
}

export function removeAccents(input: string) {
	const FROM = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
	const TO = "aaaaeeeeiiiioooouuuunc------";
	let result = input;

	createArray(FROM.length).forEach((i) => {
		result = replaceAll(result, FROM.charAt(i), TO.charAt(i));
	});

	return result;
}

export function replaceAll(str: string, toReplace: string | string[], replacement: string) {
	if (v.isArray(toReplace)) {
		return toReplace.reduce(
			(result, item) => result.replace(new RegExp(escapeRegExp(item), "g"), replacement),
			str,
		);
	}

	return str.replace(new RegExp(escapeRegExp(toReplace), "g"), replacement);
}

export function createRandomString(length: number) {
	const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const charactersLength = CHARACTERS.length;
	let result = "";

	createArray(length).forEach(() => {
		result += CHARACTERS.charAt(Math.floor(Math.random() * charactersLength));
	});

	return result.toUpperCase();
}

export function addLeftPadding(number: number) {
	return `${number < 10 ? "0" : ""}${number}`;
}

export function capitalize(input: string) {
	return input[0].toUpperCase() + input.slice(1);
}

// --- INTERNALS ---

function escapeRegExp(text: string) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}
