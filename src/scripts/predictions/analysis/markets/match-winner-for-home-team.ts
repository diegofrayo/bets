import v from "../../../../@diegofrayo/v";
import {
	analizeCriteria,
	createMarketPredictionOutput,
	filterTeamPlayedMatches,
	getTeamPoints,
	getTeamPosition,
	isMatchInLocalLeague,
	type T_PredictionsInput,
} from "./utils";

function matchWinnerPrediction(predictionsInput: T_PredictionsInput) {
	const criteria = isMatchInLocalLeague(predictionsInput.leagueStandings)
		? predictionsInput.leagueStandings.stats.partidos_jugados >= 3
			? [
					{
						id: "a25adfae-292b-4cac-88b8-f15532a63e7b",
						description:
							"Criterios mas confiables para el local como favorito en un partido de liga local",
						trustLevel: 100,
						items: [
							{
								description: "El local es de los mejores del torneo",
								fn: ({ homeTeam, leagueStandings }: T_PredictionsInput) => {
									const homeTeamPosition = getTeamPosition(homeTeam.id, leagueStandings) || 0;

									return {
										fulfilled: homeTeam.tag === "FEATURED",
										successExplanation: `El local es de los mejores del torneo | (${homeTeamPosition}/${leagueStandings.items.length})`,
										failExplanation: `El local no es de los mejores del torneo | (${homeTeamPosition}/${leagueStandings.items.length})`,
									};
								},
							},
							{
								description: "El visitante es de los peores del torneo",
								fn: ({ awayTeam, leagueStandings }: T_PredictionsInput) => {
									const awayTeamPosition = getTeamPosition(awayTeam.id, leagueStandings) || 0;

									return {
										fulfilled: awayTeam.tag === "POOR",
										successExplanation: `El visitante es de los peores del torneo | (${awayTeamPosition}/${leagueStandings.items.length})`,
										failExplanation: `El visitante no es de los peores del torneo | (${awayTeamPosition}/${leagueStandings.items.length})`,
									};
								},
							},
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
									"El visitante debe haber sumado menos de 4 puntos en los últimos 5 partidos",
								fn: ({ awayTeam }: T_PredictionsInput) => {
									const LIMITS = { min: 4, max: 15, games: 5 };
									const awayTeamPoints = getTeamPoints(awayTeam);

									return {
										fulfilled: awayTeamPoints <= LIMITS.min,
										successExplanation: `El visitante sumó menos de ${LIMITS.min} puntos en los últimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
										failExplanation: `El visitante sumó mas de ${LIMITS.min} puntos en los últimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
									};
								},
							},
							{
								description: "El último partido del local como local debe ser una victoria",
								fn: ({ homeTeam }: T_PredictionsInput) => {
									const lastHomeTeamMatchAtHome = filterTeamPlayedMatches({
										teamId: homeTeam.id,
										playedMatches: homeTeam.matches,
										side: "home",
										lastMatches: 1,
									})[0];

									if (!lastHomeTeamMatchAtHome) {
										return {
											fulfilled: false,
											successExplanation: "",
											failExplanation:
												"Insuficientes partidos ha jugado el equipo local para hacer este analisis",
										};
									}

									return {
										fulfilled: lastHomeTeamMatchAtHome?.teams.home.result === "WIN",
										successExplanation: `El local ganó su último partido como local | (${lastHomeTeamMatchAtHome?.teams.home.score.fullTime}-${lastHomeTeamMatchAtHome?.teams.away.score.fullTime})`,
										failExplanation: `El local no ganó su último partido como local | (${lastHomeTeamMatchAtHome?.teams.home.score.fullTime}-${lastHomeTeamMatchAtHome?.teams.away.score.fullTime})`,
									};
								},
							},
							{
								description: "El último partido del visitante como visitante debe ser una derrota",
								fn: ({ awayTeam }: T_PredictionsInput) => {
									const lastAwayTeamMatchAsVisitor = filterTeamPlayedMatches({
										teamId: awayTeam.id,
										playedMatches: awayTeam.matches,
										side: "away",
										lastMatches: 1,
									})[0];

									if (!lastAwayTeamMatchAsVisitor) {
										return {
											fulfilled: false,
											successExplanation: "",
											failExplanation:
												"Insuficientes partidos ha jugado el equipo visitante para hacer este analisis",
										};
									}

									return {
										fulfilled: lastAwayTeamMatchAsVisitor?.teams.home.result === "WIN",
										successExplanation: `El visitante ganó su último partido como visitante | (${lastAwayTeamMatchAsVisitor?.teams.home.score.fullTime}-${lastAwayTeamMatchAsVisitor?.teams.away.score.fullTime})`,
										failExplanation: `El visitante no ganó su último partido como visitante | (${lastAwayTeamMatchAsVisitor?.teams.home.score.fullTime}-${lastAwayTeamMatchAsVisitor?.teams.away.score.fullTime})`,
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
					id: "bd588f10-3fdd-4c3e-b9d9-748f0772cd62",
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
								"El visitante debe haber sumado menos de 4 puntos en los últimos 5 partidos",
							fn: ({ awayTeam }: T_PredictionsInput) => {
								const LIMITS = { min: 4, max: 15, games: 5 };
								const awayTeamPoints = getTeamPoints(awayTeam);

								return {
									fulfilled: awayTeamPoints <= LIMITS.min,
									successExplanation: `El visitante sumó menos de ${LIMITS.min} puntos en los últimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
									failExplanation: `El visitante sumó mas de ${LIMITS.min} puntos en los últimos ${LIMITS.games} partidos | (${awayTeamPoints}/${LIMITS.max})`,
								};
							},
						},
						{
							description: "El último partido del local como local debe ser una victoria",
							fn: ({ homeTeam }: T_PredictionsInput) => {
								const lastHomeTeamMatchAtHome = filterTeamPlayedMatches({
									teamId: homeTeam.id,
									playedMatches: homeTeam.matches,
									side: "home",
									lastMatches: 1,
								})[0];

								if (!lastHomeTeamMatchAtHome) {
									return {
										fulfilled: false,
										successExplanation: "",
										failExplanation:
											"Insuficientes partidos ha jugado el equipo local para hacer este analisis",
									};
								}

								return {
									fulfilled: lastHomeTeamMatchAtHome?.teams.home.result === "WIN",
									successExplanation: `El local ganó su último partido como local | (${lastHomeTeamMatchAtHome?.teams.home.score.fullTime}-${lastHomeTeamMatchAtHome?.teams.away.score.fullTime})`,
									failExplanation: `El local no ganó su último partido como local | (${lastHomeTeamMatchAtHome?.teams.home.score.fullTime}-${lastHomeTeamMatchAtHome?.teams.away.score.fullTime})`,
								};
							},
						},
						{
							description: "El último partido del visitante como visitante debe ser una derrota",
							fn: ({ awayTeam }: T_PredictionsInput) => {
								const lastAwayTeamMatchAsVisitor = filterTeamPlayedMatches({
									teamId: awayTeam.id,
									playedMatches: awayTeam.matches,
									side: "away",
									lastMatches: 1,
								})[0];

								if (!lastAwayTeamMatchAsVisitor) {
									return {
										fulfilled: false,
										successExplanation: "",
										failExplanation:
											"Insuficientes partidos ha jugado el equipo visitante para hacer este analisis",
									};
								}

								return {
									fulfilled: lastAwayTeamMatchAsVisitor?.teams.home.result === "WIN",
									successExplanation: `El visitante ganó su último partido como visitante | (${lastAwayTeamMatchAsVisitor?.teams.home.score.fullTime}-${lastAwayTeamMatchAsVisitor?.teams.away.score.fullTime})`,
									failExplanation: `El visitante no ganó su último partido como visitante | (${lastAwayTeamMatchAsVisitor?.teams.home.score.fullTime}-${lastAwayTeamMatchAsVisitor?.teams.away.score.fullTime})`,
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
			].filter(v.isNotNil);

	return createMarketPredictionOutput({
		id: "tr-local",
		name: "Tiempo reglamentario (Local)",
		shortName: "TRL",
		criteria: analizeCriteria(criteria, predictionsInput, {
			winning: (fullfilled, predictionsInput_) => {
				return fullfilled && predictionsInput_.match.teams.home.result === "WIN";
			},
			lostWinning: (fullfilled, predictionsInput_) => {
				return !fullfilled && predictionsInput_.match.teams.home.result === "WIN";
			},
			lost: (fullfilled, predictionsInput_) => {
				return fullfilled && predictionsInput_.match.teams.home.result !== "WIN";
			},
			skippedLost: (fullfilled, predictionsInput_) => {
				return !fullfilled && predictionsInput_.match.teams.home.result !== "WIN";
			},
		}),
	});
}

export default matchWinnerPrediction;
