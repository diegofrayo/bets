import "dotenv/config";
import launchAnalysis from "./analysis";

launchAnalysis({
	date: "today",
	// date: "2024-05-19T00:00:00",

	exact: true,
	enableRemoteAPI: false,

	// leaguesFixturesDates: {
	// 	from: "2024-07-01",
	// 	to: "2024-07-31",
	// },
});
