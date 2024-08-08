import dayjs from "dayjs";

import type DR from "../../../@diegofrayo/types";
import { createArray, omit, pick } from "../../../@diegofrayo/utils/arrays-and-objects";
import { copyFile, writeFile } from "../../../@diegofrayo/utils/files";
import { asyncLoop, getErrorMessage } from "../../../@diegofrayo/utils/misc";

import APIClient from "./api-client";
import DataClient from "./data-client";
import { formatCode, formatDate } from "./utils";
import type { T_DayOfMatches, T_FixtureNextMatchTeam, T_FixturePlayedMatchTeam } from "./types";

export default async function main(config: T_AnalysisConfig) {
	copySharedTypesFile();
	await APIClient.calculateUsageStats();

	if (config.config === "LEAGUES_FIXTURES_UPDATE") {
		await DataClient.updateLeaguesFixtures(config.leaguesFixturesDates);
		return;
	}

	if (config.config === "LEAGUES_STANDINGS_UPDATE") {
		await DataClient.updateLeaguesStandings(config.leagues, config.enableRemoteAPI);
		return;
	}

	// NOTE: For Debug purposes
	// return console.log(generateDates(config));

	const updatePredictionStats =
		"updatePredictionStats" in config && config.updatePredictionStats === true;

	if (updatePredictionStats) {
		DataClient.createEmptyPredictionsStatsFile();
	}

	await asyncLoop(generateDates(config), async (date) => {
		console.log(`Executing script for ${date}`);

		const output: T_DayOfMatches = [];
		const leaguesByDate = DataClient.getLeaguesByDate(date);
		const requestConfig = createRequestConfig(config, date);

		await asyncLoop(leaguesByDate, async (leagueId) => {
			const league = DataClient.getLeagueById(Number(leagueId.split("-")[0]));

			if (!league.enabled) return;

			try {
				console.log(`  Fetching "${league.name} (${league.id}|${league.country.name})" matches...`);

				const leagueStandings = await DataClient.fetchLeagueStandings({
					league,
					fetchFromAPI: requestConfig.fetchFromAPI.LEAGUE_STANDINGS,
					date,
				});
				const fixtureMatches = await DataClient.fetchFixtureMatches({
					league,
					requestConfig,
					leagueStandings,
				});
				const leagueData: T_DayOfMatches[number] = {
					...omit(league, ["enabled", "season"]),
					standings: leagueStandings,
					matches: [],
				};
				await DataClient.updateTeamsFile(fixtureMatches);

				await asyncLoop(fixtureMatches, async (fixtureMatch) => {
					try {
						const homeTeamPlayedMatches = (
							await DataClient.fetchPlayedMatches({
								team: pick(fixtureMatch.teams.home, ["id", "name"]),
								requestConfig,
								league,
								leagueStandings,
							})
						).filter((match) => match.date < fixtureMatch.date);
						const awayTeamPlayedMatches = (
							await DataClient.fetchPlayedMatches({
								team: pick(fixtureMatch.teams.away, ["id", "name"]),
								requestConfig,
								league,
								leagueStandings,
							})
						).filter((match) => match.date < fixtureMatch.date);
						const homeTeamStats = DataClient.getTeamStats(
							fixtureMatch.teams.home.id,
							homeTeamPlayedMatches,
						);
						const awayTeamStats = DataClient.getTeamStats(
							fixtureMatch.teams.away.id,
							awayTeamPlayedMatches,
						);

						if (fixtureMatch.played) {
							const homeTeam: T_FixturePlayedMatchTeam = {
								...fixtureMatch.teams.home,
								stats: homeTeamStats,
								matches: homeTeamPlayedMatches,
							};
							const awayTeam: T_FixturePlayedMatchTeam = {
								...fixtureMatch.teams.away,
								stats: awayTeamStats,
								matches: awayTeamPlayedMatches,
							};

							const predictions = DataClient.getMatchPredictions(
								{
									match: fixtureMatch,
									homeTeam,
									awayTeam,
									homeTeamStats,
									awayTeamStats,
									leagueStandings,
								},
								"FIXTURE_PLAYED_MATCH",
								updatePredictionStats,
							);

							leagueData.matches.push({
								id: fixtureMatch.id,
								type: fixtureMatch.type,
								fullDate: fixtureMatch.fullDate,
								date: fixtureMatch.date,
								hour: fixtureMatch.hour,
								played: fixtureMatch.played,
								teams: {
									home: homeTeam,
									away: awayTeam,
								},
								predictions,
								league,
							});
						} else {
							const homeTeam: T_FixtureNextMatchTeam = {
								...fixtureMatch.teams.home,
								stats: homeTeamStats,
								matches: homeTeamPlayedMatches,
							};
							const awayTeam: T_FixtureNextMatchTeam = {
								...fixtureMatch.teams.away,
								stats: awayTeamStats,
								matches: awayTeamPlayedMatches,
							};
							const predictions = DataClient.getMatchPredictions(
								{
									match: fixtureMatch,
									homeTeam,
									awayTeam,
									homeTeamStats,
									awayTeamStats,
									leagueStandings,
								},
								"FIXTURE_NEXT_MATCH",
								updatePredictionStats,
							);

							leagueData.matches.push({
								id: fixtureMatch.id,
								type: fixtureMatch.type,
								fullDate: fixtureMatch.fullDate,
								date: fixtureMatch.date,
								hour: fixtureMatch.hour,
								played: fixtureMatch.played,
								teams: {
									home: homeTeam,
									away: awayTeam,
								},
								predictions,
								league,
							});
						}
					} catch (error) {
						console.log(getErrorMessage(error));
					}
				});

				if (leagueData.matches.length > 0) {
					output.push(leagueData);
				}
			} catch (error) {
				console.log(getErrorMessage(error));
			}
		});

		writeFile(
			`src/scripts/predictions/data/output/reports/${requestConfig.date}.json`,
			await formatCode(output, "json"),
		);
		copyFile(`src/scripts/predictions/data/output/reports/${requestConfig.date}.json`, {
			outputFolderPath: "src/scripts/predictions/visualization",
			outputFileName: "data.json",
		});
		copyFile(`src/scripts/predictions/data/output/reports/${requestConfig.date}.json`, {
			outputFolderPath: "../website/diegofrayo-frontend/public/data/apps/bets",
			outputFileName: `${requestConfig.date}.json`,
		});
	});
}

