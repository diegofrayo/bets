import { sortBy } from "../../../@diegofrayo/sort";
import type DR from "../../../@diegofrayo/types";
import { omit, removeDuplicates } from "../../../@diegofrayo/utils/arrays-and-objects";
import { fileExists, readFile, writeFile } from "../../../@diegofrayo/utils/files";
import { asyncLoop, getErrorMessage, throwError } from "../../../@diegofrayo/utils/misc";
import { generateSlug } from "../../../@diegofrayo/utils/strings";
import v from "../../../@diegofrayo/v";

import LEAGUES from "../data/util/leagues.json";
import TEAMS from "../data/util/teams.json";
import APIClient from "./api-client";
import type {
	T_FixtureMatch,
	T_FixtureMatchTeam,
	T_FixtureNextMatch,
	T_FixturePlayedMatch,
	T_League,
	T_LeagueStandings,
	T_NextMatchMarketPrediction,
	T_PlayedMatch,
	T_PlayedMatchMarketPrediction,
	T_PlayedMatchTeam,
	T_RawLeagueStandingsResponse,
	T_RawMatchesResponse,
	T_RequestConfig,
	T_TeamStats,
	T_TeamStatsItems,
} from "./types";
import { formatCode, formatDate } from "./utils";
// import doubleOpportunityPrediction from "./markets/double-opportunity";
import goalByHomeTeamPrediction from "./markets/goal-by-home-team";
import type { T_PredictionsInput } from "./markets/utils";

// --- API ---

async function fetchFixtureMatches({
	league,
	requestConfig,
	leagueStandings,
}: {
	league: T_League;
	requestConfig: T_RequestConfig;
	leagueStandings: T_LeagueStandings;
}): Promise<Array<T_FixtureMatch>> {
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
			`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, { full: true })}/${requestConfig.date}.json`,
			rawResponse,
		);
	} else if (
		fileExists(
			`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, { full: true })}/${requestConfig.date}.json`,
		)
	) {
		rawResponse = JSON.parse(
			readFile(
				`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, { full: true })}/${requestConfig.date}.json`,
			),
		);
	} else {
		rawResponse = { response: [] };
	}

	const parsedResponse = parseFixtureMatchesResponse(rawResponse, leagueStandings);

	return parsedResponse;
}

async function fetchPlayedMatches({
	team,
	league,
	requestConfig,
	leagueStandings,
}: {
	team: Pick<T_PlayedMatchTeam, "id" | "name">;
	league: T_League;
	requestConfig: T_RequestConfig;
	leagueStandings: T_LeagueStandings;
}): Promise<Array<T_PlayedMatch>> {
	const outputFileName = `${composeLeagueName(league.id)}/${generateSlug(composeTeamName(team))}`;
	let rawResponse;

	if (requestConfig.fetchFromAPI.PLAYED_MATCHES) {
		rawResponse = (
			await APIClient.get("/fixtures", {
				timezone: "America/Bogota",
				team: team.id,
				season: league.season,
			})
		).data as T_RawMatchesResponse;

		writeFile(`src/scripts/predictions/data/raw/teams/${outputFileName}.json`, rawResponse);
	} else if (fileExists(`src/scripts/predictions/data/raw/teams/${outputFileName}.json`)) {
		rawResponse = JSON.parse(
			readFile(`src/scripts/predictions/data/raw/teams/${outputFileName}.json`),
		);
	} else {
		rawResponse = { response: [] };
	}

	const parsedResponse = parsePlayedMatchesResponse(
		rawResponse,
		requestConfig.date,
		leagueStandings,
		league,
	);

	if (parsedResponse.length > 0) {
		writeFile(`src/scripts/predictions/data/output/teams/${outputFileName}.json`, parsedResponse);
	}

	return parsedResponse;
}

