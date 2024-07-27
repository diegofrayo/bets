import { Entries } from "type-fest";
import type {
	T_FixtureMatch,
	T_FixtureMatchTeam,
	T_MarketPrediction,
	T_PlayedMatchMarketPrediction,
	T_TeamStats,
} from "../types";
import { sortBy } from "../../../../@diegofrayo/sort";

export function analizeCriteria(
	criteria: Array<{ description: string; trustLevel: number; items: Array<T_CriteriaInput> }>,
	data: T_PredictionsInput,
): T_MarketPrediction["criteria"] {
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

		return { ...subCriteria, items: result };
	});

	return output
		.map((subCriteria) => {
			const allItemsAreFullFilled =
				subCriteria.items.find((item) => {
					return item.fulfilled === false;
				}) === undefined;

			return {
				...subCriteria,
				fulfilled: allItemsAreFullFilled,
			};
		})
		.sort(sortBy("fulfilled", "-trustLevel"));
}

export function calculateTrustLevelLabel(
	trustLevel: T_MarketPrediction["trustLevel"],
): T_MarketPrediction["trustLevelLabel"] {
	if (trustLevel === 100) {
		return "HIGH";
	}

	if (trustLevel >= 50 && trustLevel <= 80) {
		return "MEDIUM";
	}

	return "LOW";
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
					trustLevelLabel: T_MarketPrediction["trustLevelLabel"],
					predictionsInput: T_PredictionsInput,
				) => boolean
		  >
		| undefined;
}): T_MarketPrediction {
	const trustLevel = criteria[0].fulfilled ? criteria[0].trustLevel : 0;
	const output: T_MarketPrediction = {
		...rest,
		criteria,
		trustLevel,
		trustLevelLabel: calculateTrustLevelLabel(trustLevel),
	};

	if (results) {
		return {
			...output,
			results: (Object.entries(results) as Entries<typeof results>).reduce(
				(result, [key, fn]) => {
					return {
						...result,
						[key]: fn(output.trustLevelLabel, predictionsInput),
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
