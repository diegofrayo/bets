import { sortBy } from "../../../@diegofrayo/sort";
import type DR from "../../../@diegofrayo/types";
import { removeDuplicates } from "../../../@diegofrayo/utils/arrays-and-objects";
import { fileExists, readFile, writeFile } from "../../../@diegofrayo/utils/files";
import { asyncLoop, delay, getErrorMessage, throwError } from "../../../@diegofrayo/utils/misc";
import { generateSlug } from "../../../@diegofrayo/utils/strings";
import v from "../../../@diegofrayo/v";

import LEAGUES from "../data/util/leagues.json";
import APIClient from "./api-client";
import type {
	T_FixtureMatch,
	T_FixtureNextMatch,
	T_FixturePlayedMatch,
	T_League,
	T_LeagueStandings,
	T_PlayedMatch,
	T_RawLeagueStandingsResponse,
	T_RawMatchesResponse,
	T_RequestConfig,
	T_Team,
	T_TeamStats,
} from "./types";
import { formatCode } from "./utils";
import { checkIsTeamFeatured, getTeamById } from "./markets/utils";

// import TEAMS from "../data/util/teams.json";
// import doubleOpportunityAnalysis from "./markets/double-opportunity";
// import homeTeamScoresAnalysis from "./markets/home-team-scores";
// import awayTeamScoresAnalysis from "./markets/away-team-scores";
// import goalsInMatchAnalysis from "./markets/goals-in-match";

// --- API ---

async function fetchFixtureMatches({
	league,
	requestConfig,
	leagueStandings,
}: {
	league: T_League;
	requestConfig: T_RequestConfig;
	leagueStandings: T_LeagueStandings;
}): Promise<T_FixtureMatch[]> {
	let rawResponse;

	if (requestConfig.fetchFromAPI.FIXTURE_MATCHES) {
		rawResponse = (
			await APIClient.get("/fixtures", {
				timezone: "America/Bogota",
				league: league.id,
				season: league.season,
				date: requestConfig.date,
			})
		).data as T_RawMatchesResponse;

		writeFile(
			`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, "full")}/${requestConfig.date}.json`,
			rawResponse,
		);
	} else if (
		fileExists(
			`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, "full")}/${requestConfig.date}.json`,
		)
	) {
		rawResponse = JSON.parse(
			readFile(
				`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, "full")}/${requestConfig.date}.json`,
			),
		);
	} else {
		rawResponse = { response: [] };
	}

	const parsedResponse = parseFixtureMatchesResponse(rawResponse, leagueStandings, league);

	return parsedResponse;
}

async function fetchPlayedMatches({
	team,
	league,
	requestConfig,
	leagueStandings,
}: {
	team: T_Team;
	league: T_League;
	requestConfig: T_RequestConfig;
	leagueStandings: T_LeagueStandings;
}): Promise<T_PlayedMatch[]> {
	let rawResponse;

	if (requestConfig.fetchFromAPI.PLAYED_MATCHES) {
		rawResponse = (
			await APIClient.get("/fixtures", {
				timezone: "America/Bogota",
				team: team.id,
				season: league.season,
			})
		).data as T_RawMatchesResponse;

		writeFile(
			`src/scripts/predictions/data/raw/teams/${composeLeagueName(league.id)}/${composeTeamName(
				team,
			)}.json`,
			rawResponse,
		);
	} else if (
		fileExists(
			`src/scripts/predictions/data/raw/teams/${composeLeagueName(league.id)}/${composeTeamName(
				team,
			)}.json`,
		)
	) {
		rawResponse = JSON.parse(
			readFile(
				`src/scripts/predictions/data/raw/teams/${composeLeagueName(league.id)}/${composeTeamName(
					team,
				)}.json`,
			),
		);
	} else {
		rawResponse = { response: [] };
	}

	const parsedResponse = parsePlayedMatchesResponse(
		rawResponse,
		requestConfig.date,
		leagueStandings,
		league,
	).filter((match) => match.played);

	if (parsedResponse.length > 0) {
		writeFile(
			`src/scripts/predictions/data/output/teams/${composeLeagueName(
				league.id,
			)}/${composeTeamName(team)}.json`,
			parsedResponse,
		);
	}

	return parsedResponse;
}

