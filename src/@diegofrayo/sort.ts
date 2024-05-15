import { removeDuplicates } from "./utils/arrays-and-objects";
import v from "./v";

type T_SortableType = string | number | boolean | Date;

export function sortPlainArray(
	order: "asc" | "desc",
): (a: T_SortableType, b: T_SortableType) => number {
	return function sortByReturn(a, b) {
		const greater = order === "desc" ? -1 : 1;
		const smaller = order === "desc" ? 1 : -1;
		const aParam = a;
		const bParam = b;

		if (aParam > bParam) {
			return greater;
		}

		if (aParam < bParam) {
			return smaller;
		}

		return 0;
	};
}

type T_PickSortableAttributes<G_Type> = {
	[Key in keyof G_Type as G_Type[Key] extends T_SortableType ? Key : never]: G_Type[Key];
};

type T_ExtendTypeKeys<G_Type> = {
	[Key in keyof T_PickSortableAttributes<G_Type>]: G_Type[Key];
} & {
	[Key in keyof T_PickSortableAttributes<G_Type> as Key extends string
		? `-${Key}`
		: never]: G_Type[Key];
};

// asc  = 1...5  |  "title"
// desc = 5...1  |  "-title"
export function sortBy<G_ItemType>(
	...criteria: (keyof T_ExtendTypeKeys<G_ItemType>)[]
): (a: G_ItemType, b: G_ItemType) => number {
	return function sortByReturn(a, b) {
		return removeDuplicates(criteria).reduce(
			(result, criteriaItem) => {
				if (result.finish) {
					return result;
				}

				// NOTE: This "as" is safe and not too bad
				const attribute = (criteriaItem as string).replace("-", "") as keyof G_ItemType;
				const order = (criteriaItem as string).startsWith("-") ? "desc" : "asc";
				const greater = order === "desc" ? -1 : 1;
				const smaller = order === "desc" ? 1 : -1;
				const aParam = a[attribute];
				const bParam = b[attribute];

				if (v.isBoolean(aParam) && v.isBoolean(bParam)) {
					if (v.isTrue(aParam) && v.isFalse(bParam)) {
						return { result: greater, finish: true };
					}

					if (v.isFalse(aParam) && v.isTrue(bParam)) {
						return { result: smaller, finish: true };
					}

					return result;
				}

				if (aParam > bParam) {
					return { result: greater, finish: true };
				}

				if (aParam < bParam) {
					return { result: smaller, finish: true };
				}

				return result;
			},
			{ result: 0, finish: false },
		).result;
	};
}
