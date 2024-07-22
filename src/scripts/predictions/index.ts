import "dotenv/config";
import launchAnalysis from "./analysis";

// npm run script:predictions
launchAnalysis({
	date: "yesterday",
	// date: "2024-07-22T00:00:00",

	exact: true,
	enableRemoteAPI: false,

	// leaguesFixturesDates: {
	// 	from: "2024-07-01",
	// 	to: "2024-07-31",
	// },
	// leagueStandings: [{ id: 239, season: 2024 }],
});