async function fetchLeagueStandings(
	league: T_League,
	requestConfig: T_RequestConfig,
): Promise<T_LeagueStandings> {
	let rawResponse;

	if (requestConfig.fetchFromAPI.LEAGUE_STANDINGS) {
		rawResponse = (
			await APIClient.get("/standings", {
				league: league.id,
				season: league.season,
			})
		).data as T_RawLeagueStandingsResponse;

		writeFile(
			`src/scripts/predictions/data/raw/standings/${composeLeagueName(league.id, "full")}.json`,
			rawResponse,
		);
	} else if (
		fileExists(
			`src/scripts/predictions/data/raw/standings/${composeLeagueName(league.id, "full")}.json`,
		)
	) {
		rawResponse = JSON.parse(
			readFile(
				`src/scripts/predictions/data/raw/standings/${composeLeagueName(league.id, "full")}.json`,
			),
		);
	} else {
		rawResponse = { response: [] };
	}

	const parsedResponse = parseStandingsResponse(rawResponse);

	writeFile(
		`src/scripts/predictions/data/output/standings/${composeLeagueName(league.id, "full")}.json`,
		parsedResponse,
	);

	return parsedResponse;
}

async function updateTeamsFile(
	matches: Awaited<PromiseLike<ReturnType<typeof fetchFixtureMatches>>>,
) {
	const currentTeams = JSON.parse(readFile("src/scripts/predictions/data/util/teams.json"));
	const outputTeams = {
		...currentTeams,
		...Object.values(matches).reduce(
			(result, match) => {
				return {
					...result,
					[match.teams.home.id]: {
						name: match.teams.home.name,
						country: currentTeams[match.teams.home.id]?.country || match.teams.home.country,
						featured: currentTeams[match.teams.home.id]?.featured || false,
					},
					[match.teams.away.id]: {
						name: match.teams.away.name,
						country: currentTeams[match.teams.away.id]?.country || match.teams.away.country,
						featured: currentTeams[match.teams.away.id]?.featured || false,
					},
				};
			},
			{} as Pick<T_Team, "name" | "country" | "featured">,
		),
	};

	writeFile("src/scripts/predictions/data/util/teams.json", await formatCode(outputTeams, "json"));
}

async function updateLeaguesFixtures(requestConfig: { from: string; to: string }) {
	const output = {} as DR.Object<number[]>;
	const leagues = Object.values(LEAGUES.items).sort(sortBy("priority", "name"));

	await asyncLoop(leagues, async (league) => {
		try {
			if (!league.enabled) return;

			console.log(`  Fetching "${league.name} (${league.id}|${league.country})" matches...`);
			let leagueMatches;

			if (
				fileExists(
					`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, "full")}/${requestConfig.from}--${requestConfig.to}.json`,
				)
			) {
				leagueMatches = JSON.parse(
					readFile(
						`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, "full")}/${requestConfig.from}--${requestConfig.to}.json`,
					),
				) as T_RawMatchesResponse;
			} else {
				leagueMatches = (
					await APIClient.get("/fixtures", {
						timezone: "America/Bogota",
						league: league.id,
						season: league.season,
						...requestConfig,
					})
				).data as T_RawMatchesResponse;
			}

			writeFile(
				`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, "full")}/${requestConfig.from}--${requestConfig.to}.json`,
				leagueMatches,
			);

			leagueMatches.response.forEach((match) => {
				const [date] = match.fixture.date.split("T");

				if (!output[date]) {
					output[date] = [];
				}

				output[date].push(league.id);
			});

			await delay(1000);
		} catch (error) {
			console.log(getErrorMessage(error));
		}
	});

	writeFile(
		"src/scripts/predictions/data/util/leagues.json",
		await formatCode(
			{
				...LEAGUES,
				fixtures: Object.entries(output).reduce(
					(result, [key, value]) => {
						return { ...result, [key]: removeDuplicates(value) };
					},
					{ ...LEAGUES.fixtures },
				),
			},
			"json",
		),
	);
}

