import v from "../../../../@diegofrayo/v";
import {
	analizeCriteria,
	createMarketPredictionOutput,
	getTeamPoints,
	getTeamPosition,
	isMatchInLocalLeague,
	type T_PredictionsInput,
} from "./utils";

function doubleOpportunityPrediction(predictionsInput: T_PredictionsInput) {
	const criteria = isMatchInLocalLeague(predictionsInput.leagueStandings)
		? predictionsInput.leagueStandings.stats.partidos_jugados >= 3
			? [
					{
						id: "5e7b9e2b-cbf8-43d5-8b60-813c66300c37",
						description:
							"Criterios mas confiables para el local como favorito en un partido de liga local",
						trustLevel: 100,
						items: [
							{
								description: "El local está al menos 4 posiciones mas arriba que el visitante",
								fn: ({ homeTeam, awayTeam, leagueStandings }: T_PredictionsInput) => {
									const homeTeamPosition = getTeamPosition(homeTeam.id, leagueStandings) || 0;
									const awayTeamPosition = getTeamPosition(awayTeam.id, leagueStandings) || 0;

									return {
										fulfilled:
											homeTeamPosition < awayTeamPosition &&
											awayTeamPosition - homeTeamPosition >= 4,
										successExplanation: `El local está mas arriba que el visitante en la tabla | (${homeTeamPosition}>${awayTeamPosition}/${leagueStandings.items.length})`,
										failExplanation: `El local está mas abajo o en la misma posición que el visitante en la tabla | (${homeTeamPosition}<=${awayTeamPosition}/${leagueStandings.items.length})`,
									};
								},
							},
							{
								description: "Ambos equipos no pueden ser históricos",
								fn: ({ homeTeam, awayTeam }: T_PredictionsInput) => {
									return {
										fulfilled: !(
											homeTeam.historic === awayTeam.historic && homeTeam.historic === true
										),
										successExplanation: `Ambos equipos no son históricos | (${homeTeam.historic}-${awayTeam.historic})`,
										failExplanation: `Ambos equipos son históricos | (${homeTeam.historic}-${awayTeam.historic})`,
									};
								},
							},
						],
					},
				]
			: []
		: [
				{
					id: "2f288451-42c2-48a9-ad53-30790b7974a8",
					description:
						"Criterios mas confiables para el local como favorito en un partido de torneo internacional o copa local",
					trustLevel: 100,
					items: [
						{
							description:
								"El local debe haber sumado al menos 10 de 15 puntos en los últimos 5 partidos",
							fn: ({ homeTeam }: T_PredictionsInput) => {
								const LIMITS = { min: 10, max: 15, games: 5 };
								const homeTeamPoints = getTeamPoints(homeTeam);

								return {
									fulfilled: homeTeamPoints >= LIMITS.min,
									successExplanation: `El local sumó mas de ${LIMITS.min} puntos en los últimos ${LIMITS.games} partidos | (${homeTeamPoints}/${LIMITS.max})`,
									failExplanation: `El local sumó menos de ${LIMITS.min} puntos en los últimos ${LIMITS.games} partidos | (${homeTeamPoints}/${LIMITS.max})`,
								};
							},
						},
						{
							description:
								"El visitante debe haber sumado menos de 7 puntos en los últimos 5 partidos",
							fn: ({ awayTeam }: T_PredictionsInput) => {
								const LIMITS = { min: 7, max: 15, games: 5 };
								const awayTeamPoints = getTeamPoints(awayTeam);

								return {
									fulfilled: awayTeamPoints <= LIMITS.min,
									successExplanation: `El visitante sumó menos de ${LIMITS.min} puntos en los últimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
									failExplanation: `El visitante sumó mas de ${LIMITS.min} puntos en los últimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
								};
							},
						},
					],
				},
			].filter(v.isNotNil);

	return createMarketPredictionOutput({
		id: "do-local",
		name: "Doble oportunidad (Local)",
		shortName: "DOL",
		criteria: analizeCriteria(criteria, predictionsInput, {
			winning: (fullfilled, predictionsInput_) => {
				return fullfilled && predictionsInput_.match.teams.home.result !== "LOSE";
			},
			lostWinning: (fullfilled, predictionsInput_) => {
				return !fullfilled && predictionsInput_.match.teams.home.result !== "LOSE";
			},
			lost: (fullfilled, predictionsInput_) => {
				return fullfilled && predictionsInput_.match.teams.home.result === "LOSE";
			},
			skippedLost: (fullfilled, predictionsInput_) => {
				return !fullfilled && predictionsInput_.match.teams.home.result === "LOSE";
			},
		}),
	});
}

export default doubleOpportunityPrediction;