async function fetchLeagueStandings({
	league,
	fetchFromAPI,
	date,
}: {
	league: Pick<T_League, "id" | "season">;
	fetchFromAPI: boolean;
	date: string;
}): Promise<T_LeagueStandings> {
	const outputFileName = `${date}-${composeLeagueName(league.id, { full: true, date })}`;
	let rawResponse;

	if (fetchFromAPI) {
		rawResponse = (
			await APIClient.get("/standings", {
				league: league.id,
				season: league.season,
			})
		).data as T_RawLeagueStandingsResponse;

		writeFile(`src/scripts/predictions/data/raw/standings/${outputFileName}.json`, rawResponse);
	} else if (fileExists(`src/scripts/predictions/data/raw/standings/${outputFileName}.json`)) {
		rawResponse = JSON.parse(
			readFile(`src/scripts/predictions/data/raw/standings/${outputFileName}.json`),
		);
	} else {
		rawResponse = { response: [] };
	}

	const parsedResponse = parseStandingsResponse(rawResponse);

	if (parsedResponse.length > 0) {
		writeFile(
			`src/scripts/predictions/data/output/standings/${outputFileName}.json`,
			parsedResponse,
		);
	}

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
			{} as Pick<T_FixtureMatchTeam, "name" | "country" | "featured">,
		),
	};

	writeFile("src/scripts/predictions/data/util/teams.json", await formatCode(outputTeams, "json"));
}

async function updateLeaguesFixtures(requestConfig: {
	from: string;
	to: string;
	ids: Array<number>;
}) {
	const output = {} as DR.Object<number[]>;
	const leagues = LEAGUES.items.sort(sortBy("-enabled", "priority", "name"));

	await asyncLoop(leagues, async (league) => {
		try {
			if (
				!league.enabled ||
				(requestConfig.ids.length > 0 && requestConfig.ids.indexOf(league.id) === -1)
			) {
				return;
			}

			console.log(`  Fetching "${league.name} (${league.id}|${league.country})" matches...`);
			let leagueMatches;

			if (
				fileExists(
					`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, { full: true })}/${requestConfig.from}--${requestConfig.to}.json`,
				)
			) {
				leagueMatches = JSON.parse(
					readFile(
						`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, { full: true })}/${requestConfig.from}--${requestConfig.to}.json`,
					),
				) as T_RawMatchesResponse;
			} else {
				leagueMatches = (
					await APIClient.get("/fixtures", {
						timezone: "America/Bogota",
						league: league.id,
						season: league.season,
						...omit(requestConfig, ["ids"]),
					})
				).data as T_RawMatchesResponse;
			}

			writeFile(
				`src/scripts/predictions/data/raw/fixtures/${composeLeagueName(league.id, { full: true })}/${requestConfig.from}--${requestConfig.to}.json`,
				leagueMatches,
			);

			leagueMatches.response.forEach((match) => {
				const [date] = match.fixture.date.split("T");

				if (!output[date]) {
					output[date] = [];
				}

				output[date].push(league.id);
			});
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

async function updateLeaguesStandings(leagues: Array<Pick<T_League, "id" | "season">>) {
	await asyncLoop(leagues, async (league) => {
		try {
			console.log(`  Fetching "${league.id})" standings...`);
			await fetchLeagueStandings({
				league: { id: league.id, season: league.season },
				fetchFromAPI: true,
				date: formatDate(new Date()),
			});
		} catch (error) {
			console.log(getErrorMessage(error));
		}
	});
}

function getMatchPredictions(
	predictionsInput: T_PredictionsInput,
	variant: "FIXTURE_NEXT_MATCH",
): Array<T_NextMatchMarketPrediction>;
function getMatchPredictions(
	predictionsInput: T_PredictionsInput,
	variant: "FIXTURE_PLAYED_MATCH",
): Array<T_PlayedMatchMarketPrediction>;
function getMatchPredictions(
	predictionsInput: T_PredictionsInput,
): Array<T_NextMatchMarketPrediction> | Array<T_PlayedMatchMarketPrediction> {
	return [goalByHomeTeamPrediction(predictionsInput)].sort(sortBy("trustLevel"));
}

function getTeamStats(teamId: number, playedMatches: Array<T_PlayedMatch>): T_TeamStats {
	const totalPlayedMatches = playedMatches.length;
	const lastGames = totalPlayedMatches > 4 ? 4 : totalPlayedMatches;
	const output = {
		"all-matches": {
			name: `Comportamiento general en los últimos ${totalPlayedMatches} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "all" }),
		},
		"all-home-matches": {
			name: `Comportamiento como local en los últimos ${totalPlayedMatches} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "home" }),
		},
		"all-away-matches": {
			name: `Comportamiento como visitante en los últimos ${totalPlayedMatches} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "away" }),
		},
		"last-matches": {
			name: `Comportamiento general en los últimos ${lastGames} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "all", lastGames }),
		},
		"last-home-matches": {
			name: `Comportamiento como local en los últimos ${lastGames} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "home", lastGames }),
		},
		"last-away-matches": {
			name: `Comportamiento como visitante en los últimos ${lastGames} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "away", lastGames }),
		},
	};

	return output;
}