/*
function getMatchPredictions({
	match,
	homeTeam,
	awayTeam,
	homeTeamPlayedMatches,
	homeTeamStats,
	awayTeamStats,
	leagueStandings,
}: {
	match: T_FixtureMatch;
	homeTeam: T_Team;
	awayTeam: T_Team;
	homeTeamPlayedMatches: T_PlayedMatch[];
	homeTeamStats: T_TeamStats;
	awayTeamStats: T_TeamStats;
	leagueStandings: T_LeagueStandings;
}): T_Prediction[] {
	return [
		doubleOpportunityAnalysis({
			match,
			homeTeam,
			awayTeam,
			homeTeamStats,
			awayTeamStats,
			leagueStandings,
			homeTeamPlayedMatches,
		}),
		// homeTeamScoresAnalysis({
		// 	match,
		// 	homeTeam,
		// 	awayTeam,
		// 	homeTeamStats,
		// 	awayTeamStats,
		// 	leagueStandings,
		// 	homeTeamPlayedMatches,
		// }),
		// awayTeamScoresAnalysis({
		// 	match,
		// 	homeTeam,
		// 	awayTeam,
		// 	homeTeamStats,
		// 	awayTeamStats,
		// 	leagueStandings,
		// 	homeTeamPlayedMatches,
		// }),
		// goalsInMatchAnalysis({
		// 	match,
		// 	homeTeam,
		// 	awayTeam,
		// 	homeTeamStats,
		// 	awayTeamStats,
		// 	leagueStandings,
		// 	homeTeamPlayedMatches,
		// }),
	];
}
*/

function getTeamStats(teamId: number, playedMatches: T_PlayedMatch[]): T_TeamStats {
	const totalPlayedMatches = playedMatches.length;
	const lastGames = 4;

	const result = [
		{
			name: `Comportamiento general en los últimos ${totalPlayedMatches} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "all" }),
		},
		{
			name: `Comportamiento como local en los últimos ${totalPlayedMatches} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "home" }),
		},
		{
			name: `Comportamiento como visitante en los últimos ${totalPlayedMatches} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "away" }),
		},
		{
			name: `Comportamiento general en los últimos ${lastGames} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "all", lastGames }),
		},
		{
			name: `Comportamiento como local en los últimos ${lastGames} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "home", lastGames }),
		},
		{
			name: `Comportamiento como visitante en los últimos ${lastGames} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "away", lastGames }),
		},
	];

	return result as T_TeamStats;
}

function getLeagueById(leagueId: number | string) {
	return (
		(LEAGUES.items[leagueId as keyof typeof LEAGUES.items] as T_League) ||
		throwError(`League not found with id "${leagueId}"`)
	);
}

function getLeaguesByDate(date: string) {
	return (
		LEAGUES.fixtures[date as keyof typeof LEAGUES.fixtures] ||
		throwError(`No fixture for "${date}"`)
	);
}

const DataClient = {
	fetchFixtureMatches,
	fetchPlayedMatches,
	fetchLeagueStandings,
	updateTeamsFile,
	updateLeaguesFixtures,
	// getMatchPredictions,
	getTeamStats,
	getLeagueById,
	getLeaguesByDate,
};

export default DataClient;

// --- UTILS ---

function parseFixtureMatchesResponse(
	data: T_RawMatchesResponse,
	leagueStandings: T_LeagueStandings,
	league: T_League,
) {
	const result = data.response
		.map((item) => parseMatchItem("FIXTURE_MATCH", item, leagueStandings, league))
		.sort(sortBy("date"));

	return result;
}

function parsePlayedMatchesResponse(
	data: T_RawMatchesResponse,
	date: string,
	leagueStandings: T_LeagueStandings,
	league: T_League,
): T_PlayedMatch[] {
	const result = data.response
		.map((item) => parseMatchItem("PLAYED_MATCH", item, leagueStandings, league))
		.sort(sortBy("-date"))
		.filter((match) => {
			return match.fullDate <= date;
		});

	return result.slice(0, 15);
}

