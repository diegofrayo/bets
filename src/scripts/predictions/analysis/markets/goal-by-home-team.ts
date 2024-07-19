// @ts-nocheck

function getMatchPredictions({
	match,
	homeTeam,
	awayTeam,
	homeTeamPlayedMatches,
	homeTeamStats,
	awayTeamStats,
	leagueStandings,
}: {
	match: T_FixtureMatch;
	homeTeam: T_Team;
	awayTeam: T_Team;
	homeTeamPlayedMatches: T_PlayedMatch[];
	homeTeamStats: T_TeamStats;
	awayTeamStats: T_TeamStats;
	leagueStandings: T_LeagueStandings;
}): T_Prediction[] {
	const homeTeamScoresOneGoalAnalysisResult = homeTeamScoresOneGoalAnalysis({
		match,
		homeTeam,
		awayTeam,
		homeTeamPlayedMatches,
		homeTeamStats,
		awayTeamStats,
		leagueStandings,
	});
	const awayTeamScoresOneGoalAnalysisResult = awayTeamScoresOneGoalAnalysis({
		match,
		homeTeam,
		awayTeam,
		homeTeamStats,
		awayTeamStats,
		leagueStandings,
	});

	return [
		homeTeamScoresOneGoalAnalysisResult,
		oneGoalDuringMatchAnalysis({
			match,
			homeTeam,
			awayTeam,
			homeTeamScoresOneGoalAnalysisResult: homeTeamScoresOneGoalAnalysisResult.recommendable,
			awayTeamScoresOneGoalAnalysisResult: awayTeamScoresOneGoalAnalysisResult.recommendable,
			leagueStandings,
		}),
		matchWinnerAnalysis({ match, homeTeam, awayTeam, leagueStandings }),
		awayTeamScoresOneGoalAnalysisResult,
	];
}

// --- UTILS ---

// --- PREDICTIONS & ANALYSIS ---

function homeTeamScoresOneGoalAnalysis({
	match,
	homeTeam,
	awayTeam,
	homeTeamPlayedMatches,
	homeTeamStats,
	awayTeamStats,
	leagueStandings,
}: {
	match: T_FixtureMatch;
	homeTeam: T_Team;
	awayTeam: T_Team;
	homeTeamPlayedMatches: T_PlayedMatch[];
	homeTeamStats: T_TeamStats;
	awayTeamStats: T_TeamStats;
	leagueStandings: T_LeagueStandings;
}) {
	const criteria = [
		[
			{
				enabled: true,
				description: "Marcó gol en los últimos 4 partidos de local",
				weight: 0.75,
				fn: () => {
					return (
						homeTeamStats.ultimos_partidos_con_goles_de_local >=
						homeTeamStats.ultimos_partidos_de_local
					);
				},
			},
			{
				enabled: true,
				description: "Promedio de goles de local >= 1.3",
				weight: 0.75,
				fn: () => {
					return homeTeamStats.promedio_de_goles_de_local >= 1.3;
				},
			},
		],
		{
			enabled: true,
			description: "El local es un equipo destacado",
			weight: 0.083,
			fn: () => {
				return checkIsTeamFeatured(homeTeam, leagueStandings);
			},
		},
		{
			enabled: true,
			description: "El visitante recibe muchos goles (Promedio >= 2)",
			weight: 0.083,
			fn: () => {
				return awayTeamStats.promedio_de_goles_recibidos >= 2;
			},
		},
		{
			enabled: v.isNumber(getTeamPosition(awayTeam.id, leagueStandings)),
			description: "El visitante está en los últimos 3 puestos de la tabla",
			weight: 0.083,
			fn: () => {
				const leagueTeams = leagueStandings.flat().length;
				const teamPosition = getTeamPosition(awayTeam.id, leagueStandings);

				if (leagueStandings.length == 1 && leagueTeams > 0 && teamPosition) {
					return leagueTeams - teamPosition <= 2;
				}

				return false;
			},
		},
		{
			enabled: true,
			description: "El local está al menos 5 posiciones mas arriba que el rival",
			weight: 0,
			fn: () => {
				return compareTeamsPositions({
					homeTeam,
					awayTeam,
					leagueStandings,
					difference: 5,
				});
			},
		},
		{
			enabled: true,
			description: "Promedio de goles >= 1.5",
			weight: 0,
			fn: () => {
				return homeTeamStats.promedio_de_goles >= 1.5;
			},
		},
		{
			enabled: true,
			description: "No ha perdido los últimos 4 partidos de local",
			weight: 0,
			fn: () => {
				return wonOrTiedLastGames({
					teamId: homeTeam.id,
					teamPlayedMatches: homeTeamPlayedMatches,
					side: "home",
					lastGames: 4,
				});
			},
		},
		{
			enabled: false,
			description: "Ha marcado en los últimos 4 partidos de local",
			weight: 0,
			fn: () => {
				return scoredLastGames({
					teamId: homeTeam.id,
					teamPlayedMatches: homeTeamPlayedMatches,
					side: "home",
					lastGames: 4,
				});
			},
		},
	];
	const warnings = [
		{
			description: "Ambos equipos son destacados",
			fn: () => {
				return (
					checkIsTeamFeatured(homeTeam, leagueStandings) === true &&
					checkIsTeamFeatured(awayTeam, leagueStandings) === true
				);
			},
		},
		{
			description: "El visitante es destacado y el local no",
			fn: () => {
				return (
					checkIsTeamFeatured(homeTeam, leagueStandings) === false &&
					checkIsTeamFeatured(awayTeam, leagueStandings) === true
				);
			},
		},
		{
			description: "El visitante tiene buenos resultados como visitante (Puntos ganados > 50%)",
			fn: () => {
				return awayTeamStats.porcentaje_de_puntos_ganados_de_visitante > 50;
			},
		},
	];

	return createAnalysisOutputObject({
		id: "GEL",
		name: "El equipo local marca un gol",
		criteria,
		warnings,
		...(match.played
			? {
					right: (recommendable: boolean) => recommendable && match.teams.home.score >= 1,
					lostRight: (recommendable: boolean) => !recommendable && match.teams.home.score >= 1,
					fail: (recommendable: boolean) => recommendable && match.teams.home.score === 0,
					skippedFail: (recommendable: boolean) => !recommendable && match.teams.home.score === 0,
				}
			: {}),
	});
}

