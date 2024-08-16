import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	// config: "SPECIFIC_DATE",
	// date: "tomorrow",
	// enableRemoteAPI: true,

	// Config 2
	config: "OFFLINE_REBUILDING",
	date: "2024-08-16",
	previousDays: 18,
	updatePredictionStats: true,

	// Config 3
	// config: "LEAGUES_FIXTURES_UPDATE",
	// leaguesFixturesDates: {
	// 	from: "2024-08-12",
	// 	to: "2024-08-18",
	// 	ids: [],
	// },

	// Config 4
	// config: "LEAGUES_STANDINGS_UPDATE",
	// leagues: [],
	// enableRemoteAPI: false,
});
