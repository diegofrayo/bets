import v from "../../../../@diegofrayo/v";
import {
	analizeCriteria,
	createMarketPredictionOutput,
	getLeagueStandingsLimits,
	getTeamPoints,
	getTeamPosition,
	isMatchInLocalLeague,
	type T_PredictionsInput,
} from "./utils";

function doubleOpportunityPrediction(predictionsInput: T_PredictionsInput) {
	const criteria = [
		isMatchInLocalLeague(predictionsInput.match, predictionsInput.leagueStandings)
			? {
					description:
						"Criterios mas confiables para el local como favorito en un partido de liga local",
					trustLevel: 100,
					items: [
						{
							description: "El local debe estar en los primeros lugares de la tabla",
							fn: ({ homeTeam }: T_PredictionsInput) => {
								const LIMITS = getLeagueStandingsLimits(predictionsInput.leagueStandings);
								const teamPosition =
									getTeamPosition(homeTeam.id, predictionsInput.leagueStandings) || 0;

								return {
									fulfilled: teamPosition >= 1 && teamPosition <= LIMITS.best,
									successExplanation: `El local está entre los primeros ${LIMITS.best} puestos de la tabla | (${teamPosition}/${predictionsInput.leagueStandings.items.length})`,
									failExplanation: `El local está fuera de los primeros ${LIMITS.best} puestos de la tabla | (${teamPosition}/${predictionsInput.leagueStandings.items.length})`,
								};
							},
						},
						{
							description:
								"El local debe haber sumado al menos 10 de 15 puntos en los ultimos 5 partidos",
							fn: ({ homeTeam }: T_PredictionsInput) => {
								const LIMITS = { min: 10, max: 15, games: 5 };
								const homeTeamPoints = getTeamPoints(homeTeam);

								return {
									fulfilled: homeTeamPoints >= LIMITS.min,
									successExplanation: `El local sumó mas de ${LIMITS.min} puntos en los ultimos ${LIMITS.games} partidos | (${homeTeamPoints}/${LIMITS.max})`,
									failExplanation: `El local sumó menos de ${LIMITS.min} puntos en los ultimos ${LIMITS.games} partidos | (${homeTeamPoints}/${LIMITS.max})`,
								};
							},
						},
						{
							description:
								"El visitante debe haber sumado menos de 4 puntos en los ultimos 5 partidos",
							fn: ({ awayTeam }: T_PredictionsInput) => {
								const LIMITS = { min: 4, max: 15, games: 5 };
								const awayTeamPoints = getTeamPoints(awayTeam);

								return {
									fulfilled: awayTeamPoints <= LIMITS.min,
									successExplanation: `El visitante sumó menos de ${LIMITS.min} puntos en los ultimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
									failExplanation: `El visitante sumó mas de ${LIMITS.min} puntos en los ultimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
								};
							},
						},
					],
				}
			: {
					description:
						"Criterios mas confiables para el local como favorito en un partido de copa local o internacional",
					trustLevel: 100,
					items: [
						{
							description:
								"El local debe haber sumado al menos 10 de 15 puntos en los ultimos 5 partidos",
							fn: ({ homeTeam }: T_PredictionsInput) => {
								const LIMITS = { min: 10, max: 15, games: 5 };
								const homeTeamPoints = getTeamPoints(homeTeam);

								return {
									fulfilled: homeTeamPoints >= LIMITS.min,
									successExplanation: `El local sumó mas de ${LIMITS.min} puntos en los ultimos ${LIMITS.games} partidos | (${homeTeamPoints}/${LIMITS.max})`,
									failExplanation: `El local sumó menos de ${LIMITS.min} puntos en los ultimos ${LIMITS.games} partidos | (${homeTeamPoints}/${LIMITS.max})`,
								};
							},
						},
						{
							description:
								"El visitante debe haber sumado menos de 4 puntos en los ultimos 5 partidos",
							fn: ({ awayTeam }: T_PredictionsInput) => {
								const LIMITS = { min: 4, max: 15, games: 5 };
								const awayTeamPoints = getTeamPoints(awayTeam);

								return {
									fulfilled: awayTeamPoints <= LIMITS.min,
									successExplanation: `El visitante sumó menos de ${LIMITS.min} puntos en los ultimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
									failExplanation: `El visitante sumó mas de ${LIMITS.min} puntos en los ultimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
								};
							},
						},
					],
				},
	].filter(v.isNotNil);

	return createMarketPredictionOutput({
		id: "tr-local",
		name: "Tiempo reglamentario (Local)",
		shortName: "TRL",
		criteria: analizeCriteria(criteria, predictionsInput),
		predictionsInput,
		results: predictionsInput.match.played
			? {
					winning: (trustLevel, predictionsInput_) => {
						return trustLevel === "HIGH" && predictionsInput_.match.teams.home.result === "WIN";
					},
					lostWinning: (trustLevel, predictionsInput_) => {
						return trustLevel !== "HIGH" && predictionsInput_.match.teams.home.result === "WIN";
					},
					lost: (trustLevel, predictionsInput_) => {
						return trustLevel === "HIGH" && predictionsInput_.match.teams.home.result !== "WIN";
					},
					skippedLost: (trustLevel, predictionsInput_) => {
						return trustLevel === "LOW" && predictionsInput_.match.teams.home.result !== "WIN";
					},
				}
			: undefined,
	});
}

export default doubleOpportunityPrediction;
