import v from "../../../../@diegofrayo/v";
import {
	analizeCriteria,
	createMarketPredictionOutput,
	// getLeagueStandingsLimits,
	getTeamPoints,
	getTeamPosition,
	isMatchInLocalLeague,
	type T_PredictionsInput,
} from "./utils";

function doubleOpportunityPrediction(predictionsInput: T_PredictionsInput) {
	const criteria = isMatchInLocalLeague(predictionsInput.match, predictionsInput.leagueStandings)
		? predictionsInput.leagueStandings.items[0].stats.all.played > 1
			? [
					{
						description:
							"Criterios mas confiables para el local como favorito en un partido de liga local",
						trustLevel: 100,
						items: [
							{
								description: "El local tiene una mejor posición que el visitante",
								fn: ({ homeTeam, awayTeam, leagueStandings }: T_PredictionsInput) => {
									const homeTeamPosition = getTeamPosition(homeTeam.id, leagueStandings) || 0;
									const awayTeamPosition = getTeamPosition(awayTeam.id, leagueStandings) || 0;

									return {
										fulfilled: homeTeamPosition < awayTeamPosition,
										successExplanation: `El local está mas arriba que el visitante en la tabla | (${homeTeamPosition}>${awayTeamPosition}/${leagueStandings.items.length})`,
										failExplanation: `El local está mas abajo o en la misma posición que el visitante en la tabla | (${homeTeamPosition}<=${awayTeamPosition}/${leagueStandings.items.length})`,
									};
								},
							},
						],
					},
					/*
          {
            description:
              "Criterios mas confiables para el local como favorito en un partido de liga local",
            trustLevel: 10,
            items: [
              {
                description: "El local debe estar en los primeros lugares de la tabla",
                fn: ({ homeTeam }: T_PredictionsInput) => {
                  const LIMITS = getLeagueStandingsLimits(leagueStandings);
                  const teamPosition =
                    getTeamPosition(homeTeam.id, leagueStandings) || 0;

                  return {
                    fulfilled: teamPosition >= 1 && teamPosition <= LIMITS.featured,
                    successExplanation: `El local está entre los primeros ${LIMITS.featured} puestos de la tabla | (${teamPosition}/${leagueStandings.items.length})`,
                    failExplanation: `El local está fuera de los primeros ${LIMITS.featured} puestos de la tabla | (${teamPosition}/${leagueStandings.items.length})`,
                  };
                },
              },
              {
                description: "El visitante debe estar mas abajo de los 10 primeros de la tabla",
                fn: ({ awayTeam }: T_PredictionsInput) => {
                  const LIMITS = getLeagueStandingsLimits(leagueStandings);
                  const teamPosition =
                    getTeamPosition(awayTeam.id, leagueStandings) || 0;

                  return {
                    fulfilled: teamPosition >= LIMITS.poor,
                    successExplanation: `El visitante está mas abajo de los primeros ${LIMITS.poor} puestos de la tabla | (${teamPosition}/${leagueStandings.items.length})`,
                    failExplanation: `El visitante está dentro de los primeros ${LIMITS.poor} puestos de la tabla | (${teamPosition}/${leagueStandings.items.length})`,
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
          */
				]
			: []
		: [
				{
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
			].filter(v.isNotNil);

	return createMarketPredictionOutput({
		id: "do-local",
		name: "Doble oportunidad (Local)",
		shortName: "DOL",
		criteria: analizeCriteria(criteria, predictionsInput),
		predictionsInput,
		results: predictionsInput.match.played
			? {
					winning: (trustLevel, predictionsInput_) => {
						return trustLevel === "HIGH" && predictionsInput_.match.teams.home.result !== "LOSE";
					},
					lostWinning: (trustLevel, predictionsInput_) => {
						return trustLevel !== "HIGH" && predictionsInput_.match.teams.home.result !== "LOSE";
					},
					lost: (trustLevel, predictionsInput_) => {
						return trustLevel === "HIGH" && predictionsInput_.match.teams.home.result === "LOSE";
					},
					skippedLost: (trustLevel, predictionsInput_) => {
						return trustLevel === "LOW" && predictionsInput_.match.teams.home.result === "LOSE";
					},
				}
			: undefined,
	});
}

export default doubleOpportunityPrediction;
