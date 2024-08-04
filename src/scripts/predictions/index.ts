import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	// config: "SPECIFIC_DATE",
	// date: "2024-08-03",
	// enableRemoteAPI: false,

	// Config 2
	config: "OFFLINE_REBUILDING",
	date: "2024-08-03",
	previousDays: 5,

	// Config 3
	// config: "LEAGUES_FIXTURES_UPDATE",
	// leaguesFixturesDates: {
	// 	from: "2024-07-29",
	// 	to: "2024-08-04",
	// 	ids: [],
	// },

	// Config 4
	// config: "LEAGUES_STANDINGS_UPDATE",
	// leagueStandings: [{ id: 233, season: 2023 }],
});
