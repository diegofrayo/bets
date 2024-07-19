// @ts-nocheck

import type {
	T_FixtureMatch,
	T_League,
	T_LeagueStandings,
	T_NextMatchPrediction,
	T_PlayedMatch,
	T_PlayedMatchPrediction,
	T_Prediction,
	T_RawLeagueStandingsResponse,
	T_RawMatchesResponse,
	T_RequestConfig,
	T_Team,
	T_TeamStats,
} from "../types";
import TEAMS from "../../data/util/teams.json";
import v from "../../../../@diegofrayo/v";

// criteria: Array<{
//   id: string;
//   name: string;
//   weight: number;
//   recommendable: boolean;
//   acceptanceCriteria: () => boolean;
//   criteria: Array<{
//     enabled: boolean;
//     description: string;
//     weight: number;
//     check: string;
//   }>;
// }>;

type T_CreateAnalysisOutputObjectArgs = Pick<
	T_PlayedMatchPrediction,
	"id" | "name" | "acceptanceCriteria"
> & {
	criteria: Array<{
		id: string;
		description: string;
		weight: number;
		acceptancePercentage: number;
		criteria: Array<{
			enabled: boolean;
			description: string;
			weight: number;
			fn: () => boolean;
		}>;
	}>;
	warnings?: { description: string; fn: () => boolean }[];
} & (
		| {}
		| {
				right: (recommendable: boolean) => boolean;
				lostRight: (recommendable: boolean) => boolean;
				fail: (recommendable: boolean) => boolean;
				skippedFail: (recommendable: boolean) => boolean;
		  }
	);

export function createAnalysisOutputObject({
	id,
	name,
	criteria,
	warnings,
	...rest
}: T_CreateAnalysisOutputObjectArgs): T_Prediction[] {
	const result = criteria.map((item) => {
		const subCriteriaAnalyzed = item.criteria.map((subCriteriaItem) => {
			const subCriteriaItemAchieved = subCriteriaItem.fn();

			return {
				description: subCriteriaItem.description,
				check: subCriteriaItemAchieved ? "✅" : "❌",
				weight: subCriteriaItem.weight,
			};
		});

		const acceptancePercentage = subCriteriaAnalyzed.reduce((total, item) => {
			return total + item.check === "✅" ? item.weight : 0;
		}, 0);
		const recommendable = acceptancePercentage >= item.acceptancePercentage;

		if ("right" in rest) {
			return {
				id,
				name,
				recommendable,
				acceptancePercentage: Number(Number(acceptancePercentage).toFixed(2)),
				criteria: subCriteriaAnalyzed,
				warnings: getWarnings(warnings),
				right: rest.right(recommendable),
				lostRight: rest.lostRight(recommendable),
				fail: rest.fail(recommendable),
				skippedFail: rest.skippedFail(recommendable),
			};
		}

		return {
			id,
			name,
			recommendable,
			acceptancePercentage: Number(Number(acceptancePercentage).toFixed(2)),
			criteria: subCriteriaAnalyzed,
			warnings: getWarnings(warnings),
		};
	});

	return result;
}

export function checkIsTeamFeatured(
	team: { id: number; name: string },
	leagueStandings: T_LeagueStandings,
) {
	return (
		getTeamById(team.id)?.featured === true ||
		(getTeamPosition(team.id, leagueStandings) || 100) <= (leagueStandings.length === 1 ? 6 : 2)
	);
}

export function getTeamById(teamId: number) {
	return TEAMS[String(teamId) as keyof typeof TEAMS];
}

function getWarnings(warnings?: { description: string; fn: () => boolean }[]) {
	return (warnings || [])
		.filter((warning) => {
			return warning.fn();
		})
		.map((warning) => {
			return { description: warning.description };
		});
}

function getTeamPosition(teamId: number, leagueStandings: T_LeagueStandings) {
	const teamPosition = leagueStandings.reduce((result, item) => {
		if (result !== -1) {
			return result;
		}

		const subItemIndex = item.findIndex((subItem) => {
			return subItem.teamId === teamId;
		});

		if (subItemIndex !== -1) {
			return subItemIndex;
		}

		return result;
	}, -1);

	if (teamPosition === -1) {
		return null;
	}

	return teamPosition + 1;
}
