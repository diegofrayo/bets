import v from "../../../../@diegofrayo/v";
import type { T_MarketPrediction } from "../types";
import {
	analizeCriteria,
	createMarketPredictionOutput,
	getTeamPosition,
	isMatchInLocalLeague,
	type T_PredictionsInput,
} from "./utils";

function goalByHomeTeamPrediction(predictionsInput: T_PredictionsInput) {
	const criteria = [
		isMatchInLocalLeague(predictionsInput.match, predictionsInput.leagueStandings)
			? {
					description:
						"Criterios mas confiables para el local como favorito en un partido de liga local",
					trustLevel: 100,
					items: [
						{
							description: "El local tiene un promedio de goles anotados como local alto",
							fn: ({ homeTeamStats }: T_PredictionsInput) => {
								const LIMIT = 1;

								return {
									fulfilled:
										homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados > LIMIT,
									successExplanation: `El local tiene un promedio de goles anotados como local mayor a ${LIMIT} | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
									failExplanation: `El local tiene un promedio de goles anotados como local menor o igual a ${LIMIT} | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
								};
							},
						},
						{
							description: "El visitante tiene un promedio de goles recibidos como visitante alto",
							fn: ({ awayTeamStats }: T_PredictionsInput) => {
								const LIMIT = 1;

								return {
									fulfilled:
										awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos > LIMIT,
									successExplanation: `El visitante tiene un promedio de goles recibidos como visitante mayor o igual a ${LIMIT} | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos})`,
									failExplanation: `El visitante tiene un promedio de goles recibidos como visitante menor a ${LIMIT} | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos})`,
								};
							},
						},
						{
							description: "El local está al menos 6 posiciones por arriba del visitante",
							fn: ({ homeTeam, awayTeam }: T_PredictionsInput) => {
								const LIMIT = 6;
								const homeTeamPosition =
									getTeamPosition(homeTeam.id, predictionsInput.leagueStandings) || 0;
								const awayTeamPosition =
									getTeamPosition(awayTeam.id, predictionsInput.leagueStandings) || 0;

								return {
									fulfilled:
										homeTeamPosition < awayTeamPosition &&
										Math.abs(homeTeamPosition - awayTeamPosition) >= LIMIT,
									successExplanation: `El local va de ${homeTeamPosition} y el visitante de ${awayTeamPosition} en la tabla de posiciones`,
									failExplanation: `El local va de ${homeTeamPosition} y el visitante de ${awayTeamPosition} en la tabla de posiciones`,
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
							description: "El local tiene un promedio de goles anotados como local alto",
							fn: ({ homeTeamStats }: T_PredictionsInput) => {
								const LIMIT = 1;

								return {
									fulfilled:
										homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados > LIMIT,
									successExplanation: `El local tiene un promedio de goles anotados como local mayor a ${LIMIT} | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
									failExplanation: `El local tiene un promedio de goles anotados como local menor o igual a ${LIMIT} | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
								};
							},
						},
						{
							description: "El visitante tiene un promedio de goles recibidos como visitante alto",
							fn: ({ awayTeamStats }: T_PredictionsInput) => {
								const LIMIT = 1;

								return {
									fulfilled:
										awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos > LIMIT,
									successExplanation: `El visitante tiene un promedio de goles recibidos como visitante mayor o igual a ${LIMIT} | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos})`,
									failExplanation: `El visitante tiene un promedio de goles recibidos como visitante menor a ${LIMIT} | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos})`,
								};
							},
						},
					],
				},
	].filter(v.isNotNil);

	return createMarketPredictionOutput({
		id: "gpe-local",
		name: "Gol del equipo local",
		shortName: "GL",
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
							predictionsInput_.homeTeam.score > 0
						);
					},
					lostWinning: (
						trustLevel: T_MarketPrediction["trustLevelLabel"],
						predictionsInput_: T_PredictionsInput,
					) => {
						return (
							trustLevel !== "HIGH" &&
							"winner" in predictionsInput_.homeTeam &&
							predictionsInput_.homeTeam.score > 0
						);
					},
					lost: (
						trustLevel: T_MarketPrediction["trustLevelLabel"],
						predictionsInput_: T_PredictionsInput,
					) => {
						return (
							trustLevel === "HIGH" &&
							"winner" in predictionsInput_.homeTeam &&
							predictionsInput_.homeTeam.score === 0
						);
					},
					skippedLost: (
						trustLevel: T_MarketPrediction["trustLevelLabel"],
						predictionsInput_: T_PredictionsInput,
					) => {
						return (
							trustLevel === "LOW" &&
							"winner" in predictionsInput_.homeTeam &&
							predictionsInput_.homeTeam.score === 0
						);
					},
				}
			: undefined,
	});
}

export default goalByHomeTeamPrediction;
