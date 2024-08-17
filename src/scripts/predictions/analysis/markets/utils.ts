import { Entries } from "type-fest";
import type {
	T_FixtureMatch,
	T_FixtureMatchTeam,
	T_FixturePlayedMatch,
	T_LeagueStandings,
	T_LeagueStandingsRegular,
	T_MarketPrediction,
	T_PlayedMatch,
	T_PlayedMatchMarketPrediction,
	T_TeamStats,
} from "../types";
import { sortBy } from "../../../../@diegofrayo/sort";

export function analizeCriteria(
	criteria: Array<{
		id: string;
		description: string;
		trustLevel: number;
		items: Array<T_CriteriaInput>;
	}>,
	data: T_PredictionsInput,
	resultsAnalysis: Record<
		keyof T_PlayedMatchMarketPrediction["criteria"][number]["results"],
		(
			fullfilled: boolean,
			predictionsInput: T_PredictionsInput & { match: T_FixturePlayedMatch },
		) => boolean
	>,
): T_MarketPrediction["criteria"] {
	const output = criteria.map((subCriteria) => {
		const result = subCriteria.items.map((subCriteriaItem) => {
			const { fulfilled, ...rest } = subCriteriaItem.fn(data);

			if (fulfilled) {
				return {
					fulfilled,
					description: subCriteriaItem.description,
					explanation: rest.successExplanation,
				};
			}

			return {
				fulfilled,
				description: subCriteriaItem.description,
				explanation: rest.failExplanation,
			};
		});

		return {
			...subCriteria,
			items: result,
		};
	});

	return output
		.map((subCriteria) => {
			const allItemsAreFullFilled =
				subCriteria.items.find((item) => {
					return item.fulfilled === false;
				}) === undefined;

			if (data.match.played) {
				const predictionsInput = {
					...data,
					match: data.match as T_FixturePlayedMatch,
				};

				return {
					...subCriteria,
					fulfilled: allItemsAreFullFilled,
					results: (Object.entries(resultsAnalysis) as Entries<typeof resultsAnalysis>).reduce(
						(result, [key, fn]) => {
							return {
								...result,
								[key]: fn(allItemsAreFullFilled, predictionsInput),
							};
						},
						{} as T_PlayedMatchMarketPrediction["criteria"][number]["results"],
					),
				};
			}

			return {
				...subCriteria,
				fulfilled: allItemsAreFullFilled,
			};
		})
		.sort(sortBy("fulfilled", "trustLevel"));
}

export function calculateTrustLevelLabel(
	trustLevel: T_MarketPrediction["criteria"][number]["trustLevel"],
): T_MarketPrediction["trustLevel"] {
	if (trustLevel === 100) {
		return "1|HIGH";
	}

	if (trustLevel >= 50 && trustLevel <= 80) {
		return "2|MEDIUM";
	}

	return "3|LOW";
}

export function createMarketPredictionOutput({
	criteria,
	...rest
}: Pick<T_MarketPrediction, "id" | "name" | "shortName" | "criteria">): T_MarketPrediction | null {
	if (criteria.length === 0) {
		return null;
	}

	const trustLevel = criteria[0].fulfilled ? criteria[0].trustLevel : 0;
	const output: T_MarketPrediction = {
		...rest,
		criteria,
		trustLevel: calculateTrustLevelLabel(trustLevel),
	};

	return output;
}

export function getTeamPosition(teamId: number, leagueStandings: T_LeagueStandings) {
	if (leagueStandings.type === "GROUPS") {
		return null;
	}

	const teamPosition = leagueStandings.items.findIndex((item) => {
		return item.teamId === teamId;
	}, -1);

	if (teamPosition === -1) {
		return null;
	}

	return teamPosition + 1;
}

