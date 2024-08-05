import type { T_MarketPrediction } from "../types";
import {
	analizeCriteria,
	createMarketPredictionOutput,
	getTeamPoints,
	getTeamPosition,
	type T_PredictionsInput,
} from "./utils";

function doubleOpportunityPrediction(predictionsInput: T_PredictionsInput): T_MarketPrediction {
	const criteria = [
		{
			description: "Criterios mas confiables para el local como favorito",
			trustLevel: 100,
			items: [
				{
					description: "El local debe estar en los primeros 5 lugares de la tabla",
					fn: ({ homeTeam }: T_PredictionsInput) => {
						const LIMIT = 5;
						const teamPosition =
							getTeamPosition(homeTeam.id, predictionsInput.leagueStandings) || 0;

						return {
							fulfilled: teamPosition >= 1 && teamPosition <= LIMIT,
							successExplanation: `El local está entre los primeros ${LIMIT} puestos de la tabla | (${teamPosition}/${predictionsInput.leagueStandings.items.length})`,
							failExplanation: `El local está fuera de los primeros ${LIMIT} puestos de la tabla | (${teamPosition}/${predictionsInput.leagueStandings.items.length})`,
						};
					},
				},
				{
					description: "El visitante debe estar mas abajo de los 10 primeros de la tabla",
					fn: ({ awayTeam }: T_PredictionsInput) => {
						const LIMIT = 10;
						const teamPosition =
							getTeamPosition(awayTeam.id, predictionsInput.leagueStandings) || 0;

						return {
							fulfilled: teamPosition > LIMIT,
							successExplanation: `El visitante está mas abajo de los primeros ${LIMIT} puestos de la tabla | (${teamPosition}/${predictionsInput.leagueStandings.items.length})`,
							failExplanation: `El visitante está dentro de los primeros ${LIMIT} puestos de la tabla | (${teamPosition}/${predictionsInput.leagueStandings.items.length})`,
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
						"El visitante debe haber sumado menos de 10 puntos en los ultimos 5 partidos",
					fn: ({ awayTeam }: T_PredictionsInput) => {
						const LIMITS = { min: 10, max: 15, games: 5 };
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
	];

	return createMarketPredictionOutput({
		id: "doble-oportunidad-local",
		name: "Doble oportunidad (Local)",
		shortName: "DOL",
		criteria: analizeCriteria(criteria, predictionsInput),
		predictionsInput,
		results: predictionsInput.match.played
			? {
					winning: (
						trustLevel: T_MarketPrediction["trustLevelLabel"],
						predictionsInput_: T_PredictionsInput,
					) => {
						return (
							trustLevel === "HIGH" &&
							"winner" in predictionsInput_.homeTeam &&
							(predictionsInput_.homeTeam.winner === null ||
								predictionsInput_.homeTeam.winner === true)
						);
					},
					lostWinning: (
						trustLevel: T_MarketPrediction["trustLevelLabel"],
						predictionsInput_: T_PredictionsInput,
					) => {
						return (
							trustLevel !== "HIGH" &&
							"winner" in predictionsInput_.homeTeam &&
							(predictionsInput_.homeTeam.winner === null ||
								predictionsInput_.homeTeam.winner === true)
						);
					},
					lost: (
						trustLevel: T_MarketPrediction["trustLevelLabel"],
						predictionsInput_: T_PredictionsInput,
					) => {
						return (
							trustLevel === "HIGH" &&
							"winner" in predictionsInput_.homeTeam &&
							predictionsInput_.homeTeam.winner === false
						);
					},
					skippedLost: (
						trustLevel: T_MarketPrediction["trustLevelLabel"],
						predictionsInput_: T_PredictionsInput,
					) => {
						return (
							trustLevel === "LOW" &&
							"winner" in predictionsInput_.homeTeam &&
							predictionsInput_.homeTeam.winner === false
						);
					},
				}
			: undefined,
	});
}

export default doubleOpportunityPrediction;