// --- UTILS ---

function createRequestConfig(requestConfig: T_AnalysisConfig, formattedDate: DR.Dates.DateString) {
	if (requestConfig.config === "SPECIFIC_DATE") {
		if (requestConfig.date === "yesterday") {
			return {
				date: formattedDate,
				enableRemoteAPI: requestConfig.enableRemoteAPI,
				fetchFromAPI: requestConfig.enableRemoteAPI
					? {
							FIXTURE_MATCHES: true,
							PLAYED_MATCHES: false,
							LEAGUE_STANDINGS: false,
						}
					: {
							FIXTURE_MATCHES: false,
							PLAYED_MATCHES: false,
							LEAGUE_STANDINGS: false,
						},
			};
		}

		if (requestConfig.date === "today") {
			return {
				date: formattedDate,
				enableRemoteAPI: requestConfig.enableRemoteAPI,
				fetchFromAPI: requestConfig.enableRemoteAPI
					? {
							FIXTURE_MATCHES: true,
							PLAYED_MATCHES: true,
							LEAGUE_STANDINGS: true,
						}
					: {
							FIXTURE_MATCHES: false,
							PLAYED_MATCHES: false,
							LEAGUE_STANDINGS: false,
						},
			};
		}

		if (requestConfig.date === "tomorrow") {
			return {
				date: formattedDate,
				enableRemoteAPI: requestConfig.enableRemoteAPI,
				fetchFromAPI: requestConfig.enableRemoteAPI
					? {
							FIXTURE_MATCHES: true,
							PLAYED_MATCHES: true,
							LEAGUE_STANDINGS: true,
						}
					: {
							FIXTURE_MATCHES: false,
							PLAYED_MATCHES: false,
							LEAGUE_STANDINGS: false,
						},
			};
		}

		return {
			date: formattedDate,
			enableRemoteAPI: requestConfig.enableRemoteAPI,
			fetchFromAPI: requestConfig.enableRemoteAPI
				? {
						FIXTURE_MATCHES: true,
						PLAYED_MATCHES: true,
						LEAGUE_STANDINGS: true,
					}
				: {
						FIXTURE_MATCHES: false,
						PLAYED_MATCHES: false,
						LEAGUE_STANDINGS: false,
					},
		};
	}

	return {
		date: formattedDate,
		enableRemoteAPI: false,
		fetchFromAPI: {
			FIXTURE_MATCHES: false,
			PLAYED_MATCHES: false,
			LEAGUE_STANDINGS: false,
		},
	};
}

