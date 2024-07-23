import type { T_MarketPrediction } from "../types";
import { analizeCriteria, calculateTrustLevel } from "./utils";

function doubleOpportunityAnalysis(): T_MarketPrediction {
	const criteria = [
		{
			description: "Subcriterios 1",
			items: [
				{
					description: "El equipo local tiene un promedio de goles alto",
					fn: () => {
						return {
							fulfilled: true,
							successExplanation: "successExplanation",
							failExplanation: "failExplanation",
						};
					},
				},
				{
					description: "El equipo visitante tiene un promedio de goles alto",
					fn: () => {
						return {
							fulfilled: true,
							successExplanation: "successExplanation",
							failExplanation: "failExplanation",
						};
					},
				},
			],
		},
		{
			description: "Subcriterios 2",
			items: [
				{
					description: "El equipo local es destacado",
					fn: () => {
						return {
							fulfilled: false,
							successExplanation: "successExplanation",
							failExplanation: "failExplanation",
						};
					},
				},
				{
					description: "El equipo visitante es debil",
					fn: () => {
						return {
							fulfilled: true,
							successExplanation: "successExplanation",
							failExplanation: "failExplanation",
						};
					},
				},
			],
		},
		{
			description: "Subcriterios 3",
			items: [
				{
					description: "El equipo local hace muchos goles en partidos como local",
					fn: () => {
						return {
							fulfilled: true,
							successExplanation: "successExplanation",
							failExplanation: "failExplanation",
						};
					},
				},
				{
					description: "El equipo visitante recibe muchos goles en partidos como visitante",
					fn: () => {
						return {
							fulfilled: true,
							successExplanation: "successExplanation",
							failExplanation: "failExplanation",
						};
					},
				},
			],
		},
	];
	const analyzedCriteria = analizeCriteria(criteria);

	return {
		id: "gol-equipo-local",
		name: "Gol del equipo local",
		shortName: "GL",
		trustLevel: calculateTrustLevel(analyzedCriteria),
		criteria: analyzedCriteria,
	};
}

export default doubleOpportunityAnalysis;

// {
// 	// match,
// 	// homeTeam,
// 	// awayTeam,
// 	// leagueStandings,
// }: {
// 	// match: T_FixtureMatch;
// 	// homeTeam: T_Team;
// 	// awayTeam: T_Team;
// 	// leagueStandings: T_LeagueStandings;
// },

// const subCriteriaAnalyzed = item.criteria.map((subCriteriaItem) => {
// 	const subCriteriaItemAchieved = subCriteriaItem.fn();

// 	return {
// 		description: subCriteriaItem.description,
// 		check: subCriteriaItemAchieved ? "✅" : "❌",
// 		weight: subCriteriaItem.weight,
// 	};
// });

// const acceptancePercentage = subCriteriaAnalyzed.reduce((total, item) => {
// 	return total + item.check === "✅" ? item.weight : 0;
// }, 0);
// const recommendable = acceptancePercentage >= item.acceptancePercentage;

// if ("right" in rest) {
// 	return {
// 		id,
// 		name,
// 		recommendable,
// 		acceptancePercentage: Number(Number(acceptancePercentage).toFixed(2)),
// 		criteria: subCriteriaAnalyzed,
// 		warnings: getWarnings(warnings),
// 		right: rest.right(recommendable),
// 		lostRight: rest.lostRight(recommendable),
// 		fail: rest.fail(recommendable),
// 		skippedFail: rest.skippedFail(recommendable),
// 	};
// }

// return {
// 	id,
// 	name,
// 	recommendable,
// 	acceptancePercentage: Number(Number(acceptancePercentage).toFixed(2)),
// 	criteria: subCriteriaAnalyzed,
// 	warnings: getWarnings(warnings),
// };

// const criteria = [
// 	{
// 		id: "",
// 		description: "",
// 		weight: 0.5,
// 		acceptancePercentage: 75,
// 		criteria: [
// 			{
// 				enabled: true,
// 				description: "El local es destacado",
// 				weight: 0.75,
// 				fn: () => {
// 					return checkIsTeamFeatured(homeTeam, leagueStandings) === true;
// 				},
// 			},
// 			{
// 				enabled: true,
// 				description: "El visitante no es destacado",
// 				weight: 0.25,
// 				fn: () => {
// 					return checkIsTeamFeatured(awayTeam, leagueStandings) === false;
// 				},
// 			},
// 		],
// 	},
// ];
// const warnings = [
// 	{
// 		description: "El visitante es destacado",
// 		fn: () => {
// 			return checkIsTeamFeatured(awayTeam, leagueStandings) === true;
// 		},
// 	},
// ];
// return createAnalysisOutputObject({
// 	id: "DO",
// 	name: "Doble oportunidad",
// 	acceptanceCriteria: (criteria) => {
// 		return criteria[0].recommendable;
// 	},
// 	criteria,
// 	warnings,
// 	...(match.played
// 		? {
// 				right: (recommendable: boolean) =>
// 					recommendable && (match.teams.home.winner === true || match.teams.home.winner === null),
// 				lostRight: (recommendable: boolean) =>
// 					!recommendable &&
// 					(match.teams.home.winner === true || match.teams.home.winner === null),
// 				fail: (recommendable: boolean) => recommendable && match.teams.home.winner === false,
// 				skippedFail: (recommendable: boolean) =>
// 					!recommendable && match.teams.home.winner === false,
// 			}
// 		: {}),
// });

/*
function getTeamPositionStats(teamId: number, leagueStandings: T_LeagueStandings) {
	const teamPositionStats = leagueStandings.reduce(
		(result: T_LeagueStandings[number][number] | undefined, item) => {
			if (result) {
				return result;
			}

			const subItemFound = item.find((subItem) => {
				return subItem.teamId === teamId;
			});

			return subItemFound;
		},
		undefined,
	);

	return teamPositionStats;
}
*/