function parseMatchItem(
	variant: "PLAYED_MATCH",
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
	league: T_League,
): T_PlayedMatch;
function parseMatchItem(
	variant: "FIXTURE_MATCH",
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
	league: T_League,
): T_FixtureMatch;
function parseMatchItem(
	variant: "FIXTURE_MATCH" | "PLAYED_MATCH",
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
	league: T_League,
) {
	const fullDate = item.fixture.date.substring(0, 16);
	const [date, hour] = fullDate.split("T");
	const isPlayedMatch = v.isNumber(item.goals.home) && v.isNumber(item.goals.away);
	const matchBaseData = {
		id: generateSlug(`${date}-${item.teams.home.name}-${item.teams.away.name}`),
		fullDate,
		date,
		hour,
		teams: {
			home: {
				id: item.teams.home.id,
				name: item.teams.home.name,
				country:
					getTeamById(item.teams.home.id)?.country ||
					(league.country === "World" ? "" : league.flag),
				position: getTeamPosition(item.teams.home.id, leagueStandings),
				featured: checkIsTeamFeatured(
					{ id: item.teams.home.id, name: item.teams.home.name },
					leagueStandings,
				),
			},
			away: {
				id: item.teams.away.id,
				name: item.teams.away.name,
				country:
					getTeamById(item.teams.away.id)?.country ||
					(league.country === "World" ? "" : league.flag),
				position: getTeamPosition(item.teams.away.id, leagueStandings),
				featured: checkIsTeamFeatured(
					{ id: item.teams.away.id, name: item.teams.away.name },
					leagueStandings,
				),
			},
		},
	};

	// TODO: Try to remove the next as cast. Some properties are required in the type definition and I don't set them in the next object, even so, TypeScript does not launch an error and I expect it

	if (variant === "PLAYED_MATCH") {
		return {
			...matchBaseData,
			played: true,
			teams: {
				home: {
					...matchBaseData.teams.home,
					score: item.goals.home || 0,
					winner: item.teams.home.winner,
				},
				away: {
					...matchBaseData.teams.away,
					score: item.goals.away || 0,
					winner: item.teams.away.winner,
				},
			},
			league: {
				id: item.league.id,
				name: item.league.name,
			},
		} as T_PlayedMatch;
	}

	if (isPlayedMatch) {
		return {
			...matchBaseData,
			played: true,
			teams: {
				home: {
					...matchBaseData.teams.home,
					score: item.goals.home || 0,
					winner: item.teams.home.winner,
					stats: [],
					matches: [],
				},
				away: {
					...matchBaseData.teams.away,
					score: item.goals.away || 0,
					winner: item.teams.away.winner,
					stats: [],
					matches: [],
				},
			},
		} as T_FixturePlayedMatch;
	}

	return {
		...matchBaseData,
		played: false,
		teams: {
			home: {
				...matchBaseData.teams.home,
				stats: [],
				matches: [],
			},
			away: {
				...matchBaseData.teams.away,
				stats: [],
				matches: [],
			},
		},
	} as T_FixtureNextMatch;
}

function parseStandingsResponse(data: T_RawLeagueStandingsResponse) {
	const result =
		data.response.length > 0
			? getProperlyLeagueStandingsData(data.response[0].league).map((item) => {
					return item.map((subitem) => {
						return {
							teamId: subitem.team.id,
							teamName: subitem.team.name,
							points: subitem.points,
							stats: {
								goalsDiff: subitem.goalsDiff,
								played: subitem.all.played,
								win: subitem.all.win,
								draw: subitem.all.draw,
								lose: subitem.all.lose,
								goals: {
									for: subitem.all.goals.for,
									against: subitem.all.goals.against,
								},
							},
						};
					});
				})
			: [];

	return result;
}

function getProperlyLeagueStandingsData(
	response: T_RawLeagueStandingsResponse["response"][number]["league"],
) {
	const isColombianLeague = response.id === 239;
	const isMexicanLeague = response.id === 262;

	if (isColombianLeague) {
		return response.standings.slice(0, 1);
	}

	if (isMexicanLeague) {
		return response.standings.reverse().slice(0, 1);
	}

	return response.standings;
}

function composeTeamName(team: T_Team) {
	return `${team.name} (${team.id})`;
}

