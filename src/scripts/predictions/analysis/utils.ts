export async function asyncLoop<T>(
	array: Array<T>,
	callback: (arg: T) => Promise<void>,
): Promise<void> {
	// eslint-disable-next-line  no-restricted-syntax
	for (const item of array) {
		// eslint-disable-next-line no-await-in-loop
		await callback(item);
	}
}
