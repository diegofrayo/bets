import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	config: "SPECIFIC_DATE",
	date: "2024-11-24",
	enableRemoteAPI: {
		FIXTURE_MATCHES: true,
		PLAYED_MATCHES: true,
		LEAGUE_STANDINGS: true,
	},

	// Config 2
	// config: "OFFLINE_REBUILDING",
	// date: "2024-11-14",
	// previousDays: 108,
	// updateAnalysisStats: true,

	// Config 3
	// config: "LEAGUES_FIXTURES_UPDATE",
	// leaguesFixturesDates: {
	// 	from: "2024-11-22",
	// 	to: "2024-11-24",
	// 	ids: [],
	// },

	// Config 4
	// config: "LEAGUES_STANDINGS_UPDATE",
	// leagues: [],
	// enableRemoteAPI: false,
});
