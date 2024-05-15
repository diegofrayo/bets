import { sortBy } from "../../@diegofrayo/sort";
import type DR from "../../@diegofrayo/types";
import { removeDuplicates } from "../../@diegofrayo/utils/arrays-and-objects";
import { fileExists, readFile, writeFile } from "../../@diegofrayo/utils/files";
import { delay, getErrorMessage, throwError } from "../../@diegofrayo/utils/misc";
import v from "../../@diegofrayo/v";

import APIClient from "./api-client";
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
} from "./types";
import { formatCode } from "./utils";
import LEAGUES from "./data/util/leagues.json";
import TEAMS from "./data/util/teams.json";

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
	} else {
		if (
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
	} else {
		if (
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
	}

	const parsedResponse = parsePlayedMatchesResponse(
		rawResponse,
		requestConfig.date,
		leagueStandings,
		league,
	).filter((match) => match.played);

	if (parsedResponse.length > 0) {
		writeFile(
			`src/scripts/predictions/data/processed/teams/${composeLeagueName(
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
	} else {
		if (
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
	}

	const parsedResponse = parseStandingsResponse(rawResponse);

	writeFile(
		`src/scripts/predictions/data/processed/standings/${composeLeagueName(league.id, "full")}.json`,
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

async function updateLeaguesFixtures() {
	const output = {} as DR.Object<number[]>;
	const requestConfig = { from: "2024-05-01", to: "2024-05-31" };
	const leagues = Object.values(LEAGUES.items).sort(sortBy("order", "name"));

	for (const league of leagues) {
		try {
			if (!league.enabled) continue;

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
	}

	writeFile(
		"src/scripts/predictions/data/util/leagues.json",
		await formatCode(
			{
				...LEAGUES,
				fixtures: Object.entries(output).reduce((result, [key, value]) => {
					return { ...result, [key]: removeDuplicates(value) };
				}, {}),
			},
			"json",
		),
	);
}

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
	const homeTeamScoresOneGoalAnalysisResult = homeTeamScoresOneGoalAnalysis({
		match,
		homeTeam,
		awayTeam,
		homeTeamPlayedMatches,
		homeTeamStats,
		awayTeamStats,
		leagueStandings,
	});
	const awayTeamScoresOneGoalAnalysisResult = awayTeamScoresOneGoalAnalysis({
		match,
		homeTeam,
		awayTeam,
		homeTeamStats,
		awayTeamStats,
		leagueStandings,
	});

	return [
		homeTeamScoresOneGoalAnalysisResult,
		oneGoalDuringMatchAnalysis({
			match,
			homeTeam,
			awayTeam,
			homeTeamScoresOneGoalAnalysisResult: homeTeamScoresOneGoalAnalysisResult.recommendable,
			awayTeamScoresOneGoalAnalysisResult: awayTeamScoresOneGoalAnalysisResult.recommendable,
			leagueStandings,
		}),
		matchWinnerAnalysis({ match, homeTeam, awayTeam, leagueStandings }),
		awayTeamScoresOneGoalAnalysisResult,
	];
}

function getTeamStats(
	teamId: number,
	playedMatches: T_PlayedMatch[],
	leagueStandings: T_LeagueStandings,
): T_TeamStats {
	const result = {
		...calculateTeamStats({ teamId, playedMatches, side: "all", leagueStandings }),
		"---|---": 0,
		...calculateTeamStats({ teamId, playedMatches, side: "home", leagueStandings }),
		"---||---": 0,
		...calculateTeamStats({ teamId, playedMatches, side: "away", leagueStandings }),
		"---|||---": 0,
		...calculateTeamStats({ teamId, playedMatches, side: "all", leagueStandings, lastGames: 4 }),
		"---||||---": 0,
		...calculateTeamStats({ teamId, playedMatches, side: "home", leagueStandings, lastGames: 4 }),
		"---|||||---": 0,
		...calculateTeamStats({ teamId, playedMatches, side: "away", leagueStandings, lastGames: 4 }),
	};

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
	league: T_League,
) {
	const result = data.response
		.map((item) => parseMatchItem(item, leagueStandings, league))
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
		.map((item) => parseMatchItem(item, leagueStandings, league))
		.sort(sortBy("-date"))
		.filter((match) => {
			return match.fullDate <= date;
		});

	return result.slice(0, 15);
}

function parseMatchItem(
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
	league: T_League,
): T_PlayedMatch;
function parseMatchItem(
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
	league: T_League,
): T_FixtureMatch;
function parseMatchItem(
	item: T_RawMatchesResponse["response"][number],
	leagueStandings: T_LeagueStandings,
	league: T_League,
) {
	const fullDate = item.fixture.date.substring(0, 16);
	const [date, hour] = fullDate.split("T");
	const isPlayedMatch = v.isNumber(item.goals.home) && v.isNumber(item.goals.away);
	const matchDataBase = {
		id: `${date}-${item.teams.home.name}-${item.teams.away.name}`,
		fullDate,
		date,
		hour,
		played: false,
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

	if (isPlayedMatch) {
		return {
			...matchDataBase,
			played: true,
			teams: {
				home: {
					...matchDataBase.teams.home,
					score: item.goals.home || 0,
					winner: item.teams.home.winner,
				},
				away: {
					...matchDataBase.teams.away,
					score: item.goals.away || 0,
					winner: item.teams.away.winner,
				},
			},
		};
	}

	return matchDataBase;
}

function parseStandingsResponse(data: T_RawLeagueStandingsResponse) {
	const result =
		data.response.length > 0
			? data.response[0].league.standings.map((item) => {
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

function calculateTeamStats({
	teamId,
	playedMatches,
	side,
	lastGames,
	leagueStandings,
}: {
	teamId: T_Team["id"];
	playedMatches: T_PlayedMatch[];
	side: "home" | "away" | "all";
	leagueStandings: T_LeagueStandings;
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
		const teamPositionStats = getTeamPositionStats(teamId, leagueStandings);

		result = filteredMatches.reduce(
			(result, match) => {
				const newResult = {
					...result,
				};

				if (match.teams.home.id === teamId) {
					newResult.total_de_goles += match.teams.home.score;
				} else {
					newResult.total_de_goles += match.teams.away.score;
				}

				return newResult;
			},
			{
				total_de_partidos: filteredMatches.length,
				total_de_goles: 0,
				promedio_de_goles: 0,
				...(teamPositionStats
					? {
							total_de_goles_recibidos: teamPositionStats.stats.goals.against,
							promedio_de_goles_recibidos: Number(
								(teamPositionStats.stats.goals.against / teamPositionStats.stats.played).toFixed(1),
							),
						}
					: { total_de_goles_recibidos: 0, promedio_de_goles_recibidos: 0 }),
			},
		);

		result.promedio_de_goles = Number(
			(result.total_de_goles / result.total_de_partidos).toFixed(1),
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
					newResult[`goles_de_${sideLabel}`] += match.teams[side].score;

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
				[`goles_de_${sideLabel}`]: 0,
				[`promedio_de_goles_de_${sideLabel}`]: 0,
				[`partidos_de_${sideLabel}`]: filteredMatches.length,
				[`partidos_ganados_de_${sideLabel}`]: 0,
				[`partidos_perdidos_de_${sideLabel}`]: 0,
				[`partidos_empatados_de_${sideLabel}`]: 0,
				[`partidos_con_goles_de_${sideLabel}`]: 0,
				[`promedio_de_puntos_de_${sideLabel}`]: 0,
			},
		);

		result[`promedio_de_goles_de_${sideLabel}`] = Number(
			(result[`goles_de_${sideLabel}`] / result[`partidos_de_${sideLabel}`]).toFixed(1),
		);
		result[`porcentaje_de_puntos_ganados_de_${sideLabel}`] = Number(
			(
				((result[`partidos_de_${sideLabel}`] - result[`partidos_perdidos_de_${sideLabel}`]) /
					result[`partidos_de_${sideLabel}`]) *
				100
			).toFixed(1),
		);
	}

	return lastGames
		? Object.entries(result).reduce((result, [key, value]) => {
				return {
					...result,
					[`ultimos_${key}`]: value,
				};
			}, {})
		: result;
}

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
	let result = playedMatches;

	if (side === "home") {
		result = playedMatches.filter((match) => {
			return match.teams.home.id === teamId;
		});
	} else if (side === "away") {
		result = playedMatches.filter((match) => {
			return match.teams.away.id === teamId;
		});
	}

	return (lastGames ? result.slice(0, lastGames) : result).filter(Boolean);
}

// --- PREDICTIONS & ANALYSIS ---

function homeTeamScoresOneGoalAnalysis({
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
}) {
	const criteria = [
		[
			{
				enabled: true,
				description: "Marcó gol en los últimos 4 partidos de local",
				weight: 0.75,
				fn: () => {
					return (
						homeTeamStats.ultimos_partidos_con_goles_de_local >=
						homeTeamStats.ultimos_partidos_de_local
					);
				},
			},
			{
				enabled: true,
				description: "Promedio de goles de local >= 1.3",
				weight: 0.75,
				fn: () => {
					return homeTeamStats.promedio_de_goles_de_local >= 1.3;
				},
			},
		],
		{
			enabled: true,
			description: "El local es un equipo destacado",
			weight: 0.083,
			fn: () => {
				return checkIsTeamFeatured(homeTeam, leagueStandings);
			},
		},
		{
			enabled: true,
			description: "El visitante recibe muchos goles (Promedio >= 2)",
			weight: 0.083,
			fn: () => {
				return awayTeamStats.promedio_de_goles_recibidos >= 2;
			},
		},
		{
			enabled: v.isNumber(getTeamPosition(awayTeam.id, leagueStandings)),
			description: "El visitante está en los últimos 3 puestos de la tabla",
			weight: 0.083,
			fn: () => {
				const leagueTeams = leagueStandings.flat().length;
				const teamPosition = getTeamPosition(awayTeam.id, leagueStandings);

				if (leagueStandings.length == 1 && leagueTeams > 0 && teamPosition) {
					return leagueTeams - teamPosition <= 2;
				}

				return false;
			},
		},
		{
			enabled: true,
			description: "El local está al menos 5 posiciones mas arriba que el rival",
			weight: 0,
			fn: () => {
				return compareTeamsPositions({
					homeTeam,
					awayTeam,
					leagueStandings,
					difference: 5,
				});
			},
		},
		{
			enabled: true,
			description: "Promedio de goles >= 1.5",
			weight: 0,
			fn: () => {
				return homeTeamStats.promedio_de_goles >= 1.5;
			},
		},
		{
			enabled: true,
			description: "No ha perdido los últimos 4 partidos de local",
			weight: 0,
			fn: () => {
				return wonOrTiedLastGames({
					teamId: homeTeam.id,
					teamPlayedMatches: homeTeamPlayedMatches,
					side: "home",
					lastGames: 4,
				});
			},
		},
		{
			enabled: false,
			description: "Ha marcado en los últimos 4 partidos de local",
			weight: 0,
			fn: () => {
				return scoredLastGames({
					teamId: homeTeam.id,
					teamPlayedMatches: homeTeamPlayedMatches,
					side: "home",
					lastGames: 4,
				});
			},
		},
	];
	const warnings = [
		{
			description: "Ambos equipos son destacados",
			fn: () => {
				return (
					checkIsTeamFeatured(homeTeam, leagueStandings) === true &&
					checkIsTeamFeatured(awayTeam, leagueStandings) === true
				);
			},
		},
		{
			description: "El visitante es destacado y el local no",
			fn: () => {
				return (
					checkIsTeamFeatured(homeTeam, leagueStandings) === false &&
					checkIsTeamFeatured(awayTeam, leagueStandings) === true
				);
			},
		},
		{
			description: "El visitante tiene buenos resultados como visitante (Puntos ganados > 50%)",
			fn: () => {
				return awayTeamStats.porcentaje_de_puntos_ganados_de_visitante > 50;
			},
		},
	];

	return createAnalysisOutputObject({
		id: "GEL",
		name: "El equipo local marca un gol",
		criteria,
		warnings,
		...(match.played
			? {
					right: (recommendable: boolean) => recommendable && match.teams.home.score >= 1,
					lostRight: (recommendable: boolean) => !recommendable && match.teams.home.score >= 1,
					fail: (recommendable: boolean) => recommendable && match.teams.home.score === 0,
					skippedFail: (recommendable: boolean) => !recommendable && match.teams.home.score === 0,
				}
			: {}),
	});
}

function oneGoalDuringMatchAnalysis({
	match,
	homeTeam,
	awayTeam,
	homeTeamScoresOneGoalAnalysisResult,
	awayTeamScoresOneGoalAnalysisResult,
	leagueStandings,
}: {
	match: T_FixtureMatch;
	homeTeam: T_Team;
	awayTeam: T_Team;
	homeTeamScoresOneGoalAnalysisResult: boolean;
	awayTeamScoresOneGoalAnalysisResult: boolean;
	leagueStandings: T_LeagueStandings;
}) {
	const criteria = [
		{
			enabled: true,
			description: "El local o visitante puede hacer un gol",
			weight: 0.75,
			fn: () => {
				return homeTeamScoresOneGoalAnalysisResult || awayTeamScoresOneGoalAnalysisResult;
			},
		},
		{
			enabled: true,
			description: "Alguno de los dos equipos es destacado",
			weight: 0.25,
			fn: () => {
				return (
					checkIsTeamFeatured(homeTeam, leagueStandings) ||
					checkIsTeamFeatured(awayTeam, leagueStandings)
				);
			},
		},
	];
	const warnings = [
		{
			description: "Ambos equipos son destacados",
			fn: () => {
				return (
					checkIsTeamFeatured(homeTeam, leagueStandings) === true &&
					checkIsTeamFeatured(awayTeam, leagueStandings) === true
				);
			},
		},
	];

	return createAnalysisOutputObject({
		id: "GEP",
		name: "Hay un gol en el partido",
		criteria,
		warnings,
		...(match.played
			? {
					right: (recommendable: boolean) =>
						recommendable && (match.teams.home.score >= 1 || match.teams.away.score >= 1),
					lostRight: (recommendable: boolean) =>
						!recommendable && (match.teams.home.score >= 1 || match.teams.away.score >= 1),
					fail: (recommendable: boolean) =>
						recommendable && match.teams.home.score === 0 && match.teams.away.score === 0,
					skippedFail: (recommendable: boolean) =>
						!recommendable && match.teams.home.score === 0 && match.teams.away.score === 0,
				}
			: {}),
	});
}

function matchWinnerAnalysis({
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
		id: "ELGE",
		name: "El equipo local gana o empata",
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

function awayTeamScoresOneGoalAnalysis({
	match,
	homeTeam,
	homeTeamStats,
	awayTeam,
	awayTeamStats,
	leagueStandings,
}: {
	match: T_FixtureMatch;
	homeTeam: T_Team;
	homeTeamStats: T_TeamStats;
	awayTeam: T_Team;
	awayTeamStats: T_TeamStats;
	leagueStandings: T_LeagueStandings;
}) {
	const criteria = [
		[
			{
				enabled: true,
				description: "El visitante es destacado y el local no",
				weight: 0.75,
				fn: () => {
					return (
						checkIsTeamFeatured(homeTeam, leagueStandings) === false &&
						checkIsTeamFeatured(awayTeam, leagueStandings) === true
					);
				},
			},
			{
				enabled: true,
				description:
					"El visitante tiene un promedio de gol >= 1 en los últimos 4 partidos de visitante",
				weight: 0.75,
				fn: () => {
					return awayTeamStats.ultimos_promedio_de_goles_de_visitante >= 1;
				},
			},
		],
		{
			enabled: true,
			description: "El visitante tiene un promedio de gol de visitante >= 1.3",
			weight: 0.083,
			fn: () => {
				return awayTeamStats.promedio_de_goles_de_visitante >= 1.3;
			},
		},
		{
			enabled: true,
			description: "El local recibe muchos goles (Promedio >= 2)",
			weight: 0.083,
			fn: () => {
				return homeTeamStats.promedio_de_goles_recibidos >= 2;
			},
		},
		{
			enabled: v.isNumber(getTeamPosition(homeTeam.id, leagueStandings)),
			description: "El local está en los últimos 3 puestos de la tabla",
			weight: 0.083,
			fn: () => {
				const leagueTeams = leagueStandings.flat().length;
				const teamPosition = getTeamPosition(homeTeam.id, leagueStandings);

				if (leagueStandings.length == 1 && leagueTeams > 0 && teamPosition) {
					return leagueTeams - teamPosition <= 2;
				}

				return false;
			},
		},
	];
	const warnings = [
		{
			description: "El local es destacado",
			fn: () => {
				return checkIsTeamFeatured(homeTeam, leagueStandings) === true;
			},
		},
	];

	return createAnalysisOutputObject({
		id: "GEV",
		name: "El equipo visitante marca un gol",
		criteria,
		warnings,
		...(match.played
			? {
					right: (recommendable: boolean) => recommendable && match.teams.away.score >= 1,
					lostRight: (recommendable: boolean) => !recommendable && match.teams.away.score >= 1,
					fail: (recommendable: boolean) => recommendable && match.teams.away.score === 0,
					skippedFail: (recommendable: boolean) => !recommendable && match.teams.away.score === 0,
				}
			: {}),
	});
}

function createAnalysisOutputObject({
	id,
	name,
	criteria,
	warnings,
	...rest
}: (
	| (Pick<T_PlayedMatchPrediction, "id" | "name"> & {
			right: (recommendable: boolean) => boolean;
			lostRight: (recommendable: boolean) => boolean;
			fail: (recommendable: boolean) => boolean;
			skippedFail: (recommendable: boolean) => boolean;
	  })
	| Pick<T_NextMatchPrediction, "id" | "name">
) & {
	criteria: (
		| { enabled: boolean; description: string; weight: number; fn: () => boolean }
		| { enabled: boolean; description: string; weight: number; fn: () => boolean }[]
	)[];
	warnings?: { description: string; fn: () => boolean }[];
}): T_Prediction {
	const result = criteria.reduce(
		(result, criteria) => {
			let isCriteriaAchieved;
			let criteriaWeight;

			if (v.isNotEmptyArray(criteria)) {
				criteriaWeight = criteria[0].weight;
				isCriteriaAchieved = criteria.reduce((multipleCriteriaAchieved, subcriteria) => {
					const subcriteriaAchieved = subcriteria.fn();

					result.criteria.push({
						description: subcriteria.description,
						check: subcriteriaAchieved ? "✅" : "❌",
						weight: subcriteria.weight,
					});

					return subcriteriaAchieved || multipleCriteriaAchieved;
				}, false) as boolean;
			} else {
				if (criteria.enabled) {
					criteriaWeight = criteria.weight;
					isCriteriaAchieved = criteria.fn();

					result.criteria.push({
						description: criteria.description,
						check: isCriteriaAchieved ? "✅" : "❌",
						weight: criteria.weight,
					});
				} else {
					criteriaWeight = 0;
					isCriteriaAchieved = false;
				}
			}

			return {
				...result,
				acceptancePercentage:
					result.acceptancePercentage +
					(isCriteriaAchieved && criteriaWeight > 0 ? criteriaWeight : 0),
			};
		},
		{ acceptancePercentage: 0, criteria: [] } as Pick<
			T_Prediction,
			"acceptancePercentage" | "criteria"
		>,
	);

	const MINIMUM_ACCEPTANCE_PERCENTAGE = 0.75;
	const recommendable = result.acceptancePercentage >= MINIMUM_ACCEPTANCE_PERCENTAGE;

	if ("right" in rest) {
		return {
			id,
			name,
			recommendable,
			acceptancePercentage: Number(Number(result.acceptancePercentage).toFixed(2)),
			criteria: result.criteria,
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
		acceptancePercentage: Number(Number(result.acceptancePercentage).toFixed(2)),
		criteria: result.criteria,
		warnings: getWarnings(warnings),
	};
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

function wonOrTiedLastGames({
	teamId,
	teamPlayedMatches,
	side,
	lastGames,
}: {
	teamId: number;
	teamPlayedMatches: T_PlayedMatch[];
	side: "home" | "away";
	lastGames: number;
}) {
	const filteredMatches = filterTeamPlayedMatches({
		teamId,
		playedMatches: teamPlayedMatches,
		side,
		lastGames,
	})
		.slice(0, lastGames)
		.filter((match) => {
			return match.teams[side].winner !== false;
		});

	return filteredMatches.length === lastGames;
}

function scoredLastGames({
	teamId,
	teamPlayedMatches,
	side,
	lastGames,
}: {
	teamId: number;
	teamPlayedMatches: T_PlayedMatch[];
	side: "home" | "away";
	lastGames: number;
}) {
	const filteredMatches = filterTeamPlayedMatches({
		teamId,
		playedMatches: teamPlayedMatches,
		side,
		lastGames,
	})
		.slice(0, lastGames)
		.filter((match) => {
			return match.teams[side].score > 0;
		});

	return filteredMatches.length === lastGames;
}

function compareTeamsPositions({
	homeTeam,
	awayTeam,
	leagueStandings,
	difference,
}: {
	homeTeam: T_Team;
	awayTeam: T_Team;
	leagueStandings: T_LeagueStandings;
	difference: number;
}) {
	const homeTeamPosition = getTeamPosition(homeTeam.id, leagueStandings);
	const awayTeamPosition = getTeamPosition(awayTeam.id, leagueStandings);

	if (homeTeamPosition === null || awayTeamPosition === null) {
		console.log(
			"      COMPARE_TEAMS_POSITIONS:",
			"Team not found in its league standings",
			homeTeam.name,
			homeTeamPosition,
			awayTeam.name,
			awayTeamPosition,
		);
		return false;
	}

	return (
		homeTeamPosition < awayTeamPosition &&
		Math.abs(homeTeamPosition - awayTeamPosition) >= difference
	);
}
