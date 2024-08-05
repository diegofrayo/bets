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

				await asyncLoop(fixtureMatches, async (fixtureMatch) => {
					try {
						const homeTeamPlayedMatches = await DataClient.fetchPlayedMatches({
							team: pick(fixtureMatch.teams.home, ["id", "name"]),
							requestConfig,
							league,
							leagueStandings,
						});
						const awayTeamPlayedMatches = await DataClient.fetchPlayedMatches({
							team: pick(fixtureMatch.teams.away, ["id", "name"]),
							requestConfig,
							league,
							leagueStandings,
						});
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
							LEAGUE_STANDINGS: false,
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
				to: DR.Dates.DateString<"DATE">;
				ids: Array<number>;
			};
	  }
	| {
			config: "LEAGUES_STANDINGS_UPDATE";
			leagues: Array<string>;
			enableRemoteAPI: boolean;
	  };