function oneGoalDuringMatchAnalysis({
	match,
	homeTeam,
	awayTeam,
	homeTeamScoresOneGoalAnalysisResult,
	awayTeamScoresOneGoalAnalysisResult,
	leagueStandings,
}: {
	match: T_FixtureMatch;
	homeTeam: T_Team;
	awayTeam: T_Team;
	homeTeamScoresOneGoalAnalysisResult: boolean;
	awayTeamScoresOneGoalAnalysisResult: boolean;
	leagueStandings: T_LeagueStandings;
}) {
	const criteria = [
		{
			enabled: true,
			description: "El local o visitante puede hacer un gol",
			weight: 0.75,
			fn: () => {
				return homeTeamScoresOneGoalAnalysisResult || awayTeamScoresOneGoalAnalysisResult;
			},
		},
		{
			enabled: true,
			description: "Alguno de los dos equipos es destacado",
			weight: 0.25,
			fn: () => {
				return (
					checkIsTeamFeatured(homeTeam, leagueStandings) ||
					checkIsTeamFeatured(awayTeam, leagueStandings)
				);
			},
		},
	];
	const warnings = [
		{
			description: "Ambos equipos son destacados",
			fn: () => {
				return (
					checkIsTeamFeatured(homeTeam, leagueStandings) === true &&
					checkIsTeamFeatured(awayTeam, leagueStandings) === true
				);
			},
		},
	];

	return createAnalysisOutputObject({
		id: "GEP",
		name: "Hay un gol en el partido",
		criteria,
		warnings,
		...(match.played
			? {
					right: (recommendable: boolean) =>
						recommendable && (match.teams.home.score >= 1 || match.teams.away.score >= 1),
					lostRight: (recommendable: boolean) =>
						!recommendable && (match.teams.home.score >= 1 || match.teams.away.score >= 1),
					fail: (recommendable: boolean) =>
						recommendable && match.teams.home.score === 0 && match.teams.away.score === 0,
					skippedFail: (recommendable: boolean) =>
						!recommendable && match.teams.home.score === 0 && match.teams.away.score === 0,
				}
			: {}),
	});
}

function matchWinnerAnalysis({
	match,
	homeTeam,
	awayTeam,
	leagueStandings,
}: {
	match: T_FixtureMatch;
	homeTeam: T_Team;
	awayTeam: T_Team;
	leagueStandings: T_LeagueStandings;
}) {
	const criteria = [
		{
			enabled: true,
			description: "El local es destacado",
			weight: 0.75,
			fn: () => {
				return checkIsTeamFeatured(homeTeam, leagueStandings) === true;
			},
		},
		{
			enabled: true,
			description: "El visitante no es destacado",
			weight: 0.25,
			fn: () => {
				return checkIsTeamFeatured(awayTeam, leagueStandings) === false;
			},
		},
	];
	const warnings = [
		{
			description: "El visitante es destacado",
			fn: () => {
				return checkIsTeamFeatured(awayTeam, leagueStandings) === true;
			},
		},
	];

	return createAnalysisOutputObject({
		id: "ELGE",
		name: "El equipo local gana o empata",
		criteria,
		warnings,
		...(match.played
			? {
					right: (recommendable: boolean) =>
						recommendable && (match.teams.home.winner === true || match.teams.home.winner === null),
					lostRight: (recommendable: boolean) =>
						!recommendable &&
						(match.teams.home.winner === true || match.teams.home.winner === null),
					fail: (recommendable: boolean) => recommendable && match.teams.home.winner === false,
					skippedFail: (recommendable: boolean) =>
						!recommendable && match.teams.home.winner === false,
				}
			: {}),
	});
}

