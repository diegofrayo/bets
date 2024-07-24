import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	// Config 1
	// date: "yesterday",
	// enableRemoteAPI: true,

	// Config 2
	date: "2024-07-24T00:00:00",
	previousDays: 3,
	enableRemoteAPI: false,

	// Config 3
	// leaguesFixturesDates: {
	// 	from: "2024-07-22",
	// 	to: "2024-07-28",
	// 	ids: [],
	// },

	// Config 4
	// leagueStandings: [{ id: 239, season: 2024 }],
});