export function getTeamPoints(selectedTeam: T_FixtureMatchTeam) {
	return selectedTeam.matches.slice(0, 5).reduce((result, match) => {
		const side = match.teams.home.id === selectedTeam.id ? "home" : "away";
		const selectedTeamDetails = match.teams[side];

		return (
			result +
			(selectedTeamDetails.result === "WIN" ? 3 : selectedTeamDetails.result === "DRAW" ? 1 : 0)
		);
	}, 0);
}

export function isMatchInLocalLeague(
	leagueStandings: T_LeagueStandings,
): leagueStandings is T_LeagueStandingsRegular {
	return leagueStandings.type === "REGULAR";
}

export function getLeagueStandingsLimits(
	leagueStandings: T_LeagueStandings,
	showWarningMessage?: boolean,
) {
	if (leagueStandings.items.length === 28) {
		return {
			featured: 9,
			poor: leagueStandings.items.length - 7,
		};
	}

	if (leagueStandings.items.length === 24) {
		return {
			featured: 8,
			poor: leagueStandings.items.length - 6,
		};
	}

	if (leagueStandings.items.length === 20 || leagueStandings.items.length === 19) {
		return {
			featured: 6,
			poor: leagueStandings.items.length - 4,
		};
	}

	if (leagueStandings.items.length === 18 || leagueStandings.items.length === 16) {
		return {
			featured: 5,
			poor: leagueStandings.items.length - 3,
		};
	}

	if (leagueStandings.items.length === 12) {
		return {
			featured: 4,
			poor: leagueStandings.items.length - 2,
		};
	}

	if (showWarningMessage) {
		console.log(`Unknown league standings length: ${leagueStandings.items.length}`);
	}

	return {
		featured: 0,
		poor: 0,
	};
}

export function filterTeamPlayedMatches({
	teamId,
	playedMatches,
	side,
	lastMatches,
}: {
	teamId: T_FixtureMatchTeam["id"];
	playedMatches: Array<T_PlayedMatch>;
	side: "home" | "away" | "all";
	lastMatches: number | undefined;
}) {
	let result = playedMatches;

	if (side === "home") {
		result = result.filter((match) => {
			return match.teams.home.id === teamId;
		});
	} else if (side === "away") {
		result = result.filter((match) => {
			return match.teams.away.id === teamId;
		});
	}

	return lastMatches ? result.slice(0, lastMatches) : result;
}

// --- TYPES ---

export type T_CriteriaInput = {
	description: string;
	fn: (predictionsInput: T_PredictionsInput) => {
		fulfilled: boolean;
		successExplanation: string;
		failExplanation: string;
	};
};

export type T_PredictionsInput = {
	match: T_FixtureMatch;
	homeTeam: T_FixtureMatchTeam;
	awayTeam: T_FixtureMatchTeam;
	homeTeamStats: T_TeamStats;
	awayTeamStats: T_TeamStats;
	leagueStandings: T_LeagueStandings;
};

// --- CRITERIA ---

/*
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
  description:
    "El visitante debe haber perdido al menos uno de sus últimos 3 partidos",
  fn: ({ awayTeam }: T_PredictionsInput) => {
    const lastThreeMatches = filterTeamPlayedMatches({
      teamId: awayTeam.id,
      playedMatches: awayTeam.matches,
      side: "all",
      lastMatches: 3,
    });

    if (lastThreeMatches.length !== 3) {
      return {
        fulfilled: false,
        successExplanation: "",
        failExplanation:
          "Insuficientes partidos ha jugado el equipo visitante para hacer este analisis",
      };
    }

    const lostMatch = lastThreeMatches.find((match) => {
      return (
        (match.teams.home.id === awayTeam.id && match.teams.home.result === "LOSE") ||
        (match.teams.away.id === awayTeam.id && match.teams.away.result === "LOSE")
      );
    });

    return {
      fulfilled: lostMatch !== undefined,
      successExplanation: `El visitante perdió al menos 1 de sus últimos 3 partidos | (Match id: ${lostMatch?.id})`,
      failExplanation: "El visitante no perdió al menos 1 de sus últimos 3 partidos",
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
*/
