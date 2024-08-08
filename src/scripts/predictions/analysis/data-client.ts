import dayjs from "dayjs";
import { code, flag } from "country-emoji";

import { sortBy } from "../../../@diegofrayo/sort";
import type DR from "../../../@diegofrayo/types";
import {
	createArray,
	omit,
	removeDuplicates,
	sortObjectKeys,
} from "../../../@diegofrayo/utils/arrays-and-objects";
import { fileExists, readFile, writeFile } from "../../../@diegofrayo/utils/files";
import { asyncLoop, getErrorMessage, throwError } from "../../../@diegofrayo/utils/misc";
import { formatDecimalNumber } from "../../../@diegofrayo/utils/numbers";
import { generateSlug } from "../../../@diegofrayo/utils/strings";
import v from "../../../@diegofrayo/v";

import APIClient from "./api-client";
import type {
	T_FixtureMatch,
	T_FixtureMatchTeam,
	T_FixtureNextMatch,
	T_FixturePlayedMatch,
	T_League,
	T_LeaguesFile,
	T_LeagueStandings,
	T_MarketPrediction,
	T_NextMatchMarketPrediction,
	T_PlayedMatch,
	T_PlayedMatchMarketPrediction,
	T_PlayedMatchTeam,
	T_PredictionsStatsFile,
	T_RawLeagueStandingsResponse,
	T_RawMatchesResponse,
	T_RequestConfig,
	T_TeamsFile,
	T_TeamStats,
	T_TeamStatsItems,
} from "./types";
import { formatCode, formatDate } from "./utils";
import doubleOpportunityPrediction from "./markets/double-opportunity-for-home-team";
import goalByHomeTeamPrediction from "./markets/goal-by-home-team";
import matchWinnerPrediction from "./markets/match-winner-for-home-team";
import { getTeamPosition, type T_PredictionsInput } from "./markets/utils";