function getLeagueById(leagueId: number | string) {
	const league = LEAGUES.items.find((item) => {
		return item.id === leagueId;
	});

	return league || throwError(`League not found with id "${leagueId}"`);
}

function getLeaguesByDate(date: string) {
	return (
		(LEAGUES.fixtures as DR.Object<Array<number>>)[date as keyof typeof LEAGUES.fixtures] ||
		throwError(`No fixture for "${date}"`)
	);
}

const DataClient = {
	fetchFixtureMatches,
	fetchPlayedMatches,
	fetchLeagueStandings,
	updateTeamsFile,
	updateLeaguesFixtures,
	updateLeaguesStandings,
	getMatchPredictions,
	getTeamStats,
	getLeagueById,
	getLeaguesByDate,
};

export default DataClient;

// --- UTILS ---

function parseFixtureMatchesResponse(
	data: T_RawMatchesResponse,
	leagueStandings: T_LeagueStandings,
) {
	const result = data.response
		.map((item) => parseMatchItem("FIXTURE_MATCH", item, leagueStandings))
		.sort(sortBy("date"));

	return result;
}

function parsePlayedMatchesResponse(
	data: T_RawMatchesResponse,
	date: string,
	leagueStandings: T_LeagueStandings,
	league: T_League,
): Array<T_PlayedMatch> {
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
): T_FixtureMatch;
function parseMatchItem(
	variant: "FIXTURE_MATCH" | "PLAYED_MATCH",
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
) {
	const fullDate = item.fixture.date.substring(0, 16);
	const [date, hour] = fullDate.split("T");
	const isPlayedMatch = v.isNumber(item.goals.home) && v.isNumber(item.goals.away);
	const matchBaseData = {
		id: `${item.fixture.id}`,
		fullDate,
		date,
		hour,
		teams: {
			home: {
				id: item.teams.home.id,
				name: item.teams.home.name,
				country: getTeamById(item.teams.home.id)?.country || "",
				position: getTeamPosition(item.teams.home.id, leagueStandings),
				featured: checkIsTeamFeatured(
					{ id: item.teams.home.id, name: item.teams.home.name },
					leagueStandings,
				),
			},
			away: {
				id: item.teams.away.id,
				name: item.teams.away.name,
				country: getTeamById(item.teams.away.id)?.country || "",
				position: getTeamPosition(item.teams.away.id, leagueStandings),
				featured: checkIsTeamFeatured(
					{ id: item.teams.away.id, name: item.teams.away.name },
					leagueStandings,
				),
			},
		},
	};

	if (variant === "PLAYED_MATCH") {
		const output: T_PlayedMatch = {
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
		};

		return output;
	}

	if (isPlayedMatch) {
		const output: T_FixturePlayedMatch = {
			...matchBaseData,
			played: true,
			teams: {
				home: {
					...matchBaseData.teams.home,
					score: item.goals.home || 0,
					winner: item.teams.home.winner,
					stats: createEmptyTeamStatsObject(),
					matches: [],
				},
				away: {
					...matchBaseData.teams.away,
					score: item.goals.away || 0,
					winner: item.teams.away.winner,
					stats: createEmptyTeamStatsObject(),
					matches: [],
				},
			},
			predictions: [],
		};

		return output;
	}

	const output: T_FixtureNextMatch = {
		...matchBaseData,
		played: false,
		teams: {
			home: {
				...matchBaseData.teams.home,
				stats: createEmptyTeamStatsObject(),
				matches: [],
			},
			away: {
				...matchBaseData.teams.away,
				stats: createEmptyTeamStatsObject(),
				matches: [],
			},
		},
		predictions: [],
	};

	return output;
}

