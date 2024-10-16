import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	// config: "SPECIFIC_DATE",
	// date: "2024-10-14",
	// enableRemoteAPI: {
	// 	FIXTURE_MATCHES: true,
	// 	PLAYED_MATCHES: true,
	// 	LEAGUE_STANDINGS: true,
	// },

	// Config 2
	config: "OFFLINE_REBUILDING",
	date: "2024-10-14",
	previousDays: 77,
	updateAnalysisStats: true,

	// Config 3
	// config: "LEAGUES_FIXTURES_UPDATE",
	// leaguesFixturesDates: {
	// 	from: "2024-10-14",
	// 	to: "2024-10-17",
	// 	ids: [],
	// },

	// Config 4
	// config: "LEAGUES_STANDINGS_UPDATE",
	// leagues: [],
	// enableRemoteAPI: false,
});