const LEAGUES = JSON.parse(
	readFile("src/scripts/predictions/data/util/leagues.json"),
) as T_LeaguesFile;
const TEAMS = JSON.parse(readFile("src/scripts/predictions/data/util/teams.json")) as T_TeamsFile;

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
				season: league.season.year,
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
				season: league.season.year,
				from: `${new Date().getFullYear()}-01-01`,
				to: formatDate(dayjs(new Date()).subtract(1, "days").toDate()),
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

	const parsedResponse = parsePlayedMatchesResponse({ data: rawResponse, leagueStandings, league });

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
	date: DR.Dates.DateString;
}): Promise<T_LeagueStandings> {
	const outputFileName = composeLeagueName(league.id, {
		full: true,
		date,
	});
	let rawResponse;

	if (fetchFromAPI) {
		rawResponse = (
			await APIClient.get("/standings", {
				league: league.id,
				season: league.season.year,
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

	if (parsedResponse.items.length > 0) {
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
					},
					[match.teams.away.id]: {
						name: match.teams.away.name,
						country: currentTeams[match.teams.away.id]?.country || match.teams.away.country,
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
	to?: string;
	ids: Array<number>;
}) {
	const output = {} as T_LeaguesFile["fixtures"];
	const leagues = LEAGUES.items.sort(sortBy("-enabled", "priority", "name"));

	await asyncLoop(leagues, async (league) => {
		try {
			if (
				!league.enabled ||
				(requestConfig.ids.length > 0 && requestConfig.ids.indexOf(league.id) === -1)
			) {
				return;
			}

			console.log(`  Fetching "${league.name} (${league.id}|${league.country.name})" matches...`);
			const fileName = `${composeLeagueName(league.id, { full: true })}/${requestConfig.to ? `${requestConfig.from}--${requestConfig.to}` : `${requestConfig.from}`}.json`;
			let leagueMatches;

			if (fileExists(`src/scripts/predictions/data/raw/fixtures/${fileName}`)) {
				leagueMatches = JSON.parse(
					readFile(`src/scripts/predictions/data/raw/fixtures/${fileName}`),
				) as T_RawMatchesResponse;
			} else {
				leagueMatches = (
					await APIClient.get("/fixtures", {
						timezone: "America/Bogota",
						league: league.id,
						season: league.season.year,
						...(requestConfig.to ? omit(requestConfig, ["ids"]) : { date: requestConfig.from }),
					})
				).data as T_RawMatchesResponse;
			}

			writeFile(`src/scripts/predictions/data/raw/fixtures/${fileName}`, leagueMatches);

			leagueMatches.response.forEach((match) => {
				const [date] = match.fixture.date.split("T");

				if (!output[date]) {
					output[date] = [];
				}

				output[date].push(generateSlug(`${league.id}-${league.name}-${league.country.name}`));
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
				fixtures: removeDuplicates([...Object.keys(output), ...Object.keys(LEAGUES.fixtures)])
					.sort()
					.reduce((result, key) => {
						return {
							...result,
							[key]: removeDuplicates([...(output[key] || []), ...(LEAGUES.fixtures[key] || [])]),
						};
					}, {}),
			},
			"json",
		),
	);
}

async function updateLeaguesStandings(leaguesIds: Array<string>, enableRemoteAPI: boolean) {
	const leagues =
		leaguesIds.length > 0
			? leaguesIds.map((leagueId) => {
					return getLeagueById(Number(leagueId.split("-")[0]));
				})
			: LEAGUES.items;

	await asyncLoop(leagues, async (league) => {
		try {
			if ("enabled" in league && !league.enabled) {
				return;
			}

			console.log(`  Fetching "(${league.name} ${league.id})" standings...`);

			const today = dayjs(new Date());
			const dates = (enableRemoteAPI ? [0] : createArray(10, 0)).map((day) =>
				formatDate(today.subtract(day, "days").toDate()),
			);

			await asyncLoop(dates, async (date) => {
				await fetchLeagueStandings({
					league: { id: league.id, season: league.season },
					fetchFromAPI: enableRemoteAPI,
					date,
				});
			});
		} catch (error) {
			console.log(getErrorMessage(error));
		}
	});
}

function getMatchPredictions(
	predictionsInput: T_PredictionsInput,
	variant: "FIXTURE_NEXT_MATCH",
	updatePredictionStats: boolean,
): Array<T_NextMatchMarketPrediction>;
function getMatchPredictions(
	predictionsInput: T_PredictionsInput,
	variant: "FIXTURE_PLAYED_MATCH",
	updatePredictionStats: boolean,
): Array<T_PlayedMatchMarketPrediction>;
function getMatchPredictions(
	predictionsInput: T_PredictionsInput,
	_: string,
	updatePredictionStats: boolean,
): Array<T_NextMatchMarketPrediction> | Array<T_PlayedMatchMarketPrediction> {
	const output = [
		doubleOpportunityPrediction(predictionsInput),
		goalByHomeTeamPrediction(predictionsInput),
		matchWinnerPrediction(predictionsInput),
	]
		.filter(v.isNotNil)
		.sort(sortBy("-trustLevel"));

	if (updatePredictionStats) {
		output.forEach((prediction) => {
			updatePredictionsStats(predictionsInput.match, prediction);
		});
	}

	return output;
}

function getTeamStats(teamId: number, playedMatches: Array<T_PlayedMatch>): T_TeamStats {
	const totalPlayedMatches = playedMatches.length;
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
			name: `Comportamiento general en los últimos ${5} partidos`,
			items: calculateTeamStats({ teamId, playedMatches, side: "all", lastMatches: 5 }),
		},
		"last-home-matches": {
			name: `Comportamiento en los últimos ${3} partidos como local`,
			items: calculateTeamStats({ teamId, playedMatches, side: "home", lastMatches: 2 }),
		},
		"last-away-matches": {
			name: `Comportamiento en los últimos ${3} partidos como visitante`,
			items: calculateTeamStats({ teamId, playedMatches, side: "away", lastMatches: 2 }),
		},
	};

	return output;
}

function getLeagueById(leagueId: number, config: { noThrowError: true }): T_League | undefined;
function getLeagueById(leagueId: number): T_League;
function getLeagueById(leagueId: number, config?: { noThrowError: boolean }) {
	const league = LEAGUES.items.find((item) => {
		return item.id === leagueId;
	});

	if (!league && config?.noThrowError !== true) {
		throw Error(`League not found with id "${leagueId}"`);
	}

	return league;
}

function getLeaguesByDate(date: DR.Dates.DateString) {
	return (
		LEAGUES.fixtures[date as keyof typeof LEAGUES.fixtures] ||
		throwError(`No fixture for "${date}"`)
	);
}

function createEmptyPredictionsStatsFile() {
	writeFile("src/scripts/predictions/data/util/predictions-stats.json", {});
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
	createEmptyPredictionsStatsFile,
};

export default DataClient;

// --- UTILS ---

function parseFixtureMatchesResponse(
	data: T_RawMatchesResponse,
	leagueStandings: T_LeagueStandings,
) {
	const result = data.response
		.map((item) =>
			parseMatchItem(
				item.fixture.status.long === "Match Finished"
					? "FIXTURE_PLAYED_MATCH"
					: "FIXTURE_NEXT_MATCH",
				item,
				leagueStandings,
			),
		)
		.sort(sortBy("date"));

	return result;
}

function parsePlayedMatchesResponse({
	data,
	leagueStandings,
	league,
}: {
	data: T_RawMatchesResponse;
	leagueStandings: T_LeagueStandings;
	league: T_League;
}): Array<T_PlayedMatch> {
	const today = formatDate(new Date());
	const result = data.response
		.map((item) => parseMatchItem("PLAYED_MATCH", item, leagueStandings, league))
		.sort(sortBy("-date"))
		.filter((match) => {
			return match.date >= league.season.startDate && match.date < today;
		});

	return result;
}

function parseMatchItem(
	variant: "PLAYED_MATCH",
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
	league: T_League,
): T_PlayedMatch;
function parseMatchItem(
	variant: "FIXTURE_NEXT_MATCH" | "FIXTURE_PLAYED_MATCH",
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
): T_FixtureMatch;
function parseMatchItem(
	variant: "PLAYED_MATCH" | "FIXTURE_NEXT_MATCH" | "FIXTURE_PLAYED_MATCH",
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
) {
	const fullDate = item.fixture.date.substring(0, 16);
	const [date, hour] = fullDate.split("T");
	const matchBaseData = {
		id: `${item.fixture.id}`,
		fullDate,
		date,
		hour,
		teams: {
			home: {
				id: item.teams.home.id,
				name: item.teams.home.name,
				country:
					getTeamById(item.teams.home.id)?.country ||
					(item.league.country !== "World"
						? getCountryDetails({ leagueId: item.league.id }) ||
							getCountryDetails({ countryName: item.league.country })
						: null),
				position: getTeamPosition(item.teams.home.id, leagueStandings),
				featured: checkIsTeamFeatured(item.teams.home.id, leagueStandings),
			},
			away: {
				id: item.teams.away.id,
				name: item.teams.away.name,
				country:
					getTeamById(item.teams.away.id)?.country ||
					(item.league.country !== "World"
						? getCountryDetails({ leagueId: item.league.id }) ||
							getCountryDetails({ countryName: item.league.country })
						: null),
				position: getTeamPosition(item.teams.away.id, leagueStandings),
				featured: checkIsTeamFeatured(item.teams.away.id, leagueStandings),
			},
		},
		league: getLeagueById(item.league.id, { noThrowError: true }) || {
			id: item.league.id,
			name: item.league.name,
			type: "Unknown",
			country:
				getCountryDetails({ leagueId: item.league.id }) ||
				(item.league.name === "World"
					? {
							name: "World",
							code: "World",
							flag: "🌎",
						}
					: getCountryDetails({ countryName: item.league.name }) || {
							name: "Unknown",
							code: "Unknown",
							flag: "❓",
						}),
		},
	};

	if (variant === "PLAYED_MATCH") {
		const matchResult = getMatchResult({
			// matchId: item.fixture.id,
			homeTeam: { score: item.goals.home },
			awayTeam: { score: item.goals.away },
		});
		const output: T_PlayedMatch = {
			...matchBaseData,
			type: "PLAYED_MATCH",
			played: true,
			teams: {
				home: {
					...matchBaseData.teams.home,
					...matchResult.homeTeam,
				},
				away: {
					...matchBaseData.teams.away,
					...matchResult.awayTeam,
				},
			},
		};

		return output;
	}

	if (variant === "FIXTURE_PLAYED_MATCH") {
		const matchResult = getMatchResult({
			// matchId: item.fixture.id,
			homeTeam: { score: item.goals.home },
			awayTeam: { score: item.goals.away },
		});
		const output: T_FixturePlayedMatch = {
			...matchBaseData,
			type: "FIXTURE_PLAYED_MATCH",
			played: true,
			teams: {
				home: {
					...matchBaseData.teams.home,
					...matchResult.homeTeam,
					stats: createEmptyTeamStatsObject(),
					matches: [],
				},
				away: {
					...matchBaseData.teams.away,
					...matchResult.awayTeam,
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
		type: "FIXTURE_NEXT_MATCH",
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

function parseStandingsResponse(data: T_RawLeagueStandingsResponse): T_LeagueStandings {
	const items =
		data.response.length > 0
			? getProperlyLeagueStandingsData(data.response[0].league).map((item) => {
					return {
						teamId: item.team.id,
						teamName: item.team.name,
						points: item.points,
						stats: {
							all: {
								played: item.all.played,
								win: item.all.win,
								draw: item.all.draw,
								lose: item.all.lose,
								goals: {
									for: item.all.goals.for,
									against: item.all.goals.against,
									diff: item.goalsDiff,
								},
							},
							home: {
								played: item.home.played,
								win: item.home.win,
								draw: item.home.draw,
								lose: item.home.lose,
								goals: {
									for: item.home.goals.for,
									against: item.home.goals.against,
								},
							},
							away: {
								played: item.away.played,
								win: item.away.win,
								draw: item.away.draw,
								lose: item.away.lose,
								goals: {
									for: item.away.goals.for,
									against: item.away.goals.against,
								},
							},
							averages: {
								promedio_de_goles_anotados_por_partido: formatDecimalNumber(
									item.all.goals.for / item.all.played,
									1,
								),
								promedio_de_goles_anotados_de_local_por_partido: formatDecimalNumber(
									item.home.goals.for / item.home.played,
									1,
								),
								promedio_de_goles_anotados_de_visitante_por_partido: formatDecimalNumber(
									item.away.goals.for / item.away.played,
									1,
								),
							},
						},
					};
				})
			: [];

	return {
		type: "SIMPLE",
		items,
		stats: {
			promedio_de_goles_anotados_por_partido: formatDecimalNumber(
				items.reduce((result, item) => {
					return result + item.stats.averages.promedio_de_goles_anotados_por_partido;
				}, 0) / items.length,
				1,
			),
			promedio_de_goles_anotados_de_local_por_partido: formatDecimalNumber(
				items.reduce((result, item) => {
					return result + item.stats.averages.promedio_de_goles_anotados_de_local_por_partido;
				}, 0) / items.length,
				1,
			),
			promedio_de_goles_anotados_de_visitante_por_partido: formatDecimalNumber(
				items.reduce((result, item) => {
					return result + item.stats.averages.promedio_de_goles_anotados_de_visitante_por_partido;
				}, 0) / items.length,
				1,
			),
		},
	};
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
	const isEgyptianLeague = response.id === 233;
	const isAustriaLeague = response.id === 218;
	const isScotlandLeague = response.id === 179;
	const isIcelandLeague = response.id === 164;
	const isDenmarkLeague = response.id === 119;

	if (isColombiaLeague) {
		return (
			response.standings.filter((standings) => {
				return (
					standings.find((team) => {
						return team.group === "Primera A: Clausura";
					}) !== undefined
				);
			})[0] || []
		);
	}

	if (
		(isBrazilLeague ||
			isArgentinaLeague ||
			isNorwayLeague ||
			isFinlandLeague ||
			isBelgiumLeague ||
			isEgyptianLeague ||
			isAustriaLeague ||
			isScotlandLeague ||
			isIcelandLeague ||
			isDenmarkLeague) &&
		response.standings.length === 1
	) {
		return response.standings[0];
	}

	return [];
}

function composeTeamName(team: Pick<T_FixtureMatchTeam, "id" | "name">) {
	return `${team.name} (${team.id})`;
}

function composeLeagueName(leagueId: number, options?: { full: true; date?: string }) {
	const league = getLeagueById(leagueId);

	if (options?.full) {
		return `${league.country.name}/${options.date ? `${options.date}-` : ""}${league.name} (${league.id})`;
	}

	return league.country.name;
}

function filterTeamPlayedMatches({
	teamId,
	playedMatches,
	side,
	lastMatches,
}: {
	teamId: T_FixtureMatchTeam["id"];
	playedMatches: Array<T_PlayedMatch>;
	side: "home" | "away" | "all";
	lastMatches: number | undefined;
}) {
	let result = playedMatches;

	if (side === "home") {
		result = result.filter((match) => {
			return match.teams.home.id === teamId;
		});
	} else if (side === "away") {
		result = result.filter((match) => {
			return match.teams.away.id === teamId;
		});
	}

	return lastMatches ? result.slice(0, lastMatches) : result;
}

function calculateTeamStats({
	teamId,
	playedMatches,
	side,
	lastMatches,
}: {
	teamId: T_FixtureMatchTeam["id"];
	playedMatches: Array<T_PlayedMatch>;
	side: "home" | "away" | "all";
	lastMatches?: number;
}): T_TeamStatsItems {
	if (side === "all") {
		const filteredMatches = filterTeamPlayedMatches({
			teamId,
			playedMatches,
			side,
			lastMatches,
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

				if (match.teams[matchSide].result === "WIN") {
					newResult.partidos_ganados += 1;
				} else if (match.teams[matchSide].result === "LOSE") {
					newResult.partidos_perdidos += 1;
				} else if (match.teams[matchSide].result === "DRAW") {
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
				puntos_ganados: 0,
				porcentaje_de_puntos_ganados: 0,
			},
		);

		result.promedio_de_goles_anotados = formatDecimalNumber(
			result.total_de_goles_anotados / result.total_de_partidos,
			1,
		);
		result.promedio_de_goles_recibidos = formatDecimalNumber(
			result.total_de_goles_recibidos / result.total_de_partidos,
			1,
		);
		result.puntos_ganados = result.partidos_ganados * 3 + result.partidos_empatados;
		result.porcentaje_de_puntos_ganados = formatDecimalNumber(
			(result.puntos_ganados * 100) / (result.total_de_partidos * 3),
			1,
		);

		return result;
	}

	const teamOpponentSide = side === "away" ? "home" : "away";
	const filteredMatches = filterTeamPlayedMatches({
		teamId,
		playedMatches,
		side,
		lastMatches,
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

			if (match.teams[side].result === "WIN") {
				newResult.partidos_ganados += 1;
			} else if (match.teams[side].result === "LOSE") {
				newResult.partidos_perdidos += 1;
			} else if (match.teams[side].result === "DRAW") {
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
			puntos_ganados: 0,
			porcentaje_de_puntos_ganados: 0,
		},
	);

	result.promedio_de_goles_anotados = formatDecimalNumber(
		result.total_de_goles_anotados / result.total_de_partidos,
		1,
	);
	result.promedio_de_goles_recibidos = formatDecimalNumber(
		result.total_de_goles_recibidos / result.total_de_partidos,
		1,
	);
	result.puntos_ganados = result.partidos_ganados * 3 + result.partidos_empatados;
	result.porcentaje_de_puntos_ganados = formatDecimalNumber(
		(result.puntos_ganados * 100) / (result.total_de_partidos * 3),
		1,
	);

	return result;
}

function checkIsTeamFeatured(teamId: number, leagueStandings: T_LeagueStandings) {
	const teamPosition = getTeamPosition(teamId, leagueStandings);

	if (v.isNumber(teamPosition)) {
		return teamPosition <= 8;
	}

	return false;
}

function getTeamById(teamId: number) {
	return TEAMS[String(teamId) as keyof typeof TEAMS] as T_TeamsFile[keyof typeof TEAMS];
}

function getCountryDetails(
	config: { leagueId: number } | { countryName: string },
): T_League["country"] | null {
	if ("leagueId" in config) {
		return getLeagueById(config.leagueId, { noThrowError: true })?.country || null;
	}

	const flagValue = flag(config.countryName);
	const codeValue = code(config.countryName);

	if (flagValue && codeValue) {
		return {
			name: config.countryName,
			flag: flagValue,
			code: codeValue,
		};
	}

	return null;
}

function updatePredictionsStats(match: T_FixtureMatch, prediction: T_MarketPrediction) {
	const predictionStatsFile = JSON.parse(
		readFile("src/scripts/predictions/data/util/predictions-stats.json"),
	) as T_PredictionsStatsFile;

	if ("results" in prediction) {
		const key = prediction.results.winning
			? "winning"
			: prediction.results.lost
				? "lost"
				: prediction.results.lostWinning
					? "lostWinning"
					: "skippedLost";

		if (!predictionStatsFile[prediction.id]) {
			predictionStatsFile[prediction.id] = {
				stats: {
					winning: 0,
					lost: 0,
					lostWinning: 0,
					skippedLost: 0,
					total: 0,
					successPercentaje: 0,
					picksPercentaje: 0,
				},
				record: {
					winning: {},
					lost: {},
					lostWinning: {},
					skippedLost: {},
				},
			};
		}

		predictionStatsFile[prediction.id].stats.total += 1;
		predictionStatsFile[prediction.id].stats[key] += 1;
		predictionStatsFile[prediction.id].record[key] = {
			...predictionStatsFile[prediction.id].record[key],
			[match.date]: (predictionStatsFile[prediction.id].record[key][match.date] || []).concat([
				generateSlug(`${match.id}-${match.league.country.name}`),
			]),
		};
		predictionStatsFile[prediction.id].stats.successPercentaje = formatDecimalNumber(
			(predictionStatsFile[prediction.id].stats.winning /
				(predictionStatsFile[prediction.id].stats.winning +
					predictionStatsFile[prediction.id].stats.lost)) *
				100,
			1,
		);
		predictionStatsFile[prediction.id].stats.picksPercentaje = formatDecimalNumber(
			((predictionStatsFile[prediction.id].stats.winning +
				predictionStatsFile[prediction.id].stats.lost) /
				predictionStatsFile[prediction.id].stats.total) *
				100,
			1,
		);

		writeFile(
			"src/scripts/predictions/data/util/predictions-stats.json",
			sortObjectKeys(predictionStatsFile),
		);
	}
}

function getMatchResult({
	// matchId,
	homeTeam,
	awayTeam,
}: {
	// matchId: string;
	homeTeam: { score: number | null };
	awayTeam: { score: number | null };
}): {
	homeTeam: Pick<T_PlayedMatchTeam, "score" | "result">;
	awayTeam: Pick<T_PlayedMatchTeam, "score" | "result">;
} {
	if (v.isNumber(homeTeam.score) && v.isNumber(awayTeam.score)) {
		const matchResult: {
			homeTeam: T_PlayedMatchTeam["result"];
			awayTeam: T_PlayedMatchTeam["result"];
		} =
			homeTeam.score === awayTeam.score
				? { homeTeam: "DRAW", awayTeam: "DRAW" }
				: homeTeam.score > awayTeam.score
					? { homeTeam: "WIN", awayTeam: "LOSE" }
					: { homeTeam: "LOSE", awayTeam: "WIN" };

		return {
			homeTeam: { score: homeTeam.score, result: matchResult.homeTeam },
			awayTeam: { score: awayTeam.score, result: matchResult.awayTeam },
		};
	}

	// TODO: Take out this in two weeks
	return {
		homeTeam: { score: 0, result: "DRAW" },
		awayTeam: { score: 0, result: "DRAW" },
	};

	// throw new Error(`Invalid score values: matchId: ${matchId}`);
}
