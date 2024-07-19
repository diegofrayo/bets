// @ts-nocheck

import { checkIsTeamFeatured, createAnalysisOutputObject } from "./utils";
import type { T_FixtureMatch, T_LeagueStandings, T_Team } from "../types";

function doubleOpportunityAnalysis({
	match,
	homeTeam,
	awayTeam,
	leagueStandings,
}: {
	match: T_FixtureMatch;
	homeTeam: T_Team;
	awayTeam: T_Team;
	leagueStandings: T_LeagueStandings;
}) {
	const criteria = [
		{
			id: "",
			description: "",
			weight: 0.5,
			acceptancePercentage: 75,
			criteria: [
				{
					enabled: true,
					description: "El local es destacado",
					weight: 0.75,
					fn: () => {
						return checkIsTeamFeatured(homeTeam, leagueStandings) === true;
					},
				},
				{
					enabled: true,
					description: "El visitante no es destacado",
					weight: 0.25,
					fn: () => {
						return checkIsTeamFeatured(awayTeam, leagueStandings) === false;
					},
				},
			],
		},
	];
	const warnings = [
		{
			description: "El visitante es destacado",
			fn: () => {
				return checkIsTeamFeatured(awayTeam, leagueStandings) === true;
			},
		},
	];

	return createAnalysisOutputObject({
		id: "DO",
		name: "Doble oportunidad",
		acceptanceCriteria: (criteria) => {
			return criteria[0].recommendable;
		},
		criteria,
		warnings,
		...(match.played
			? {
					right: (recommendable: boolean) =>
						recommendable && (match.teams.home.winner === true || match.teams.home.winner === null),
					lostRight: (recommendable: boolean) =>
						!recommendable &&
						(match.teams.home.winner === true || match.teams.home.winner === null),
					fail: (recommendable: boolean) => recommendable && match.teams.home.winner === false,
					skippedFail: (recommendable: boolean) =>
						!recommendable && match.teams.home.winner === false,
				}
			: {}),
	});
}

export default doubleOpportunityAnalysis;
