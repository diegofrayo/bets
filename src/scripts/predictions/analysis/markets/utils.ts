import { Entries } from "type-fest";
import type {
	T_FixtureMatch,
	T_FixtureMatchTeam,
	T_FixturePlayedMatch,
	T_LeagueStandings,
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
					predictionsInput: T_PredictionsInput & { match: T_FixturePlayedMatch },
				) => boolean
		  >
		| undefined;
}): T_MarketPrediction | null {
	if (criteria.length === 0) {
		return null;
	}

	const trustLevel = criteria[0].fulfilled ? criteria[0].trustLevel : 0;
	const output: T_MarketPrediction = {
		...rest,
		criteria,
		trustLevel,
		trustLevelLabel: calculateTrustLevelLabel(trustLevel),
	};

	if (results) {
		const predictionsInput_ = {
			...predictionsInput,
			match: predictionsInput.match as T_FixturePlayedMatch,
		};
		return {
			...output,
			results: (Object.entries(results) as Entries<typeof results>).reduce(
				(result, [key, fn]) => {
					return {
						...result,
						[key]: fn(output.trustLevelLabel, predictionsInput_),
					};
				},
				{} as T_PlayedMatchMarketPrediction["results"],
			),
		};
	}

	return output;
}

export function getTeamPosition(teamId: number, leagueStandings: T_LeagueStandings) {
	const teamPosition = leagueStandings.items.findIndex((item) => {
		return item.teamId === teamId;
	}, -1);

	if (teamPosition === -1) {
		return null;
	}

	return teamPosition + 1;
}

export function getTeamPoints(selectedTeam: T_FixtureMatchTeam) {
	return selectedTeam.matches.slice(0, 5).reduce((result, match) => {
		const side = match.teams.home.id === selectedTeam.id ? "home" : "away";
		const selectedTeamDetails = match.teams[side];

		return (
			result +
			(selectedTeamDetails.result === "WIN" ? 3 : selectedTeamDetails.result === "DRAW" ? 1 : 0)
		);
	}, 0);
}

export function isMatchInLocalLeague(match: T_FixtureMatch, leagueStandings: T_LeagueStandings) {
	return (
		match.league.country.name !== "World" &&
		match.league.type === "League" &&
		leagueStandings.items.length > 10
	);
}

export function getLeagueStandingsLimits(
	leagueStandings: T_LeagueStandings,
	showWarningMessage?: boolean,
) {
	if (leagueStandings.items.length === 28) {
		return {
			featured: 9,
			poor: leagueStandings.items.length - 7,
		};
	}

	if (leagueStandings.items.length === 24) {
		return {
			featured: 8,
			poor: leagueStandings.items.length - 6,
		};
	}

	if (leagueStandings.items.length === 20 || leagueStandings.items.length === 19) {
		return {
			featured: 6,
			poor: leagueStandings.items.length - 4,
		};
	}

	if (leagueStandings.items.length === 18 || leagueStandings.items.length === 16) {
		return {
			featured: 5,
			poor: leagueStandings.items.length - 3,
		};
	}

	if (leagueStandings.items.length === 12) {
		return {
			featured: 4,
			poor: leagueStandings.items.length - 2,
		};
	}

	if (showWarningMessage) {
		console.log(`Unknown league standings length: ${leagueStandings.items.length}`);
	}

	return {
		featured: 0,
		poor: 0,
	};
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
	leagueStandings: T_LeagueStandings;
};