function createEmptyTeamStatsObject(): T_TeamStats {
	const KEYS = [
		"all-matches",
		"all-home-matches",
		"all-away-matches",
		"last-matches",
		"last-home-matches",
		"last-away-matches",
	];

	const VALUE = {
		name: "name",
		items: {
			total_de_partidos: 0,
			total_de_goles_anotados: 0,
			total_de_goles_recibidos: 0,
			promedio_de_goles_anotados: 0,
			promedio_de_goles_recibidos: 0,
			partidos_ganados: 0,
			partidos_perdidos: 0,
			partidos_empatados: 0,
			partidos_con_goles_anotados: 0,
			porcentaje_de_puntos_ganados: 0,
		},
	};

	return KEYS.reduce((result, key) => {
		return {
			...result,
			[key]: VALUE,
		};
	}, {} as T_TeamStats);
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
	const isColombiaLeague = response.id === 239;
	const isBrazilLeague = response.id === 71;
	const isArgentinaLeague = response.id === 128;
	const isNorwayLeague = response.id === 103;
	const isFinlandLeague = response.id === 244;
	const isBelgiumLeague = response.id === 144;

	if (isColombiaLeague) {
		return response.standings.filter((standings) => {
			return (
				standings.find((team) => {
					return team.group === "Primera A: Clausura";
				}) !== undefined
			);
		});
	}

	if (isBrazilLeague || isArgentinaLeague || isNorwayLeague || isFinlandLeague || isBelgiumLeague) {
		return response.standings;
	}

	return [];
}

function composeTeamName(team: Pick<T_FixtureMatchTeam, "id" | "name">) {
	return `${team.name} (${team.id})`;
}