function generateDates(config: T_AnalysisConfig): DR.Dates.DateString[] {
	if (config.config === "SPECIFIC_DATE") {
		if (config.date === "today") {
			return [formatDate(dayjs().toDate())];
		}

		if (config.date === "yesterday") {
			return [formatDate(dayjs().subtract(1, "day").toDate())];
		}

		if (config.date === "tomorrow") {
			return [formatDate(dayjs().add(1, "day").toDate())];
		}

		return [config.date];
	}

	if (config.config === "OFFLINE_REBUILDING") {
		const baseDate = dayjs(config.date);

		return [baseDate]
			.concat(createArray(config.previousDays).map((day) => baseDate.subtract(day, "day")))
			.map((date) => formatDate(date.toDate()))
			.reverse();
	}

	return [];
}

function copySharedTypesFile() {
	copyFile(`src/scripts/predictions/analysis/types/shared.ts`, {
		outputFolderPath: "../website/diegofrayo-frontend/src/modules/pages/apps/pages/BetsPage",
		outputFileName: "types.ts",
	});
}

// --- TYPES ---

type T_AnalysisConfig =
	| {
			config: "SPECIFIC_DATE";
			date: "today" | "tomorrow" | "yesterday" | DR.Dates.DateString;
			enableRemoteAPI: boolean;
	  }
	| {
			config: "OFFLINE_REBUILDING";
			date: DR.Dates.DateString;
			previousDays: number;
			updatePredictionStats: boolean;
	  }
	| {
			config: "LEAGUES_FIXTURES_UPDATE";
			leaguesFixturesDates: {
				from: DR.Dates.DateString<"DATE">;
				to?: DR.Dates.DateString<"DATE">;
				ids: Array<number>;
			};
	  }
	| {
			config: "LEAGUES_STANDINGS_UPDATE";
			leagues: Array<string>;
			enableRemoteAPI: boolean;
	  };

/*
JUST IN CASE

const today = formatDate(new Date());
else if (date > today) {
  const leagueStandingFolderName = `src/scripts/predictions/data/output/standings/${composeLeagueName(league.id)}`;
  const lastStandingsFileFetched = readFolderFiles(leagueStandingFolderName).reverse()[0];

  if (lastStandingsFileFetched) {
    // copyFile(`${leagueStandingFolderName}/${lastStandingsFileFetched.name}`, {
    // 	outputFolderPath: leagueStandingFolderName,
    // 	outputFileName: `${outputFileName}.json`,
    // });
  }
}

	{
			description: "Criterios mas confiables para el visitante como favorito",
			trustLevel: 100,
			items: [
				{
					description: "El visitante debe estar entre los primeros 5 lugares de la tabla",
					fn: ({ awayTeam }: T_PredictionsInput) => {
						const LIMIT = 5;
						const teamPosition =
							getTeamPosition(awayTeam.id, predictionsInput.leagueStandings) || 0;

						return {
							fulfilled: teamPosition >= 1 && teamPosition <= LIMIT,
							successExplanation: `El visitante está entre los primeros ${LIMIT} puestos de la tabla`,
							failExplanation: `El visitante está fuera de los primeros ${LIMIT} puestos de la tabla`,
						};
					},
				},
				{
					description:
						"El visitante debe haber sumado al menos 10 de 15 puntos en los ultimos 5 partidos",
					fn: ({ awayTeam }: T_PredictionsInput) => {
						const LIMITS = { min: 10, max: 15, games: 5 };
						const awayTeamPoints = getTeamPoints(awayTeam);

						return {
							fulfilled: awayTeamPoints >= LIMITS.min,
							successExplanation: `El visitante sumó ${awayTeamPoints} de ${LIMITS.max} en los ultimos ${LIMITS.games} partidos`,
							failExplanation: `El visitante sumó menos de ${LIMITS.min} en los ultimos ${LIMITS.games} partidos`,
						};
					},
				},
				{
					description: "El local debe haber sumado 4 o menos puntos en los ultimos 5 partidos",
					fn: ({ homeTeam }: T_PredictionsInput) => {
						const LIMITS = { min: 4, max: 15, games: 5 };
						const homeTeamPoints = getTeamPoints(homeTeam);

						return {
							fulfilled: homeTeamPoints <= LIMITS.min,
							successExplanation: `El local sumó ${homeTeamPoints} de ${LIMITS.max} en los ultimos ${LIMITS.games} partidos`,
							failExplanation: `El local sumó mas de ${LIMITS.min} en los ultimos ${LIMITS.games} partidos`,
						};
					},
				},
			],
		},
*/
