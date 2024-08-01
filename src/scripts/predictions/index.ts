import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	date: "today",
	enableRemoteAPI: false,

	// Config 2
	// date: "2024-08-01T00:00:00",
	// previousDays: 5,
	// enableRemoteAPI: false,

	// Config 3
	// leaguesFixturesDates: {
	// 	from: "2024-07-29",
	// 	to: "2024-08-04",
	// 	ids: [],
	// },

	// Config 4
	// leagueStandings: [{ id: 233, season: 2023 }],
});
