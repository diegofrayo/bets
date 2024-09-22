import v from "../../../../@diegofrayo/v";
import {
	analizeStrategies,
	createMarketAnalysisOutput,
	isMatchInLocalLeague,
	type T_AnalysisInput,
} from "./utils";

function bothScoresAnalysis(analysisInput: T_AnalysisInput) {
	const strategies = isMatchInLocalLeague(analysisInput.leagueStandings)
		? analysisInput.leagueStandings.stats.partidos_jugados >= 3
			? [
					{
						id: "1425c9f3-34d5-411a-a303-da09ddc1c7b7",
						description: "Criterios mas confiables",
						confidenceLevel: 100,
						criteria: [
							{
								description: "El local tiene un promedio de gol como local >=1.5",
								fn: ({ homeTeamStats }: T_AnalysisInput) => {
									return {
										fulfilled:
											homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados >= 1.5,
										successExplanation: `El local tienen un promedio de gol como local >=1.5 | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
										failExplanation: `El local tienen un promedio de gol como local <1.5 | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
									};
								},
							},
							{
								description: "El visitante tiene un promedio de gol como visitante >=1.5",
								fn: ({ awayTeamStats }: T_AnalysisInput) => {
									return {
										fulfilled:
											awayTeamStats["all-away-matches"].items.promedio_de_goles_anotados >= 1.5,
										successExplanation: `El visitante tienen un promedio de gol como visitante >=1.5 | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_anotados})`,
										failExplanation: `El visitante tienen un promedio de gol como visitante <1.5 | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_anotados})`,
									};
								},
							},
						],
					},
				]
			: []
		: [].filter(v.isNotNil);

	return createMarketAnalysisOutput({
		id: "ambos-marcan",
		name: "Ambos marcan",
		shortName: "AM",
		strategies: analizeStrategies(strategies, analysisInput, {
			winning: (fulfilled, analysisInput_) => {
				return (
					fulfilled &&
					analysisInput_.match.teams.home.score.fullTime > 0 &&
					analysisInput_.match.teams.away.score.fullTime > 0
				);
			},
			lostWinning: (fulfilled, analysisInput_) => {
				return (
					!fulfilled &&
					analysisInput_.match.teams.home.score.fullTime > 0 &&
					analysisInput_.match.teams.away.score.fullTime > 0
				);
			},
			lost: (fulfilled, analysisInput_) => {
				return (
					fulfilled &&
					(analysisInput_.match.teams.home.score.fullTime === 0 ||
						analysisInput_.match.teams.away.score.fullTime === 0)
				);
			},
			skippedLost: (fulfilled, analysisInput_) => {
				return (
					!fulfilled &&
					(analysisInput_.match.teams.home.score.fullTime === 0 ||
						analysisInput_.match.teams.away.score.fullTime === 0)
				);
			},
		}),
	});
}

export default bothScoresAnalysis;
