import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	// config: "SPECIFIC_DATE",
	// date: "2024-09-25",
	// enableRemoteAPI: {
	// 	FIXTURE_MATCHES: true,
	// 	PLAYED_MATCHES: false,
	// 	LEAGUE_STANDINGS: false,
	// },

	// Config 2
	config: "OFFLINE_REBUILDING",
	date: "2024-09-23",
	previousDays: 56,
	updateAnalysisStats: true,

	// Config 3
	// config: "LEAGUES_FIXTURES_UPDATE",
	// leaguesFixturesDates: {
	// 	from: "2024-09-23",
	// 	to: "2024-09-26",
	// 	ids: [],
	// },

	// Config 4
	// config: "LEAGUES_STANDINGS_UPDATE",
	// leagues: [],
	// enableRemoteAPI: false,
});
