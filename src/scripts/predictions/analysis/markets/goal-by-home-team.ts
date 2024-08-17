import v from "../../../../@diegofrayo/v";
import {
	analizeStrategies,
	createMarketAnalysisOutput,
	getTeamPosition,
	isMatchInLocalLeague,
	type T_AnalysisInput,
} from "./utils";

function goalByHomeTeamAnalysis(analysisInput: T_AnalysisInput) {
	const strategies = isMatchInLocalLeague(analysisInput.leagueStandings)
		? analysisInput.leagueStandings.stats.partidos_jugados >= 3
			? [
					{
						id: "3c889798-2dea-4276-9cc9-762b8b95b556",
						description:
							"Criterios mas confiables para el local como favorito en un partido de liga local",
						confidenceLevel: 100,
						criteria: [
							/*
						{
							description: "El local tiene un promedio de goles anotados como local alto",
							fn: ({ homeTeamStats }: T_AnalysisInput) => {
								const LIMIT = 1;

								return {
									recommended:
										homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados > LIMIT,
									successExplanation: `El local tiene un promedio de goles anotados como local mayor a ${LIMIT} | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
									failExplanation: `El local tiene un promedio de goles anotados como local menor o igual a ${LIMIT} | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
								};
							},
						},
						{
							description: "El visitante tiene un promedio de goles recibidos como visitante alto",
							fn: ({ awayTeamStats }: T_AnalysisInput) => {
								const LIMIT = 1;

								return {
									recommended:
										awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos > LIMIT,
									successExplanation: `El visitante tiene un promedio de goles recibidos como visitante mayor o igual a ${LIMIT} | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos})`,
									failExplanation: `El visitante tiene un promedio de goles recibidos como visitante menor a ${LIMIT} | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos})`,
								};
							},
						},
            */
							{
								description: "El local está al menos 4 posiciones por arriba del visitante",
								fn: ({ homeTeam, awayTeam, leagueStandings }: T_AnalysisInput) => {
									const LIMIT = 6;
									const homeTeamPosition = getTeamPosition(homeTeam.id, leagueStandings) || 0;
									const awayTeamPosition = getTeamPosition(awayTeam.id, leagueStandings) || 0;

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
					},
					/*
				{
					description:
						"Criterios mas confiables para el local como favorito en un partido de liga local",
					confidenceLevel: 100,
					criteria:[
						{
							description: "El local tiene un promedio de goles anotados como local alto",
							fn: ({ homeTeamStats }: T_AnalysisInput) => {
								const LIMIT = 1;

								return {
									recommended:
										homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados > LIMIT,
									successExplanation: `El local tiene un promedio de goles anotados como local mayor a ${LIMIT} | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
									failExplanation: `El local tiene un promedio de goles anotados como local menor o igual a ${LIMIT} | (${homeTeamStats["all-home-matches"].items.promedio_de_goles_anotados})`,
								};
							},
						},
						{
							description: "El visitante tiene un promedio de goles recibidos como visitante alto",
							fn: ({ awayTeamStats }: T_AnalysisInput) => {
								const LIMIT = 1;

								return {
									recommended:
										awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos > LIMIT,
									successExplanation: `El visitante tiene un promedio de goles recibidos como visitante mayor o igual a ${LIMIT} | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos})`,
									failExplanation: `El visitante tiene un promedio de goles recibidos como visitante menor a ${LIMIT} | (${awayTeamStats["all-away-matches"].items.promedio_de_goles_recibidos})`,
								};
							},
						},
						{
							description: "El local está al menos 6 posiciones por arriba del visitante",
							fn: ({ homeTeam, awayTeam }: T_AnalysisInput) => {
								const LIMIT = 6;
								const homeTeamPosition =
									getTeamPosition(homeTeam.id, leagueStandings) || 0;
								const awayTeamPosition =
									getTeamPosition(awayTeam.id, leagueStandings) || 0;

								return {
									recommended:
										homeTeamPosition < awayTeamPosition &&
										Math.abs(homeTeamPosition - awayTeamPosition) >= LIMIT,
									successExplanation: `El local va de ${homeTeamPosition} y el visitante de ${awayTeamPosition} en la tabla de posiciones`,
									failExplanation: `El local va de ${homeTeamPosition} y el visitante de ${awayTeamPosition} en la tabla de posiciones`,
								};
							},
						},
					],
				},
        */
				]
			: []
		: [
				{
					id: "86842844-616c-4651-a3ee-e3cb92a04ce5",
					description:
						"Criterios mas confiables para el local como favorito en un partido de copa local o internacional",
					confidenceLevel: 100,
					criteria: [
						{
							description: "El local tiene un promedio de goles anotados como local alto",
							fn: ({ homeTeamStats }: T_AnalysisInput) => {
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
							fn: ({ awayTeamStats }: T_AnalysisInput) => {
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

	return createMarketAnalysisOutput({
		id: "gpe-local",
		name: "Gol del equipo local",
		shortName: "GL",
		strategies: analizeStrategies(strategies, analysisInput, {
			winning: (fulfilled, analysisInput_) => {
				return fulfilled && analysisInput_.match.teams.home.score.fullTime > 0;
			},
			lostWinning: (fulfilled, analysisInput_) => {
				return !fulfilled && analysisInput_.match.teams.home.score.fullTime > 0;
			},
			lost: (fulfilled, analysisInput_) => {
				return fulfilled && analysisInput_.match.teams.home.score.fullTime === 0;
			},
			skippedLost: (fulfilled, analysisInput_) => {
				return !fulfilled && analysisInput_.match.teams.home.score.fullTime === 0;
			},
		}),
	});
}

export default goalByHomeTeamAnalysis;
