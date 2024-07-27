import dayjs from "dayjs";

import { createArray, omit, pick } from "../../../@diegofrayo/utils/arrays-and-objects";
import { copyFile, writeFile } from "../../../@diegofrayo/utils/files";
import { asyncLoop } from "../../../@diegofrayo/utils/misc";

import APIClient from "./api-client";
import DataClient from "./data-client";
import { formatCode, formatDate } from "./utils";
import type {
	T_DayOfMatches,
	T_FixtureNextMatchTeam,
	T_FixturePlayedMatchTeam,
	T_League,
} from "./types";

type T_PredictionConfig =
	| {
			date: Exclude<string, "today" | "tomorrow" | "yesterday">;
			enableRemoteAPI: boolean;
			previousDays: number;

			leaguesFixturesDates?: never;
			leagueStandings?: never;
	  }
	| {
			date: "today" | "tomorrow" | "yesterday";
			enableRemoteAPI: boolean;

			leaguesFixturesDates?: never;
			leagueStandings?: never;
	  }
	| {
			leaguesFixturesDates: { from: string; to: string; ids: Array<number> };

			date?: never;
			enableRemoteAPI?: never;
			previousDays?: never;
			leagueStandings?: never;
	  }
	| {
			leagueStandings: Array<Pick<T_League, "id" | "season">>;

			date?: never;
			enableRemoteAPI?: never;
			previousDays?: never;
			leaguesFixturesDates?: never;
	  };

export default async function main(config: T_PredictionConfig) {
	await APIClient.calculateUsageStats();

	if ("leaguesFixturesDates" in config) {
		await DataClient.updateLeaguesFixtures(config.leaguesFixturesDates);
		return;
	}

	if ("leagueStandings" in config) {
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
								{ match: fixtureMatch, homeTeam, awayTeam, homeTeamStats, awayTeamStats },
								"FIXTURE_PLAYED_MATCH",
							);

							leagueData.matches.push({
								id: fixtureMatch.id,
								fullDate: fixtureMatch.fullDate,
								date: fixtureMatch.date,
								hour: fixtureMatch.hour,
								played: fixtureMatch.played,
								teams: {
									home: homeTeam,
									away: awayTeam,
								},
								predictions,
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
								{ match: fixtureMatch, homeTeam, awayTeam, homeTeamStats, awayTeamStats },
								"FIXTURE_NEXT_MATCH",
							);

							leagueData.matches.push({
								id: fixtureMatch.id,
								fullDate: fixtureMatch.fullDate,
								date: fixtureMatch.date,
								hour: fixtureMatch.hour,
								played: fixtureMatch.played,
								teams: {
									home: homeTeam,
									away: awayTeam,
								},
								predictions,
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

// --- UTILS ---

function createRequestConfig(
	requestConfig: { date: string; enableRemoteAPI: boolean },
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
	config: { date: "today" | "tomorrow" | "yesterday" } | { date: string; previousDays: number },
) {
	if ("previousDays" in config) {
		const baseDate = dayjs(new Date(config.date));

		return [baseDate]
			.concat(createArray(config.previousDays).map((day) => baseDate.subtract(day, "day")))
			.map((date) => formatDate(date.toDate()));
	}

	if (config.date === "today") {
		return [formatDate(dayjs().toDate())];
	}

	if (config.date === "yesterday") {
		return [formatDate(dayjs().subtract(1, "day").toDate())];
	}

	return [formatDate(dayjs().add(1, "day").toDate())];
}
