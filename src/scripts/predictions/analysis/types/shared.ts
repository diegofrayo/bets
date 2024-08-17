export type T_DayOfMatches = Array<
	Omit<T_League, "enabled" | "season"> & {
		standings: T_LeagueStandings;
		matches: Array<T_FixtureMatch>;
	}
>;

export type T_League = {
	id: number;
	enabled: boolean;
	name: string;
	type: "League" | "Cup" | "Unknown";
	priority: number;
	country: {
		code: string;
		name: string;
		flag: string;
	};
	season: {
		year: number;
		startDate: string;
	};
};

export type T_LeagueStandings = T_LeagueStandingsRegular | T_LeagueStandingsGroups;

export type T_LeagueStandingsRegular = {
	type: "REGULAR";
	items: Array<T_LeagueStandingsItem>;
	stats: {
		partidos_jugados: number;
		promedio_de_goles_anotados_por_partido: number;
		promedio_de_goles_anotados_de_local_por_partido: number;
		promedio_de_goles_anotados_de_visitante_por_partido: number;
	};
};

export type T_LeagueStandingsGroups = {
	type: "GROUPS";
	items: Array<Array<T_LeagueStandingsItem>>;
};

type T_LeagueStandingsItem = {
	teamId: number;
	teamName: string;
	points: number;
	stats: {
		all: {
			played: number;
			win: number;
			draw: number;
			lose: number;
			goals: {
				for: number;
				against: number;
				diff: number;
			};
		};
		home: {
			played: number;
			win: number;
			draw: number;
			lose: number;
			goals: {
				for: number;
				against: number;
			};
		};
		away: {
			played: number;
			win: number;
			draw: number;
			lose: number;
			goals: {
				for: number;
				against: number;
			};
		};
		averages: {
			promedio_de_goles_anotados_por_partido: number;
			promedio_de_goles_anotados_de_local_por_partido: number;
			promedio_de_goles_anotados_de_visitante_por_partido: number;
		};
	};
};

type T_TeamBase = {
	id: number;
	name: string;
	position: number | null;
	tag: "FEATURED" | "POOR" | "REGULAR";
	country: T_League["country"] | null;
	historic: boolean;
};

export type T_Team = T_TeamBase;

export type T_FixtureMatchTeam = T_FixtureNextMatchTeam | T_FixturePlayedMatchTeam;

export type T_FixtureNextMatchTeam = T_TeamBase & {
	stats: T_TeamStats;
	matches: Array<T_PlayedMatch>;
};

export type T_FixturePlayedMatchTeam = T_PlayedMatchTeam & {
	stats: T_TeamStats;
	matches: Array<T_PlayedMatch>;
};

export type T_PlayedMatchTeam = T_TeamBase & {
	result: "WIN" | "LOSE" | "DRAW";
	score: {
		fullTime: number;
		firstHalf: {
			for: number;
			against: number;
		};
		secondHalf: {
			for: number;
			against: number;
		};
		extraTime: {
			for: number | null;
			against: number | null;
		};
	};
};

type T_MatchBase = {
	id: string;
	fullDate: string;
	date: string;
	hour: string;
	league: Pick<T_League, "id" | "name" | "country" | "type">;
};

export type T_FixtureMatch = T_FixtureNextMatch | T_FixturePlayedMatch;

export type T_FixtureNextMatch = T_MatchBase & {
	type: "FIXTURE_NEXT_MATCH";
	played: false;
	teams: {
		home: T_FixtureNextMatchTeam;
		away: T_FixtureNextMatchTeam;
	};
	analysis: Array<T_NextMatchMarketAnalysis>;
};

export type T_FixturePlayedMatch = T_MatchBase & {
	type: "FIXTURE_PLAYED_MATCH";
	played: true;
	teams: {
		home: T_FixturePlayedMatchTeam;
		away: T_FixturePlayedMatchTeam;
	};
	analysis: Array<T_PlayedMatchMarketAnalysis>;
};

export type T_PlayedMatch = T_MatchBase & {
	type: "PLAYED_MATCH";
	played: true;
	teams: {
		home: T_PlayedMatchTeam;
		away: T_PlayedMatchTeam;
	};
	league: Pick<T_League, "id" | "name">;
};

export type T_TeamStats = Record<
	| "all-matches"
	| "all-home-matches"
	| "all-away-matches"
	| "last-matches"
	| "last-home-matches"
	| "last-away-matches",
	{
		name: string;
		items: T_TeamStatsItems;
	}
>;

export type T_TeamStatsItems = {
	total_de_partidos: number;

	total_de_goles_anotados: number;
	total_de_goles_recibidos: number;
	promedio_de_goles_anotados: number;
	promedio_de_goles_recibidos: number;
	partidos_con_goles_anotados: number;
	partidos_con_goles_recibidos: number;

	partidos_ganados: number;
	partidos_perdidos: number;
	partidos_empatados: number;

	puntos_ganados: number;
	porcentaje_de_puntos_ganados: number;

	total_de_goles_anotados_en_primera_mitad: number;
	total_de_goles_recibidos_en_primera_mitad: number;
	partidos_con_goles_anotados_en_primera_mitad: number;
	partidos_con_goles_recibidos_en_primera_mitad: number;
	promedio_de_partidos_con_goles_anotados_en_primera_mitad: number;
	promedio_de_partidos_con_goles_recibidos_en_primera_mitad: number;

	total_de_goles_anotados_en_segunda_mitad: number;
	total_de_goles_recibidos_en_segunda_mitad: number;
	partidos_con_goles_anotados_en_segunda_mitad: number;
	partidos_con_goles_recibidos_en_segunda_mitad: number;
	promedio_de_partidos_con_goles_anotados_en_segunda_mitad: number;
	promedio_de_partidos_con_goles_recibidos_en_segunda_mitad: number;
};

export type T_MarketAnalysis = T_NextMatchMarketAnalysis | T_PlayedMatchMarketAnalysis;

type T_MarketAnalysisBase = {
	id: string;
	name: string;
	shortName: string;
	confidenceLevel: "1|HIGH" | "2|MEDIUM" | "3|LOW";
	strategies: Array<{
		id: string;
		description: string;
		confidenceLevel: number;
		recommended: boolean;
		criteria: Array<{
			fulfilled: boolean;
			description: string;
			explanation: string;
		}>;
	}>;
};

export type T_NextMatchMarketAnalysis = T_MarketAnalysisBase;

export type T_PlayedMatchMarketAnalysis = Omit<T_MarketAnalysisBase, "strategies"> & {
	strategies: Array<
		T_MarketAnalysisBase["strategies"][number] & {
			results: {
				winning: boolean;
				lost: boolean;
				lostWinning: boolean;
				skippedLost: boolean;
			};
		}
	>;
};
