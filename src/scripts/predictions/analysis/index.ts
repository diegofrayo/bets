import dayjs from "dayjs";

import { omit } from "../../../@diegofrayo/utils/arrays-and-objects";
import { copyFile, writeFile } from "../../../@diegofrayo/utils/files";
import { asyncLoop } from "../../../@diegofrayo/utils/misc";

import APIClient from "./api-client";
import DataClient from "./data-client";
import { formatCode, formatDate } from "./utils";
import type { T_DayOfMatches, T_League, T_NextMatchTeam, T_PlayedMatchTeam } from "./types";

export default async function main(config: T_AnalysisConfig) {
	await APIClient.calculateUsageStats();

	if (config.leaguesFixturesDates) {
		await DataClient.updateLeaguesFixtures(config.leaguesFixturesDates);
		return;
	}

	if (config.leagueStandings) {
		await DataClient.updateLeaguesStandings(config.leagueStandings);
		return;
	}

	await asyncLoop(generateDates(config), async (date) => {
		console.log(`Executing script for ${date}`);

		const output: T_DayOfMatches = [];
		const leaguesByDate = DataClient.getLeaguesByDate(date);
		const requestConfig = createRequestConfig(config, date);

		await asyncLoop(leaguesByDate, async (leagueId) => {
			const league = DataClient.getLeagueById(leagueId);

			if (!league.enabled) return;

			try {
				console.log(`  Fetching "${league.name} (${league.id}|${league.country})" matches...`);

				const leagueStandings = await DataClient.fetchLeagueStandings(
					league,
					requestConfig.fetchFromAPI.LEAGUE_STANDINGS,
				);
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
						const homeTeam = fixtureMatch.teams.home;
						const awayTeam = fixtureMatch.teams.away;
						const homeTeamPlayedMatches = await DataClient.fetchPlayedMatches({
							team: homeTeam,
							requestConfig,
							league,
							leagueStandings,
						});
						const awayTeamPlayedMatches = await DataClient.fetchPlayedMatches({
							team: awayTeam,
							requestConfig,
							league,
							leagueStandings,
						});
						const homeTeamStats = DataClient.getTeamStats(homeTeam.id, homeTeamPlayedMatches);
						const awayTeamStats = DataClient.getTeamStats(awayTeam.id, awayTeamPlayedMatches);
						// const predictions = DataClient.getMatchPredictions({
						// 	match: fixtureMatch,
						// 	homeTeam,
						// 	awayTeam,
						// 	homeTeamPlayedMatches,
						// 	homeTeamStats,
						// 	awayTeamStats,
						// 	leagueStandings,
						// });

						// TODO: Try to improve this types definitions, avoid use as
						if (fixtureMatch.played) {
							leagueData.matches.push({
								id: fixtureMatch.id,
								fullDate: fixtureMatch.fullDate,
								date: fixtureMatch.date,
								hour: fixtureMatch.hour,
								played: fixtureMatch.played,
								teams: {
									home: {
										...(homeTeam as T_PlayedMatchTeam),
										stats: homeTeamStats,
										matches: homeTeamPlayedMatches,
									},
									away: {
										...(awayTeam as T_PlayedMatchTeam),
										stats: awayTeamStats,
										matches: awayTeamPlayedMatches,
									},
								},
								// predictions: predictions as T_PlayedMatchPrediction[],
							});
						} else {
							leagueData.matches.push({
								id: fixtureMatch.id,
								fullDate: fixtureMatch.fullDate,
								date: fixtureMatch.date,
								hour: fixtureMatch.hour,
								played: fixtureMatch.played,
								teams: {
									home: {
										...(homeTeam as T_NextMatchTeam),
										stats: homeTeamStats,
										matches: homeTeamPlayedMatches,
									},
									away: {
										...(awayTeam as T_NextMatchTeam),
										stats: awayTeamStats,
										matches: awayTeamPlayedMatches,
									},
								},
								// predictions: predictions as T_NextMatchPrediction[],
							});
						}
					} catch (error) {
						console.log(error);
					}
				});

				if (leagueData.matches.length > 0) {
					output.push(leagueData);
				}
			} catch (error) {
				console.log(error);
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
		copyFile(`src/scripts/predictions/analysis/types/shared.ts`, {
			outputFolderPath: "../website/diegofrayo-frontend/src/modules/pages/apps/pages/BetsPage",
			outputFileName: "types.ts",
		});
	});
}

type T_AnalysisConfig = {
	date: "today" | "tomorrow" | "yesterday" | string;
	exact: boolean;
	enableRemoteAPI: boolean;
	leaguesFixturesDates?: { from: string; to: string };
	leagueStandings?: Array<Pick<T_League, "id" | "season">>;
};

// --- UTILS ---

function createRequestConfig(
	requestConfig: Pick<T_AnalysisConfig, "date" | "enableRemoteAPI">,
	formattedDate: string,
) {
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

function generateDates(
	config: { date: "today" | "tomorrow" | "yesterday" } | { date: string; exact: boolean },
) {
	if (config.date === "yesterday") {
		return [formatDate(dayjs().subtract(1, "day").toDate())];
	}

	if (config.date === "today") {
		return [formatDate(dayjs().toDate())];
	}

	if (config.date === "tomorrow") {
		return [formatDate(dayjs().add(1, "day").toDate())];
	}

	const baseDate = dayjs(new Date(config.date));

	return (
		"exact" in config && config.exact === true
			? [baseDate]
			: [
					baseDate,
					baseDate.subtract(1, "day"),
					baseDate.subtract(2, "day"),
					baseDate.subtract(3, "day"),
					baseDate.subtract(4, "day"),
					baseDate.subtract(5, "day"),
					baseDate.subtract(6, "day"),
					baseDate.add(1, "day"),
					baseDate.add(2, "day"),
					baseDate.add(3, "day"),
					baseDate.add(4, "day"),
					baseDate.add(5, "day"),
					baseDate.add(6, "day"),
				]
	).map((date) => formatDate(date.toDate()));
}
