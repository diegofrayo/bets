import { Entries } from "type-fest";
import type {
	T_FixtureMatch,
	T_FixtureMatchTeam,
	T_MarketPrediction,
	T_PlayedMatchMarketPrediction,
	T_TeamStats,
} from "../types";

export function analizeCriteria(
	criteria: Array<{ description: string; items: Array<T_CriteriaInput> }>,
	data: T_PredictionsInput,
) {
	const output = criteria.map((subCriteria) => {
		const result = subCriteria.items.map((subCriteriaItem) => {
			const { fulfilled, ...rest } = subCriteriaItem.fn(data);

			if (fulfilled) {
				return {
					fulfilled,
					description: subCriteriaItem.description,
					explanation: rest.successExplanation,
				};
			}

			return {
				fulfilled,
				description: subCriteriaItem.description,
				explanation: rest.failExplanation,
			};
		});

		return { description: subCriteria.description, items: result };
	});

	return output.map((subCriteria) => {
		const someFullfilledItemNotExists =
			subCriteria.items.find((item) => {
				return item.fulfilled === false;
			}) === undefined;

		return {
			fulfilled: someFullfilledItemNotExists,
			description: subCriteria.description,
			items: subCriteria.items,
		};
	});
}

export function calculateTrustLevel(
	analizedCriteria: T_MarketPrediction["criteria"],
): T_MarketPrediction["trustLevel"] {
	if (analizedCriteria[0]?.fulfilled) {
		return "1|HIGH";
	}

	const anyFullfilledItemExists =
		analizedCriteria.slice(1).find((item) => {
			return item.fulfilled === true;
		}) !== undefined;

	if (anyFullfilledItemExists) {
		return "2|MEDIUM";
	}

	return "3|LOW";
}

export function createMarketPredictionOutput({
	criteria,
	results,
	predictionsInput,
	...rest
}: Pick<T_MarketPrediction, "id" | "name" | "shortName" | "criteria"> & {
	predictionsInput: T_PredictionsInput;
	results:
		| Record<
				keyof T_PlayedMatchMarketPrediction["results"],
				(
					trustLevel: T_MarketPrediction["trustLevel"],
					predictionsInput: T_PredictionsInput,
				) => boolean
		  >
		| undefined;
}): T_MarketPrediction {
	const output = {
		...rest,
		criteria,
		trustLevel: calculateTrustLevel(criteria),
	};

	if (results) {
		return {
			...output,
			results: (Object.entries(results) as Entries<typeof results>).reduce(
				(result, [key, fn]) => {
					return {
						...result,
						[key]: fn(output.trustLevel, predictionsInput),
					};
				},
				{} as T_PlayedMatchMarketPrediction["results"],
			),
		};
	}

	return output;
}

// --- TYPES ---

export type T_CriteriaInput = {
	description: string;
	fn: (predictionsInput: T_PredictionsInput) => {
		fulfilled: boolean;
		successExplanation: string;
		failExplanation: string;
	};
};

export type T_PredictionsInput = {
	match: T_FixtureMatch;
	homeTeam: T_FixtureMatchTeam;
	awayTeam: T_FixtureMatchTeam;
	homeTeamStats: T_TeamStats;
	awayTeamStats: T_TeamStats;
};
