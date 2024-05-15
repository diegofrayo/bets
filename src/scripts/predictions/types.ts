export type T_RawMatchesResponse = {
	response: {
		teams: {
			home: { id: number; name: string; winner: boolean | null };
			away: { id: number; name: string; winner: boolean | null };
		};
		fixture: {
			date: string;
		};
		goals: {
			home: number | null;
			away: number | null;
		};
	}[];
};

export type T_RawLeagueStandingsResponse = {
	response: {
		league: {
			standings: {
				team: {
					id: number;
					name: string;
				};
				points: number;
				goalsDiff: number;
				all: {
					played: number;
					win: number;
					draw: number;
					lose: number;
					goals: {
						for: number;
						against: number;
					};
				};
			}[][];
		};
	}[];
};

export type T_RequestConfig = {
	date: string;
	enableRemoteAPI: boolean;
	fetchFromAPI: {
		FIXTURE_MATCHES: boolean;
		PLAYED_MATCHES: boolean;
		LEAGUE_STANDINGS: boolean;
	};
};

export type T_Output = {
	name: string;
	country: string;
	flag: string;
	standings: T_LeagueStandings;
	matches: T_FixtureMatch[];
}[];

export type T_LeagueStandings = {
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
}[][];

export type T_League = {
	enabled: boolean;
	id: number;
	name: string;
	type: string; // "League" | "Cup"
	country: string;
	flag: string;
	season: number;
};

export type T_Team = T_PlayedMatchTeam | T_NextMatchTeam;

export type T_PlayedMatchTeam = {
	id: number;
	name: string;
	country: string;
	score: number;
	winner: boolean | null;
	position: number | null;
	featured: boolean;
};

export type T_NextMatchTeam = {
	id: number;
	name: string;
	country: string;
	position: number | null;
	featured: boolean;
};

export type T_FixtureMatch = T_FixturePlayedMatch | T_FixtureNextMatch;

export type T_FixturePlayedMatch = {
	id: string;
	fullDate: string;
	date: string;
	hour: string;
	played: true;
	predictions?: T_PlayedMatchPrediction[];
	teams: {
		home: T_PlayedMatchTeam & {
			stats?: T_TeamStats;
			matches?: T_PlayedMatch[];
		};
		away: T_PlayedMatchTeam & {
			stats?: T_TeamStats;
			matches?: T_PlayedMatch[];
		};
	};
};

export type T_FixtureNextMatch = {
	id: string;
	fullDate: string;
	date: string;
	hour: string;
	played: false;
	predictions?: T_NextMatchPrediction[];
	teams: {
		home: T_NextMatchTeam & {
			stats?: T_TeamStats;
			matches?: T_PlayedMatch[];
		};
		away: T_NextMatchTeam & {
			stats?: T_TeamStats;
			matches?: T_PlayedMatch[];
		};
	};
};

export type T_Prediction = T_NextMatchPrediction | T_PlayedMatchPrediction;

export type T_NextMatchPrediction = {
	id: string;
	name: string;
	recommendable: boolean;
	acceptancePercentage: number;
	criteria: (
		| { description: string; check: string; weight: number }
		| { description: string; check: string; weight: number }[]
	)[];
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

export type T_PlayedMatch = {
	id: string;
	fullDate: string;
	date: string;
	hour: string;
	played: true;
	teams: {
		home: T_PlayedMatchTeam;
		away: T_PlayedMatchTeam;
	};
};

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