function composeLeagueName(leagueId: number, options?: { full: true; date?: string }) {
	const league = getLeagueById(leagueId);

	if (!league) {
		throw new Error(`League "${leagueId}" not found`);
	}

	if (options?.full) {
		return `${league.country}/${options.date ? `${options.date}-` : ""}${league.name} (${league.id})`;
	}

	return league.country;
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

function filterTeamPlayedMatches({
	teamId,
	playedMatches,
	side,
	lastGames,
}: {
	teamId: T_FixtureMatchTeam["id"];
	playedMatches: Array<T_PlayedMatch>;
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
	teamId: T_FixtureMatchTeam["id"];
	playedMatches: Array<T_PlayedMatch>;
	side: "home" | "away" | "all";
	lastGames?: number;
}): T_TeamStatsItems {
	if (side === "all") {
		const filteredMatches = filterTeamPlayedMatches({
			teamId,
			playedMatches,
			side,
			lastGames,
		});
		const result = filteredMatches.reduce(
			(result, match) => {
				const newResult = {
					...result,
				};
				let matchSide: "home" | "away";

				if (match.teams.home.id === teamId) {
					matchSide = "home";

					if (match.teams.home.score > 0) {
						newResult.partidos_con_goles_anotados += 1;
						newResult.total_de_goles_anotados += match.teams.home.score;
					}

					if (match.teams.away.score > 0) {
						newResult.partidos_con_goles_recibidos += 1;
						newResult.total_de_goles_recibidos += match.teams.away.score;
					}
				} else {
					matchSide = "away";

					if (match.teams.away.score > 0) {
						newResult.total_de_goles_anotados += match.teams.away.score;
						newResult.partidos_con_goles_anotados += 1;
					}

					if (match.teams.home.score > 0) {
						newResult.total_de_goles_recibidos += match.teams.home.score;
						newResult.partidos_con_goles_recibidos += 1;
					}
				}

				if (match.teams[matchSide].winner === true) {
					newResult.partidos_ganados += 1;
				} else if (match.teams[matchSide].winner === false) {
					newResult.partidos_perdidos += 1;
				} else if (match.teams[matchSide].winner === null) {
					newResult.partidos_empatados += 1;
				}

				return newResult;
			},
			{
				total_de_partidos: filteredMatches.length,
				total_de_goles_anotados: 0,
				total_de_goles_recibidos: 0,
				promedio_de_goles_anotados: 0,
				promedio_de_goles_recibidos: 0,
				partidos_ganados: 0,
				partidos_empatados: 0,
				partidos_perdidos: 0,
				partidos_con_goles_anotados: 0,
				partidos_con_goles_recibidos: 0,
				porcentaje_de_puntos_ganados: 0,
			},
		);

		result.promedio_de_goles_anotados = Number(
			(result.total_de_goles_anotados / result.total_de_partidos).toFixed(1),
		);
		result.promedio_de_goles_recibidos = Number(
			(result.total_de_goles_recibidos / result.total_de_partidos).toFixed(1),
		);
		result.porcentaje_de_puntos_ganados = Number(
			(
				((result.partidos_ganados * 3 + result.partidos_empatados) * 100) /
				(result.total_de_partidos * 3)
			).toFixed(1),
		);

		return result;
	}

	const teamOpponentSide = side === "away" ? "home" : "away";
	const filteredMatches = filterTeamPlayedMatches({
		teamId,
		playedMatches,
		side,
		lastGames,
	});
	const result: T_TeamStatsItems = filteredMatches.reduce(
		(result, match) => {
			const newResult = {
				...result,
			};

			if (match.teams[side].score > 0) {
				newResult.total_de_goles_anotados += match.teams[side].score;
				newResult.partidos_con_goles_anotados += 1;
			}

			if (match.teams[teamOpponentSide].score > 0) {
				newResult.total_de_goles_recibidos += match.teams[teamOpponentSide].score;
				newResult.partidos_con_goles_recibidos += 1;
			}

			if (match.teams[side].winner === true) {
				newResult.partidos_ganados += 1;
			} else if (match.teams[side].winner === false) {
				newResult.partidos_perdidos += 1;
			} else if (match.teams[side].winner === null) {
				newResult.partidos_empatados += 1;
			}

			return newResult;
		},
		{
			total_de_partidos: filteredMatches.length,
			total_de_goles_anotados: 0,
			total_de_goles_recibidos: 0,
			promedio_de_goles_anotados: 0,
			promedio_de_goles_recibidos: 0,
			partidos_ganados: 0,
			partidos_empatados: 0,
			partidos_perdidos: 0,
			partidos_con_goles_anotados: 0,
			partidos_con_goles_recibidos: 0,
			porcentaje_de_puntos_ganados: 0,
		},
	);

	result.promedio_de_goles_anotados = Number(
		(result.total_de_goles_anotados / result.total_de_partidos).toFixed(1),
	);
	result.promedio_de_goles_recibidos = Number(
		(result.total_de_goles_recibidos / result.total_de_partidos).toFixed(1),
	);
	result.porcentaje_de_puntos_ganados = Number(
		(
			((result.partidos_ganados * 3 + result.partidos_empatados) * 100) /
			(result.total_de_partidos * 3)
		).toFixed(1),
	);

	return result;
}

function checkIsTeamFeatured(
	team: { id: number; name: string },
	leagueStandings: T_LeagueStandings,
) {
	return (
		getTeamById(team.id)?.featured === true ||
		(getTeamPosition(team.id, leagueStandings) || 100) <= (leagueStandings.length === 1 ? 6 : 2)
	);
}

function getTeamById(teamId: number) {
	return TEAMS[String(teamId) as keyof typeof TEAMS];
}
