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
	T_Team,
	T_TeamsFile,
	T_TeamStats,
	T_TeamStatsItems,
} from "./types";
import { formatCode, formatDate } from "./utils";
import doubleOpportunityPrediction from "./markets/double-opportunity-for-home-team";
import goalByHomeTeamPrediction from "./markets/goal-by-home-team";
import matchWinnerPrediction from "./markets/match-winner-for-home-team";
import {
	filterTeamPlayedMatches,
	getLeagueStandingsLimits,
	getTeamPosition,
	type T_PredictionsInput,
} from "./markets/utils";

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

function updateTeamsFile(matches: Awaited<PromiseLike<ReturnType<typeof fetchFixtureMatches>>>) {
	const currentTeams = JSON.parse(readFile("src/scripts/predictions/data/util/teams.json"));
	const outputTeams = {
		...currentTeams,
		...Object.values(matches).reduce(
			(result, match) => {
				return {
					...result,
					[match.teams.home.id]: {
						name: match.teams.home.name,
						historic: currentTeams[match.teams.home.id]?.historic || false,
						country: currentTeams[match.teams.home.id]?.country || match.teams.home.country,
					},
					[match.teams.away.id]: {
						name: match.teams.away.name,
						historic: currentTeams[match.teams.away.id]?.historic || false,
						country: currentTeams[match.teams.away.id]?.country || match.teams.away.country,
					},
				};
			},
			{} as Pick<T_FixtureMatchTeam, "name" | "country">,
		),
	};

	writeFile("src/scripts/predictions/data/util/teams.json", outputTeams);
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
	writeFile("src/scripts/predictions/data/util/predictions-stats.json", { stats: {}, records: {} });
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
		.filter((item) => item.fixture.status.long !== "Match Postponed")
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
		.filter((match) => {
			return (
				match.fixture.date >= league.season.startDate &&
				match.fixture.date < today &&
				match.fixture.status.long === "Match Finished"
			);
		})
		.map((item) => parseMatchItem("PLAYED_MATCH", item, leagueStandings, league))
		.sort(sortBy("-date"));

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
	const league = getLeagueById(item.league.id, { noThrowError: true }) || {
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
	};
	const showWarningMessageInLeagueStandingsLimitsFunction =
		variant !== "PLAYED_MATCH" && league.type === "League";
	const homeTeamDetails = getTeamById(item.teams.home.id);
	const awayTeamDetails = getTeamById(item.teams.away.id);
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
					homeTeamDetails?.country ||
					(item.league.country !== "World"
						? getCountryDetails({ leagueId: item.league.id }) ||
							getCountryDetails({ countryName: item.league.country })
						: null),
				position: getTeamPosition(item.teams.home.id, leagueStandings),
				tag: getTeamTag(
					item.teams.home.id,
					leagueStandings,
					showWarningMessageInLeagueStandingsLimitsFunction,
				),
				historic: homeTeamDetails?.historic || false,
			},
			away: {
				id: item.teams.away.id,
				name: item.teams.away.name,
				country:
					awayTeamDetails?.country ||
					(item.league.country !== "World"
						? getCountryDetails({ leagueId: item.league.id }) ||
							getCountryDetails({ countryName: item.league.country })
						: null),
				position: getTeamPosition(item.teams.away.id, leagueStandings),
				tag: getTeamTag(
					item.teams.away.id,
					leagueStandings,
					showWarningMessageInLeagueStandingsLimitsFunction,
				),
				historic: awayTeamDetails?.historic || false,
			},
		},
		league,
	};

	if (variant === "PLAYED_MATCH") {
		const matchScores = getMatchScores({ matchId: item.fixture.id, score: item.score });
		const output: T_PlayedMatch = {
			...matchBaseData,
			type: "PLAYED_MATCH",
			played: true,
			teams: {
				home: {
					...matchBaseData.teams.home,
					...matchScores.homeTeam,
				},
				away: {
					...matchBaseData.teams.away,
					...matchScores.awayTeam,
				},
			},
		};

		return output;
	}

	if (variant === "FIXTURE_PLAYED_MATCH") {
		const matchScores = getMatchScores({ matchId: item.fixture.id, score: item.score });
		const output: T_FixturePlayedMatch = {
			...matchBaseData,
			type: "FIXTURE_PLAYED_MATCH",
			played: true,
			teams: {
				home: {
					...matchBaseData.teams.home,
					...matchScores.homeTeam,
					stats: createEmptyTeamStatsObject(),
					matches: [],
				},
				away: {
					...matchBaseData.teams.away,
					...matchScores.awayTeam,
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
			? getProperlyLeagueStandingsData(data.response[0].league).map((groupOfItems) => {
					return groupOfItems.map((item) => {
						const homeData = {
							played: item.home.played || 0,
							win: item.home.win || 0,
							draw: item.home.draw || 0,
							lose: item.home.lose || 0,
							goals: {
								for: item.home.goals.for || 0,
								against: item.home.goals.against || 0,
							},
						};
						const awayData = {
							played: item.away.played || 0,
							win: item.away.win || 0,
							draw: item.away.draw || 0,
							lose: item.away.lose || 0,
							goals: {
								for: item.away.goals.for || 0,
								against: item.away.goals.against || 0,
							},
						};

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
								home: homeData,
								away: awayData,
								averages: {
									promedio_de_goles_anotados_por_partido: formatDecimalNumber(
										item.all.goals.for / item.all.played,
										1,
									),
									promedio_de_goles_anotados_de_local_por_partido: formatDecimalNumber(
										homeData.goals.for / homeData.played,
										1,
									),
									promedio_de_goles_anotados_de_visitante_por_partido: formatDecimalNumber(
										awayData.goals.for / awayData.played,
										1,
									),
								},
							},
						};
					});
				})
			: [];

	if (items.length === 0) {
		return {
			type: "GROUPS",
			items: [],
		};
	}

	if (items.length === 1) {
		return {
			type: "REGULAR",
			items: items[0],
			stats: {
				partidos_jugados: items[0].sort((a, b) => a.stats.all.played - b.stats.all.played)[0].stats
					.all.played,
				promedio_de_goles_anotados_por_partido: formatDecimalNumber(
					items[0].reduce((result, item) => {
						return result + item.stats.averages.promedio_de_goles_anotados_por_partido;
					}, 0) / items.length,
					1,
				),
				promedio_de_goles_anotados_de_local_por_partido: formatDecimalNumber(
					items[0].reduce((result, item) => {
						return result + item.stats.averages.promedio_de_goles_anotados_de_local_por_partido;
					}, 0) / items.length,
					1,
				),
				promedio_de_goles_anotados_de_visitante_por_partido: formatDecimalNumber(
					items[0].reduce((result, item) => {
						return result + item.stats.averages.promedio_de_goles_anotados_de_visitante_por_partido;
					}, 0) / items.length,
					1,
				),
			},
		};
	}

	return {
		type: "GROUPS",
		items,
	};
}

function getProperlyLeagueStandingsData(
	response: T_RawLeagueStandingsResponse["response"][number]["league"],
) {
	const isColombiaLeague = response.id === 239;

	if (isColombiaLeague) {
		return [
			response.standings.filter((standings) => {
				return (
					standings.find((team) => {
						return team.group === "Primera A: Clausura";
					}) !== undefined
				);
			})[0] || [],
		];
	}

	if (response.country === "World") {
		return response.standings;
	}

	/*
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
			isTurkeyLeague ||
			isPortugalLeague ||
			isNetherlandsLeague ||
			isEnglandChampionshipLeague ||
			isCzechLeague ||
			isDenmarkLeague) &&
		response.standings.length === 1
	) {
		return response.standings[0];
	}
  */

	return [response.standings[0] || []];
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

					if (match.teams.home.score.fullTime > 0) {
						newResult.partidos_con_goles_anotados += 1;
						newResult.total_de_goles_anotados += match.teams.home.score.fullTime;
					}

					if (match.teams.away.score.fullTime > 0) {
						newResult.partidos_con_goles_recibidos += 1;
						newResult.total_de_goles_recibidos += match.teams.away.score.fullTime;
					}
				} else {
					matchSide = "away";

					if (match.teams.away.score.fullTime > 0) {
						newResult.total_de_goles_anotados += match.teams.away.score.fullTime;
						newResult.partidos_con_goles_anotados += 1;
					}

					if (match.teams.home.score.fullTime > 0) {
						newResult.total_de_goles_recibidos += match.teams.home.score.fullTime;
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

				newResult.total_de_goles_anotados_en_primera_mitad +=
					match.teams[matchSide].score.firstHalf.for;
				newResult.total_de_goles_recibidos_en_primera_mitad +=
					match.teams[matchSide].score.firstHalf.against;
				newResult.partidos_con_goles_anotados_en_primera_mitad +=
					match.teams[matchSide].score.firstHalf.for > 0 ? 1 : 0;
				newResult.partidos_con_goles_recibidos_en_primera_mitad +=
					match.teams[matchSide].score.firstHalf.against > 0 ? 1 : 0;

				newResult.total_de_goles_anotados_en_segunda_mitad +=
					match.teams[matchSide].score.secondHalf.for;
				newResult.total_de_goles_recibidos_en_segunda_mitad +=
					match.teams[matchSide].score.secondHalf.against;
				newResult.partidos_con_goles_anotados_en_segunda_mitad +=
					match.teams[matchSide].score.secondHalf.for > 0 ? 1 : 0;
				newResult.partidos_con_goles_recibidos_en_segunda_mitad +=
					match.teams[matchSide].score.secondHalf.against > 0 ? 1 : 0;

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

				total_de_goles_anotados_en_primera_mitad: 0,
				total_de_goles_recibidos_en_primera_mitad: 0,
				partidos_con_goles_anotados_en_primera_mitad: 0,
				partidos_con_goles_recibidos_en_primera_mitad: 0,
				promedio_de_partidos_con_goles_anotados_en_primera_mitad: 0,
				promedio_de_partidos_con_goles_recibidos_en_primera_mitad: 0,

				total_de_goles_anotados_en_segunda_mitad: 0,
				total_de_goles_recibidos_en_segunda_mitad: 0,
				partidos_con_goles_anotados_en_segunda_mitad: 0,
				partidos_con_goles_recibidos_en_segunda_mitad: 0,
				promedio_de_partidos_con_goles_anotados_en_segunda_mitad: 0,
				promedio_de_partidos_con_goles_recibidos_en_segunda_mitad: 0,
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
		result.promedio_de_partidos_con_goles_anotados_en_primera_mitad = formatDecimalNumber(
			result.partidos_con_goles_anotados_en_primera_mitad / result.total_de_partidos,
			1,
		);
		result.promedio_de_partidos_con_goles_recibidos_en_primera_mitad = formatDecimalNumber(
			result.partidos_con_goles_recibidos_en_primera_mitad / result.total_de_partidos,
			1,
		);
		result.promedio_de_partidos_con_goles_anotados_en_segunda_mitad = formatDecimalNumber(
			result.partidos_con_goles_anotados_en_segunda_mitad / result.total_de_partidos,
			1,
		);
		result.promedio_de_partidos_con_goles_recibidos_en_segunda_mitad = formatDecimalNumber(
			result.partidos_con_goles_recibidos_en_segunda_mitad / result.total_de_partidos,
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

			if (match.teams[side].score.fullTime > 0) {
				newResult.total_de_goles_anotados += match.teams[side].score.fullTime;
				newResult.partidos_con_goles_anotados += 1;
			}

			if (match.teams[teamOpponentSide].score.fullTime > 0) {
				newResult.total_de_goles_recibidos += match.teams[teamOpponentSide].score.fullTime;
				newResult.partidos_con_goles_recibidos += 1;
			}

			if (match.teams[side].result === "WIN") {
				newResult.partidos_ganados += 1;
			} else if (match.teams[side].result === "LOSE") {
				newResult.partidos_perdidos += 1;
			} else if (match.teams[side].result === "DRAW") {
				newResult.partidos_empatados += 1;
			}

			newResult.total_de_goles_anotados_en_primera_mitad += match.teams[side].score.firstHalf.for;
			newResult.total_de_goles_recibidos_en_primera_mitad +=
				match.teams[side].score.firstHalf.against;
			newResult.partidos_con_goles_anotados_en_primera_mitad +=
				match.teams[side].score.firstHalf.for > 0 ? 1 : 0;
			newResult.partidos_con_goles_recibidos_en_primera_mitad +=
				match.teams[side].score.firstHalf.against > 0 ? 1 : 0;

			newResult.total_de_goles_anotados_en_segunda_mitad += match.teams[side].score.secondHalf.for;
			newResult.total_de_goles_recibidos_en_segunda_mitad +=
				match.teams[side].score.secondHalf.against;
			newResult.partidos_con_goles_anotados_en_segunda_mitad +=
				match.teams[side].score.secondHalf.for > 0 ? 1 : 0;
			newResult.partidos_con_goles_recibidos_en_segunda_mitad +=
				match.teams[side].score.secondHalf.against > 0 ? 1 : 0;

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

			total_de_goles_anotados_en_primera_mitad: 0,
			total_de_goles_recibidos_en_primera_mitad: 0,
			partidos_con_goles_anotados_en_primera_mitad: 0,
			partidos_con_goles_recibidos_en_primera_mitad: 0,
			promedio_de_partidos_con_goles_anotados_en_primera_mitad: 0,
			promedio_de_partidos_con_goles_recibidos_en_primera_mitad: 0,

			total_de_goles_anotados_en_segunda_mitad: 0,
			total_de_goles_recibidos_en_segunda_mitad: 0,
			partidos_con_goles_anotados_en_segunda_mitad: 0,
			partidos_con_goles_recibidos_en_segunda_mitad: 0,
			promedio_de_partidos_con_goles_anotados_en_segunda_mitad: 0,
			promedio_de_partidos_con_goles_recibidos_en_segunda_mitad: 0,
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
	result.promedio_de_partidos_con_goles_anotados_en_primera_mitad = formatDecimalNumber(
		result.partidos_con_goles_anotados_en_primera_mitad / result.total_de_partidos,
		1,
	);
	result.promedio_de_partidos_con_goles_recibidos_en_primera_mitad = formatDecimalNumber(
		result.partidos_con_goles_recibidos_en_primera_mitad / result.total_de_partidos,
		1,
	);
	result.promedio_de_partidos_con_goles_anotados_en_segunda_mitad = formatDecimalNumber(
		result.partidos_con_goles_anotados_en_segunda_mitad / result.total_de_partidos,
		1,
	);
	result.promedio_de_partidos_con_goles_recibidos_en_segunda_mitad = formatDecimalNumber(
		result.partidos_con_goles_recibidos_en_segunda_mitad / result.total_de_partidos,
		1,
	);

	return result;
}

function getTeamTag(
	teamId: number,
	leagueStandings: T_LeagueStandings,
	showWarningMessageInLeagueStandingsLimitsFunction: boolean,
): T_Team["tag"] {
	const teamPosition = getTeamPosition(teamId, leagueStandings);
	const leagueStandingsLimits = getLeagueStandingsLimits(
		leagueStandings,
		showWarningMessageInLeagueStandingsLimitsFunction,
	);

	if (
		v.isNumber(teamPosition) &&
		leagueStandingsLimits.featured > 0 &&
		leagueStandingsLimits.poor > 0 &&
		leagueStandings.type === "REGULAR" &&
		leagueStandings.stats.partidos_jugados > 0
	) {
		return teamPosition <= leagueStandingsLimits.featured
			? "FEATURED"
			: teamPosition >= leagueStandingsLimits.poor
				? "POOR"
				: "REGULAR";
	}

	return "REGULAR";
}

function getTeamById(teamId: number) {
	return TEAMS[String(teamId) as keyof typeof TEAMS] as T_TeamsFile[keyof typeof TEAMS] | undefined;
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

		if (!predictionStatsFile.stats[prediction.id]) {
			predictionStatsFile.stats[prediction.id] = {
				winning: 0,
				lost: 0,
				lostWinning: 0,
				skippedLost: 0,
				total: 0,
				successPercentaje: 0,
				picksPercentaje: 0,
			};
			predictionStatsFile.records[prediction.id] = {
				winning: {},
				lost: {},
				lostWinning: {},
				skippedLost: {},
			};
		}

		predictionStatsFile.stats[prediction.id].total += 1;
		predictionStatsFile.stats[prediction.id][key] += 1;
		predictionStatsFile.records[prediction.id][key] = {
			...predictionStatsFile.records[prediction.id][key],
			[match.date]: (predictionStatsFile.records[prediction.id][key][match.date] || []).concat([
				generateSlug(
					`${match.id}-${match.league.country.name === "World" ? match.league.name : match.league.country.name}`,
				),
			]),
		};
		predictionStatsFile.stats[prediction.id].successPercentaje = formatDecimalNumber(
			(predictionStatsFile.stats[prediction.id].winning /
				(predictionStatsFile.stats[prediction.id].winning +
					predictionStatsFile.stats[prediction.id].lost)) *
				100,
			1,
		);
		predictionStatsFile.stats[prediction.id].picksPercentaje = formatDecimalNumber(
			((predictionStatsFile.stats[prediction.id].winning +
				predictionStatsFile.stats[prediction.id].lost) /
				predictionStatsFile.stats[prediction.id].total) *
				100,
			1,
		);

		writeFile(
			"src/scripts/predictions/data/util/predictions-stats.json",
			sortObjectKeys(predictionStatsFile),
		);
	}
}

function getMatchScores({
	matchId,
	score,
}: {
	matchId: number;
	score: T_RawMatchesResponse["response"][number]["score"];
}): {
	homeTeam: Pick<T_PlayedMatchTeam, "score" | "result">;
	awayTeam: Pick<T_PlayedMatchTeam, "score" | "result">;
} {
	if (v.isNumber(score.fulltime.home) && v.isNumber(score.fulltime.away)) {
		const matchResult: {
			homeTeam: T_PlayedMatchTeam["result"];
			awayTeam: T_PlayedMatchTeam["result"];
		} =
			score.fulltime.home === score.fulltime.away
				? { homeTeam: "DRAW", awayTeam: "DRAW" }
				: score.fulltime.home > score.fulltime.away
					? { homeTeam: "WIN", awayTeam: "LOSE" }
					: { homeTeam: "LOSE", awayTeam: "WIN" };

		const homeTeamSecondHalfScore = {
			for: score.fulltime.home - score.halftime.home,
			against: score.fulltime.away - score.halftime.away,
		};
		const awayTeamSecondHalfScore = {
			for: score.fulltime.away - score.halftime.away,
			against: score.fulltime.home - score.halftime.home,
		};

		if (
			homeTeamSecondHalfScore.for < 0 ||
			homeTeamSecondHalfScore.against < 0 ||
			awayTeamSecondHalfScore.for < 0 ||
			awayTeamSecondHalfScore.against < 0
		) {
			return {
				homeTeam: {
					result: matchResult.homeTeam,
					score: {
						fullTime: score.fulltime.home,
						firstHalf: {
							for: 0,
							against: 0,
						},
						secondHalf: {
							for: 0,
							against: 0,
						},
						extraTime: {
							for: 0,
							against: 0,
						},
					},
				},
				awayTeam: {
					result: matchResult.awayTeam,
					score: {
						fullTime: score.fulltime.away,
						firstHalf: {
							for: 0,
							against: 0,
						},
						secondHalf: {
							for: 0,
							against: 0,
						},
						extraTime: {
							for: 0,
							against: 0,
						},
					},
				},
			};
		}

		return {
			homeTeam: {
				result: matchResult.homeTeam,
				score: {
					fullTime: score.fulltime.home,
					firstHalf: {
						for: score.halftime.home,
						against: score.halftime.away,
					},
					secondHalf: homeTeamSecondHalfScore,
					extraTime: {
						for: v.isNumber(score.extratime.home)
							? score.fulltime.home + score.extratime.home
							: null,
						against: v.isNumber(score.extratime.away)
							? score.fulltime.away + score.extratime.away
							: null,
					},
				},
			},
			awayTeam: {
				result: matchResult.awayTeam,
				score: {
					fullTime: score.fulltime.away,
					firstHalf: {
						for: score.halftime.away,
						against: score.halftime.home,
					},
					secondHalf: awayTeamSecondHalfScore,
					extraTime: {
						for: v.isNumber(score.extratime.away)
							? score.fulltime.away + score.extratime.away
							: null,
						against: v.isNumber(score.extratime.home)
							? score.fulltime.home + score.extratime.home
							: null,
					},
				},
			},
		};
	}

	throw new Error(`Invalid score values: matchId: ${matchId}`);
}