function awayTeamScoresOneGoalAnalysis({
	match,
	homeTeam,
	homeTeamStats,
	awayTeam,
	awayTeamStats,
	leagueStandings,
}: {
	match: T_FixtureMatch;
	homeTeam: T_Team;
	homeTeamStats: T_TeamStats;
	awayTeam: T_Team;
	awayTeamStats: T_TeamStats;
	leagueStandings: T_LeagueStandings;
}) {
	const criteria = [
		[
			{
				enabled: true,
				description: "El visitante es destacado y el local no",
				weight: 0.75,
				fn: () => {
					return (
						checkIsTeamFeatured(homeTeam, leagueStandings) === false &&
						checkIsTeamFeatured(awayTeam, leagueStandings) === true
					);
				},
			},
			{
				enabled: true,
				description:
					"El visitante tiene un promedio de gol >= 1 en los últimos 4 partidos de visitante",
				weight: 0.75,
				fn: () => {
					return awayTeamStats.ultimos_promedio_de_goles_de_visitante >= 1;
				},
			},
		],
		{
			enabled: true,
			description: "El visitante tiene un promedio de gol de visitante >= 1.3",
			weight: 0.083,
			fn: () => {
				return awayTeamStats.promedio_de_goles_de_visitante >= 1.3;
			},
		},
		{
			enabled: true,
			description: "El local recibe muchos goles (Promedio >= 2)",
			weight: 0.083,
			fn: () => {
				return homeTeamStats.promedio_de_goles_recibidos >= 2;
			},
		},
		{
			enabled: v.isNumber(getTeamPosition(homeTeam.id, leagueStandings)),
			description: "El local está en los últimos 3 puestos de la tabla",
			weight: 0.083,
			fn: () => {
				const leagueTeams = leagueStandings.flat().length;
				const teamPosition = getTeamPosition(homeTeam.id, leagueStandings);

				if (leagueStandings.length == 1 && leagueTeams > 0 && teamPosition) {
					return leagueTeams - teamPosition <= 2;
				}

				return false;
			},
		},
	];
	const warnings = [
		{
			description: "El local es destacado",
			fn: () => {
				return checkIsTeamFeatured(homeTeam, leagueStandings) === true;
			},
		},
	];

	return createAnalysisOutputObject({
		id: "GEV",
		name: "El equipo visitante marca un gol",
		criteria,
		warnings,
		...(match.played
			? {
					right: (recommendable: boolean) => recommendable && match.teams.away.score >= 1,
					lostRight: (recommendable: boolean) => !recommendable && match.teams.away.score >= 1,
					fail: (recommendable: boolean) => recommendable && match.teams.away.score === 0,
					skippedFail: (recommendable: boolean) => !recommendable && match.teams.away.score === 0,
				}
			: {}),
	});
}

function wonOrTiedLastGames({
	teamId,
	teamPlayedMatches,
	side,
	lastGames,
}: {
	teamId: number;
	teamPlayedMatches: T_PlayedMatch[];
	side: "home" | "away";
	lastGames: number;
}) {
	const filteredMatches = filterTeamPlayedMatches({
		teamId,
		playedMatches: teamPlayedMatches,
		side,
		lastGames,
	})
		.slice(0, lastGames)
		.filter((match) => {
			return match.teams[side].winner !== false;
		});

	return filteredMatches.length === lastGames;
}

function scoredLastGames({
	teamId,
	teamPlayedMatches,
	side,
	lastGames,
}: {
	teamId: number;
	teamPlayedMatches: T_PlayedMatch[];
	side: "home" | "away";
	lastGames: number;
}) {
	const filteredMatches = filterTeamPlayedMatches({
		teamId,
		playedMatches: teamPlayedMatches,
		side,
		lastGames,
	})
		.slice(0, lastGames)
		.filter((match) => {
			return match.teams[side].score > 0;
		});

	return filteredMatches.length === lastGames;
}

function compareTeamsPositions({
	homeTeam,
	awayTeam,
	leagueStandings,
	difference,
}: {
	homeTeam: T_Team;
	awayTeam: T_Team;
	leagueStandings: T_LeagueStandings;
	difference: number;
}) {
	const homeTeamPosition = getTeamPosition(homeTeam.id, leagueStandings);
	const awayTeamPosition = getTeamPosition(awayTeam.id, leagueStandings);

	if (homeTeamPosition === null || awayTeamPosition === null) {
		console.log(
			"      COMPARE_TEAMS_POSITIONS:",
			"Team not found in its league standings",
			homeTeam.name,
			homeTeamPosition,
			awayTeam.name,
			awayTeamPosition,
		);
		return false;
	}

	return (
		homeTeamPosition < awayTeamPosition &&
		Math.abs(homeTeamPosition - awayTeamPosition) >= difference
	);
}
