import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	// config: "SPECIFIC_DATE",
	// date: "yesterday",
	// enableRemoteAPI: true,

	// Config 2
	config: "OFFLINE_REBUILDING",
	date: "2024-08-05",
	previousDays: 7,
	updatePredictionStats: false,

	// Config 3
	// config: "LEAGUES_FIXTURES_UPDATE",
	// leaguesFixturesDates: {
	// 	from: "2024-08-05",
	// 	to: "2024-08-11",
	// 	ids: [],
	// },

	// Config 4
	// config: "LEAGUES_STANDINGS_UPDATE",
	// leagues: [],
	// enableRemoteAPI: false,
});
