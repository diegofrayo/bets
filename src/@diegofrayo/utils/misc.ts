import v from "../v";

export function throwError(message: string): never {
	throw new Error(message);
}

export function getErrorMessage(error: unknown) {
	if (isHttpError(error)) {
		return error.response.data.message;
	}

	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	return "Unknown error";
}

export function isBrowser() {
	return typeof window !== "undefined";
}

export function isServer() {
	return !isBrowser();
}

export function delay(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export async function safeAsync<G_Return>(
	callback: () => G_Return,
): Promise<[G_Return, undefined] | [undefined, Error]> {
	try {
		const response = await callback();

		return [response, undefined];
	} catch (error) {
		return [undefined, error as Error];
	}
}

export async function resolvePromisesSequentially(tasks: (() => unknown | Promise<unknown>)[]) {
	return tasks.reduce(
		async (resultPromised, task) => {
			const result = await resultPromised;
			const taskResult = await task();
			return result.concat([taskResult]);
		},
		Promise.resolve([] as unknown[]),
	);
}

export async function asyncLoop<T>(
	array: Array<T>,
	callback: (arg: T) => Promise<void>,
): Promise<void> {
	// eslint-disable-next-line no-restricted-syntax
	for (const item of array) {
		// eslint-disable-next-line no-await-in-loop
		await callback(item);
	}
}

export function getImageOrientation(source: string): Promise<"portrait" | "landscape" | "square"> {
	return new Promise((resolve) => {
		const img = new Image();

		img.src = source;
		img.onload = () => {
			if (img.naturalWidth > img.naturalHeight) {
				resolve("landscape");
			} else if (img.naturalWidth < img.naturalHeight) {
				resolve("portrait");
			}

			resolve("square");
		};
	});
}

// --- INTERNALS ---

type T_HttpError = { response: { data: { message: string } } };

function isHttpError(error: unknown): error is T_HttpError {
	return v.isString((error as T_HttpError)?.response?.data?.message);
}
