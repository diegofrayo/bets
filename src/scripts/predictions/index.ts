import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	// config: "SPECIFIC_DATE",
	// date: "2024-10-01",
	// enableRemoteAPI: {
	// 	FIXTURE_MATCHES: true,
	// 	PLAYED_MATCHES: true,
	// 	LEAGUE_STANDINGS: true,
	// },

	// Config 2
	config: "OFFLINE_REBUILDING",
	date: "2024-09-30",
	previousDays: 63,
	updateAnalysisStats: true,

	// Config 3
	// config: "LEAGUES_FIXTURES_UPDATE",
	// leaguesFixturesDates: {
	// 	from: "2024-09-30",
	// 	to: "2024-10-03",
	// 	ids: [],
	// },

	// Config 4
	// config: "LEAGUES_STANDINGS_UPDATE",
	// leagues: [],
	// enableRemoteAPI: false,
});
