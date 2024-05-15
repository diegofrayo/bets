/*
 * Inspiration:
 * - https://github.com/kibertoad/validation-utils
 * - https://validatejs.org
 * - https://github.com/anonym101/x-utils-es
 */

// --- PRIMITIVES ---

function isString(input: unknown): input is string {
	return typeof input === "string";
}

function isNumber(input: unknown): input is number {
	return typeof input === "number";
}

function isBoolean(input: unknown): input is boolean {
	return typeof input === "boolean";
}

function isDate(input: unknown): input is Date {
	return input instanceof Date;
}

function isNull(input: unknown): input is null {
	return input === null;
}

function isUndefined(input: unknown): input is undefined {
	return typeof input === "undefined";
}

function isObject<G_InputType = Record<string | number | symbol, unknown>>(
	input: unknown,
): input is G_InputType {
	if (isNil(input) || isArray(input)) return false;

	return typeof input === "object";
}

function isArray<G_ItemsType = unknown>(input: unknown): input is G_ItemsType[] {
	return Array.isArray(input);
}

function isArrayOf<G_ItemsType>(input: unknown, type: "string"): input is G_ItemsType[] {
	// eslint-disable-next-line valid-typeof
	return Array.isArray(input) && input.every((item) => typeof item === type);
}

function isFunction<G_InputType = Function>(input: unknown): input is G_InputType {
	return isUndefined(input) === false && typeof input === "function";
}

// --- STRINGS ---

function isEmptyString(input: unknown) {
	return typeof input === "string" && input.length === 0;
}

function isNotEmptyString(input: unknown): input is string {
	return typeof input === "string" && input.length > 0;
}

// --- NUMBERS ---

function between(input: number, range: [number, number]) {
	return input >= range[0] && input <= range[1];
}

// --- BOOLEANS ---

function isTrue(input: unknown): input is boolean {
	return input === true;
}

function isFalse(input: unknown): input is boolean {
	return input === false;
}

// --- ARRAYS ---

function isNotEmptyArray(input: unknown): input is unknown[] {
	return Array.isArray(input) && input.length > 0;
}

function isEmptyArray(input: unknown) {
	return Array.isArray(input) && input.length === 0;
}

// --- OBJECTS ---

function isEmptyObject(input: unknown): input is object {
	return (
		isObject(input) &&
		Object.keys(input).length === 0 &&
		Object.getPrototypeOf(input) === Object.prototype
	);
}

function isNotEmptyObject(input: unknown): input is object {
	return isObject(input) && Object.keys(input).length > 0;
}

// --- SEMANTICS ---

function isEmpty(input: unknown) {
	return isEmptyString(input) || isEmptyObject(input) || isEmptyArray(input);
}

function isNotEmpty(input: unknown): input is string {
	return isEmpty(input) === false;
}

function isNil(input: unknown): input is null | undefined {
	return input === null || input === undefined;
}

function isNotNil(input: unknown) {
	return isNil(input) === false;
}

function isFalsy(input: unknown) {
	return !input;
}

function isEqual(input1: unknown, input2: unknown) {
	return input1 === input2;
}

function isNotEqual(input1: unknown, input2: unknown) {
	return isEqual(input1, input2) === false;
}

function isDefined(input: unknown) {
	return input !== undefined;
}

function exists(input: unknown) {
	return isDefined(input);
}

function notFound(input: unknown): input is undefined {
	return isDefined(input) === false;
}

// --- VALUES ---

function isEmail(email: unknown): email is string {
	return (
		String(email)
			.toLowerCase()
			.match(
				/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
			) !== null
	);
}

const v = {
	// --- PRIMITIVES ---
	isString,
	isNumber,
	isBoolean,
	isDate,
	isNull,
	isUndefined,
	isObject,
	isArray,
	isArrayOf,
	isFunction,

	// --- STRINGS ---
	isEmptyString,
	isNotEmptyString,

	// --- NUMBERS ---
	between,

	// --- BOOLEANS ---
	isTrue,
	isFalse,

	// --- ARRAYS ---
	isNotEmptyArray,
	isEmptyArray,

	// --- OBJECTS ---
	isEmptyObject,
	isNotEmptyObject,

	// --- SEMANTICS ---
	isEmpty,
	isNotEmpty,
	isNil,
	isNotNil,
	isFalsy,
	isEqual,
	isNotEqual,
	isDefined,
	exists,
	notFound,

	// --- VALUES ---
	isEmail,
};

export default v;
