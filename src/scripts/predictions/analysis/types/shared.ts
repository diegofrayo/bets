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
	type: string; // "League" | "Cup"
	priority: number;
	country: {
		code: string;
		name: string;
		flag: string;
	};
	season: number;
};

export type T_LeagueStandings = {
	type: "SIMPLE" | "GROUPS";
	items: Array<{
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
	}>;
	stats: {
		promedio_de_goles_anotados_por_partido: number;
		promedio_de_goles_anotados_de_local_por_partido: number;
		promedio_de_goles_anotados_de_visitante_por_partido: number;
	};
};

type T_TeamBase = {
	id: number;
	name: string;
	position: number | null;
	featured: boolean;
	country: T_League["country"] | null;
};

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
	score: number;
	winner: boolean | null;
};

type T_MatchBase = {
	id: string;
	fullDate: string;
	date: string;
	hour: string;
	league: Pick<T_League, "id" | "name" | "country">;
};

export type T_FixtureMatch = T_FixtureNextMatch | T_FixturePlayedMatch;

export type T_FixtureNextMatch = T_MatchBase & {
	type: "FIXTURE_NEXT_MATCH";
	played: false;
	teams: {
		home: T_FixtureNextMatchTeam;
		away: T_FixtureNextMatchTeam;
	};
	predictions: Array<T_NextMatchMarketPrediction>;
};

export type T_FixturePlayedMatch = T_MatchBase & {
	type: "FIXTURE_PLAYED_MATCH";
	played: true;
	teams: {
		home: T_FixturePlayedMatchTeam;
		away: T_FixturePlayedMatchTeam;
	};
	predictions: Array<T_PlayedMatchMarketPrediction>;
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
	partidos_ganados: number;
	partidos_perdidos: number;
	partidos_empatados: number;
	partidos_con_goles_anotados: number;
	partidos_con_goles_recibidos: number;
	puntos_ganados: number;
	porcentaje_de_puntos_ganados: number;
};

export type T_MarketPrediction = T_NextMatchMarketPrediction | T_PlayedMatchMarketPrediction;

type T_MarketPredictionBase = {
	id: string;
	name: string;
	shortName: string;
	trustLevel: number;
	trustLevelLabel: "HIGH" | "MEDIUM" | "LOW";
	criteria: Array<{
		description: string;
		trustLevel: number;
		fulfilled: boolean;
		items: Array<{
			fulfilled: boolean;
			description: string;
			explanation: string;
		}>;
	}>;
};

export type T_NextMatchMarketPrediction = T_MarketPredictionBase;

export type T_PlayedMatchMarketPrediction = T_MarketPredictionBase & {
	results: {
		winning: boolean;
		lost: boolean;
		lostWinning: boolean;
		skippedLost: boolean;
	};
};
