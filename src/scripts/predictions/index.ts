import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	date: "today",
	enableRemoteAPI: false,

	// Config 2
	// date: "2024-07-24T00:00:00",
	// previousDays: 3,
	// enableRemoteAPI: false,

	// Config 3
	// leaguesFixturesDates: {
	// 	from: "2024-07-01",
	// 	to: "2024-07-31",
	// },

	// Config 4
	// leagueStandings: [{ id: 239, season: 2024 }],
});
