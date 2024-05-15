import dayjs from "dayjs";

import { copyFile, writeFile } from "../../@diegofrayo/utils/files";
import { delay } from "../../@diegofrayo/utils/misc";

import { calculateAPIUsageStats } from "./api-client";
import DataClient from "./data-client";
import { formatCode, formatDate } from "./utils";
import type {
	T_NextMatchPrediction,
	T_NextMatchTeam,
	T_Output,
	T_PlayedMatchPrediction,
	T_PlayedMatchTeam,
	T_RequestConfig,
} from "./types";

async function main() {
	await calculateAPIUsageStats();
	// await DataClient.updateLeaguesFixtures();
	// await delay(1000 * 60 * 5);

	let requestsCounter = 0;
	const dates = generateDates(
		// { date: "2024-05-17T00:00:00", exact: true },
		"today",
	);

	for (const date of dates) {
		console.log(`Executing script for ${date}`);

		const output = [] as T_Output;
		const leaguesByDate = DataClient.getLeaguesByDate(date);
		const requestConfig = createRequestConfig(
			{ date },
			{
				enableRemoteAPI: false,
			},
		);
		let leagueIndex = 0;

		for (const leagueId of leaguesByDate) {
			const league = DataClient.getLeagueById(leagueId);

			if (!league.enabled) continue;

			try {
				console.log(
					`  Fetching "${league.name} (${league.id}|${league.country})" matches... | Requests counter: ${requestsCounter}`,
				);

				requestsCounter = await checkForAPILimits({
					requestsCounter,
					nextRequests: 1 + 1,
					requestConfig,
				});

				const leagueStandings = await DataClient.fetchLeagueStandings(league, requestConfig);
				const fixtureMatches = await DataClient.fetchFixtureMatches({
					league,
					requestConfig,
					leagueStandings,
				});
				await DataClient.updateTeamsFile(fixtureMatches);

				output.push({
					name: league.name,
					country: league.country,
					flag: league.flag,
					standings: leagueStandings,
					matches: [],
				});

				requestsCounter = await checkForAPILimits({
					requestsCounter,
					nextRequests: fixtureMatches.length * 2,
					requestConfig,
				});

				for (const fixtureMatch of fixtureMatches) {
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
						const homeTeamStats = DataClient.getTeamStats(
							homeTeam.id,
							homeTeamPlayedMatches,
							leagueStandings,
						);
						const awayTeamStats = DataClient.getTeamStats(
							awayTeam.id,
							awayTeamPlayedMatches,
							leagueStandings,
						);
						const predictions = DataClient.getMatchPredictions({
							match: fixtureMatch,
							homeTeam,
							awayTeam,
							homeTeamPlayedMatches,
							homeTeamStats,
							awayTeamStats,
							leagueStandings,
						});
						const fixtureMatchTeams = {
							home: {
								...homeTeam,
								stats: homeTeamStats,
								matches: homeTeamPlayedMatches,
							},
							away: {
								...awayTeam,
								stats: awayTeamStats,
								matches: awayTeamPlayedMatches,
							},
						};

						if (fixtureMatch.played) {
							output[leagueIndex].matches.push({
								id: fixtureMatch.id,
								fullDate: fixtureMatch.fullDate,
								date: fixtureMatch.date,
								hour: fixtureMatch.hour,
								played: fixtureMatch.played,
								predictions: predictions as T_PlayedMatchPrediction[],
								teams: {
									home: fixtureMatchTeams.home as T_PlayedMatchTeam,
									away: fixtureMatchTeams.away as T_PlayedMatchTeam,
								},
							});
						} else {
							output[leagueIndex].matches.push({
								id: fixtureMatch.id,
								fullDate: fixtureMatch.fullDate,
								date: fixtureMatch.date,
								hour: fixtureMatch.hour,
								played: fixtureMatch.played,
								predictions: predictions as T_NextMatchPrediction[],
								teams: {
									home: fixtureMatchTeams.home as T_NextMatchTeam,
									away: fixtureMatchTeams.away as T_NextMatchTeam,
								},
							});
						}
					} catch (error) {
						console.log(error);
					}
				}
			} catch (error) {
				console.log(error);
			}

			leagueIndex += 1;
		}

		writeFile(
			`src/scripts/predictions/data/processed/reports/${requestConfig.date}.json`,
			await formatCode(output, "json"),
		);
		copyFile(`src/scripts/predictions/data/processed/reports/${requestConfig.date}.json`, {
			outputFolderPath: "src/scripts/predictions/visualization",
			outputFileName: "data.json",
		});
		copyFile(`src/scripts/predictions/data/processed/reports/${requestConfig.date}.json`, {
			outputFolderPath: "../website/diegofrayo-frontend/src/data/apps/bets",
			outputFileName: `${requestConfig.date}.json`,
		});
	}
}

main();

// --- UTILS ---

function createRequestConfig(
	requestConfig: "today" | "tomorrow" | "yesterday" | { date: string },
	{ enableRemoteAPI }: { enableRemoteAPI: boolean },
) {
	if (requestConfig === "yesterday") {
		return {
			date: formatDate(dayjs().subtract(1, "day").toDate()),
			enableRemoteAPI,
			fetchFromAPI: enableRemoteAPI
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

	if (requestConfig === "today") {
		return {
			date: formatDate(dayjs().toDate()),
			enableRemoteAPI,
			fetchFromAPI: enableRemoteAPI
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

	if (requestConfig === "tomorrow") {
		return {
			date: formatDate(dayjs().add(1, "day").toDate()),
			enableRemoteAPI,
			fetchFromAPI: enableRemoteAPI
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
		date: requestConfig.date,
		enableRemoteAPI,
		fetchFromAPI: enableRemoteAPI
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
	config: "today" | "tomorrow" | "yesterday" | { date: string; exact: boolean },
) {
	if (config === "yesterday") {
		return [formatDate(dayjs().subtract(1, "day").toDate())];
	}

	if (config === "today") {
		return [formatDate(dayjs().toDate())];
	}

	if (config === "tomorrow") {
		return [formatDate(dayjs().add(1, "day").toDate())];
	}

	const baseDate = dayjs(new Date(config.date));

	return (
		config.exact
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

async function checkForAPILimits({
	requestsCounter,
	nextRequests,
	requestConfig,
}: {
	requestsCounter: number;
	nextRequests: number;
	requestConfig: T_RequestConfig;
}) {
	const REQUESTS_LIMIT = 25;

	if (requestsCounter + nextRequests >= REQUESTS_LIMIT && requestConfig.enableRemoteAPI) {
		console.log(
			"    .....",
			"Delay for 1 minute |",
			`Requests counter: ${requestsCounter + nextRequests} |`,
			new Date().toISOString(),
			".....",
		);

		await delay(1000 * 60); // 1 minute

		console.log(
			"    .....",
			"Script execution continues again |",
			`Requests counter: ${nextRequests} |`,
			new Date().toISOString(),
			".....",
		);

		return nextRequests;
	}

	return requestsCounter + nextRequests;
}
