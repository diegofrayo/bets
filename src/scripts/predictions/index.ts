import "dotenv/config";
import launchAnalysis from "./analysis";

launchAnalysis({
	// date: "today",
	date: "2024-07-21T00:00:00",

	exact: true,
	enableRemoteAPI: false,

	// leaguesFixturesDates: {
	// 	from: "2024-07-01",
	// 	to: "2024-07-31",
	// },
});
