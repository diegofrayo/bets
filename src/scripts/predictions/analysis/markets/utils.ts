import type { T_MarketPrediction } from "../types";

export function analizeCriteria(
	criteria: Array<{ description: string; items: Array<T_CriteriaInput> }>,
) {
	const output = criteria.map((subCriteria) => {
		const result = subCriteria.items.map((subCriteriaItem) => {
			const { fulfilled, ...rest } = subCriteriaItem.fn();

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

export function calculateTrustLevel(analizedCriteria: T_MarketPrediction["criteria"]) {
	if (analizedCriteria[0]?.fulfilled) {
		return "HIGH";
	}

	const anyFullfilledItemExists =
		analizedCriteria.slice(1).find((item) => {
			return item.fulfilled;
		}) !== undefined;

	if (anyFullfilledItemExists !== undefined) {
		return "MEDIUM";
	}

	return "LOW";
}

// --- TYPES ---

type T_CriteriaInput = {
	description: string;
	fn: () => {
		fulfilled: boolean;
		successExplanation: string;
		failExplanation: string;
	};
};

// // @ts-nocheck

// import type {
// 	T_FixtureMatch,
// 	T_League,
// 	T_LeagueStandings,
// 	T_NextMatchPrediction,
// 	T_PlayedMatch,
// 	T_PlayedMatchPrediction,
// 	T_Prediction,
// 	T_RawLeagueStandingsResponse,
// 	T_RawMatchesResponse,
// 	T_RequestConfig,
// 	T_Team,
// 	T_TeamStats,
// } from "../types";
// import TEAMS from "../../data/util/teams.json";
// import v from "../../../../@diegofrayo/v";

// // criteria: Array<{
// //   id: string;
// //   name: string;
// //   weight: number;
// //   recommendable: boolean;
// //   acceptanceCriteria: () => boolean;
// //   criteria: Array<{
// //     enabled: boolean;
// //     description: string;
// //     weight: number;
// //     check: string;
// //   }>;
// // }>;

// type T_CreateAnalysisOutputObjectArgs = Pick<
// 	T_PlayedMatchPrediction,
// 	"id" | "name" | "acceptanceCriteria"
// > & {
// 	criteria: Array<{
// 		id: string;
// 		description: string;
// 		weight: number;
// 		acceptancePercentage: number;
// 		criteria: Array<{
// 			enabled: boolean;
// 			description: string;
// 			weight: number;
// 			fn: () => boolean;
// 		}>;
// 	}>;
// 	warnings?: { description: string; fn: () => boolean }[];
// } & (
// 		| {}
// 		| {
// 				right: (recommendable: boolean) => boolean;
// 				lostRight: (recommendable: boolean) => boolean;
// 				fail: (recommendable: boolean) => boolean;
// 				skippedFail: (recommendable: boolean) => boolean;
// 		  }
// 	);

// export function createAnalysisOutputObject({
// 	id,
// 	name,
// 	criteria,
// 	warnings,
// 	...rest
// }: T_CreateAnalysisOutputObjectArgs): T_Prediction[] {
// 	const result = criteria.map((item) => {
// 		const subCriteriaAnalyzed = item.criteria.map((subCriteriaItem) => {
// 			const subCriteriaItemAchieved = subCriteriaItem.fn();

// 			return {
// 				description: subCriteriaItem.description,
// 				check: subCriteriaItemAchieved ? "✅" : "❌",
// 				weight: subCriteriaItem.weight,
// 			};
// 		});

// 		const acceptancePercentage = subCriteriaAnalyzed.reduce((total, item) => {
// 			return total + item.check === "✅" ? item.weight : 0;
// 		}, 0);
// 		const recommendable = acceptancePercentage >= item.acceptancePercentage;

// 		if ("right" in rest) {
// 			return {
// 				id,
// 				name,
// 				recommendable,
// 				acceptancePercentage: Number(Number(acceptancePercentage).toFixed(2)),
// 				criteria: subCriteriaAnalyzed,
// 				warnings: getWarnings(warnings),
// 				right: rest.right(recommendable),
// 				lostRight: rest.lostRight(recommendable),
// 				fail: rest.fail(recommendable),
// 				skippedFail: rest.skippedFail(recommendable),
// 			};
// 		}

// 		return {
// 			id,
// 			name,
// 			recommendable,
// 			acceptancePercentage: Number(Number(acceptancePercentage).toFixed(2)),
// 			criteria: subCriteriaAnalyzed,
// 			warnings: getWarnings(warnings),
// 		};
// 	});

// 	return result;
// }

// export function checkIsTeamFeatured(
// 	team: { id: number; name: string },
// 	leagueStandings: T_LeagueStandings,
// ) {
// 	return (
// 		getTeamById(team.id)?.featured === true ||
// 		(getTeamPosition(team.id, leagueStandings) || 100) <= (leagueStandings.length === 1 ? 6 : 2)
// 	);
// }

// export function getTeamById(teamId: number) {
// 	return TEAMS[String(teamId) as keyof typeof TEAMS];
// }

// function getWarnings(warnings?: { description: string; fn: () => boolean }[]) {
// 	return (warnings || [])
// 		.filter((warning) => {
// 			return warning.fn();
// 		})
// 		.map((warning) => {
// 			return { description: warning.description };
// 		});
// }

// function getTeamPosition(teamId: number, leagueStandings: T_LeagueStandings) {
// 	const teamPosition = leagueStandings.reduce((result, item) => {
// 		if (result !== -1) {
// 			return result;
// 		}

// 		const subItemIndex = item.findIndex((subItem) => {
// 			return subItem.teamId === teamId;
// 		});

// 		if (subItemIndex !== -1) {
// 			return subItemIndex;
// 		}

// 		return result;
// 	}, -1);

// 	if (teamPosition === -1) {
// 		return null;
// 	}

// 	return teamPosition + 1;
// }