function composeLeagueName(leagueId: number, option?: "full") {
	const league = getLeagueById(leagueId);

	if (!league) {
		throw new Error(`League "${leagueId}" not found`);
	}

	if (option === "full") {
		return `${league.country}/${league.name} (${league.id})`;
	}

	return `${league.country}`;
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

function filterTeamPlayedMatches({
	teamId,
	playedMatches,
	side,
	lastGames,
}: {
	teamId: T_Team["id"];
	playedMatches: T_PlayedMatch[];
	side: "home" | "away" | "all";
	lastGames: number | undefined;
}) {
	let result = lastGames ? playedMatches.slice(0, lastGames) : playedMatches;

	if (side === "home") {
		result = result.filter((match) => {
			return match.teams.home.id === teamId;
		});
	} else if (side === "away") {
		result = result.filter((match) => {
			return match.teams.away.id === teamId;
		});
	}

	return result;
}

function calculateTeamStats({
	teamId,
	playedMatches,
	side,
	lastGames,
}: {
	teamId: T_Team["id"];
	playedMatches: T_PlayedMatch[];
	side: "home" | "away" | "all";
	lastGames?: number;
}) {
	let result;

	if (side === "all") {
		const filteredMatches = filterTeamPlayedMatches({
			teamId,
			playedMatches,
			side,
			lastGames,
		});

		result = filteredMatches.reduce(
			(result, match) => {
				const newResult = {
					...result,
				};

				if (match.teams.home.id === teamId) {
					newResult.total_de_goles_anotados += match.teams.home.score;
					newResult.total_de_goles_recibidos += match.teams.away.score;
				} else {
					newResult.total_de_goles_anotados += match.teams.away.score;
					newResult.total_de_goles_recibidos += match.teams.home.score;
				}

				return newResult;
			},
			{
				total_de_partidos: filteredMatches.length,
				total_de_goles_anotados: 0,
				total_de_goles_recibidos: 0,
				promedio_de_goles_anotados: 0,
				promedio_de_goles_recibidos: 0,
			},
		);

		result.promedio_de_goles_anotados = Number(
			(result.total_de_goles_anotados / result.total_de_partidos).toFixed(1),
		);
		result.promedio_de_goles_recibidos = Number(
			(result.total_de_goles_recibidos / result.total_de_partidos).toFixed(1),
		);
	} else {
		const sideLabel = side === "away" ? "visitante" : "local";
		const filteredMatches = filterTeamPlayedMatches({
			teamId,
			playedMatches,
			side,
			lastGames,
		});

		result = filteredMatches.reduce(
			(result, match) => {
				const newResult = {
					...result,
				};

				if (match.teams[side].id === teamId) {
					newResult[`goles_anotados_de_${sideLabel}`] += match.teams[side].score;

					if (match.teams[side].score > 0) {
						newResult[`partidos_con_goles_de_${sideLabel}`] += 1;
					}
				}

				if (match.teams[side].winner === true) {
					newResult[`partidos_ganados_de_${sideLabel}`] += 1;
				} else if (match.teams[side].winner === false) {
					newResult[`partidos_perdidos_de_${sideLabel}`] += 1;
				} else if (match.teams[side].winner === null) {
					newResult[`partidos_empatados_de_${sideLabel}`] += 1;
				}

				return newResult;
			},
			{
				[`partidos_de_${sideLabel}`]: filteredMatches.length,
				[`goles_anotados_de_${sideLabel}`]: 0,
				[`promedio_de_goles_anotados_de_${sideLabel}`]: 0,
				[`partidos_ganados_de_${sideLabel}`]: 0,
				[`partidos_perdidos_de_${sideLabel}`]: 0,
				[`partidos_empatados_de_${sideLabel}`]: 0,
				[`partidos_con_goles_de_${sideLabel}`]: 0,
			},
		);

		result[`promedio_de_goles_anotados_de_${sideLabel}`] = Number(
			(result[`goles_anotados_de_${sideLabel}`] / result[`partidos_de_${sideLabel}`]).toFixed(1),
		);
		result[`porcentaje_de_puntos_ganados_de_${sideLabel}`] = Number(
			(
				((result[`partidos_ganados_de_${sideLabel}`] * 3 +
					result[`partidos_empatados_de_${sideLabel}`]) *
					100) /
				(result[`partidos_de_${sideLabel}`] * 3)
			).toFixed(1),
		);
	}

	return Object.entries(result).reduce((result, [key, value]) => {
		return {
			...result,
			[`${key}`]: key.includes("porcentaje") ? `${value}%` : value,
		};
	}, {});
}
