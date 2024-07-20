export type T_DayOfMatches = Array<
	Omit<T_League, "enabled" | "season" | "order"> & {
		standings: T_LeagueStandings;
		matches: T_FixtureMatch[];
	}
>;

export type T_League = {
	id: number;
	enabled: boolean;
	name: string;
	type: string; // "League" | "Cup"
	order: number;
	country: string;
	flag: string;
	season: number;
};

export type T_LeagueStandings = Array<
	Array<{
		teamId: number;
		teamName: string;
		points: number;
		stats: {
			goalsDiff: number;
			played: number;
			win: number;
			draw: number;
			lose: number;
			goals: {
				for: number;
				against: number;
			};
		};
	}>
>;

export type T_Team = T_NextMatchTeam | T_PlayedMatchTeam;

type T_TeamBase = {
	id: number;
	name: string;
	country: string;
	position: number | null;
	featured: boolean;
};

export type T_NextMatchTeam = T_TeamBase;

export type T_PlayedMatchTeam = T_TeamBase & {
	score: number;
	winner: boolean | null;
};

export type T_FixtureMatch = T_FixtureNextMatch | T_FixturePlayedMatch;

type T_Match = {
	id: string;
	fullDate: string;
	date: string;
	hour: string;
};

export type T_FixtureNextMatch = T_Match & {
	played: false;
	teams: {
		home: T_NextMatchTeam & {
			stats: T_TeamStats;
			matches: T_PlayedMatch[];
		};
		away: T_NextMatchTeam & {
			stats: T_TeamStats;
			matches: T_PlayedMatch[];
		};
	};
	// predictions?: T_NextMatchPrediction[];
};

export type T_FixturePlayedMatch = T_Match & {
	played: true;
	teams: {
		home: T_PlayedMatchTeam & {
			stats: T_TeamStats;
			matches: T_PlayedMatch[];
		};
		away: T_PlayedMatchTeam & {
			stats: T_TeamStats;
			matches: T_PlayedMatch[];
		};
	};
	// predictions?: T_PlayedMatchPrediction[];
};

export type T_PlayedMatch = T_Match & {
	played: true;
	teams: {
		home: T_PlayedMatchTeam;
		away: T_PlayedMatchTeam;
	};
};

export type T_TeamStats = Record<string, number>;

/*
export type T_TeamStats = {
	total_de_partidos: number;
	total_de_goles: number;
	total_de_goles_recibidos: number;
	promedio_de_goles: number;
	promedio_de_goles_recibidos: number;
	"---|---": number;
	partidos_de_local: number;
	goles_de_local: number;
	promedio_de_goles_de_local: number;
	partidos_ganados_de_local: number;
	partidos_perdidos_de_local: number;
	partidos_empatados_de_local: number;
	partidos_con_goles_de_local: number;
	porcentaje_de_puntos_ganados_de_local: number;
	"---||---": number;
	partidos_de_visitante: number;
	goles_de_visitante: number;
	promedio_de_goles_de_visitante: number;
	partidos_ganados_de_visitante: number;
	partidos_perdidos_de_visitante: number;
	partidos_empatados_de_visitante: number;
	partidos_con_goles_de_visitante: number;
	porcentaje_de_puntos_ganados_de_visitante: number;
	"---|||---": number;
	ultimos_total_de_partidos: number;
	ultimos_total_de_goles: number;
	ultimos_promedio_de_goles: number;
	"---||||---": number;
	ultimos_partidos_de_local: number;
	ultimos_goles_de_local: number;
	ultimos_promedio_de_goles_de_local: number;
	ultimos_partidos_ganados_de_local: number;
	ultimos_partidos_perdidos_de_local: number;
	ultimos_partidos_empatados_de_local: number;
	ultimos_partidos_con_goles_de_local: number;
	"---|||||---": number;
	ultimos_partidos_de_visitante: number;
	ultimos_goles_de_visitante: number;
	ultimos_promedio_de_goles_de_visitante: number;
	ultimos_partidos_ganados_de_visitante: number;
	ultimos_partidos_perdidos_de_visitante: number;
	ultimos_partidos_empatados_de_visitante: number;
	ultimos_partidos_con_goles_de_visitante: number;
};
*/

/*
export type T_Prediction = T_NextMatchPrediction | T_PlayedMatchPrediction;

export type T_NextMatchPrediction = {
	id: string;
	name: string;
	recommendable: boolean;
	acceptanceCriteria: () => boolean;
	criteria: Array<{
		id: string;
		name: string;
		weight: number;
		recommendable: boolean;
		acceptancePercentage: number;
		criteria: Array<{
			enabled: boolean;
			description: string;
			weight: number;
			check: string;
		}>;
	}>;
	warnings: {
		description: string;
	}[];
};

export type T_PlayedMatchPrediction = T_NextMatchPrediction & {
	right: boolean;
	lostRight: boolean;
	fail: boolean;
	skippedFail: boolean;
};
*/
