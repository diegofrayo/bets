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
			matches: Array<T_PlayedMatch>;
		};
		away: T_NextMatchTeam & {
			stats: T_TeamStats;
			matches: Array<T_PlayedMatch>;
		};
	};
	predictions: Array<T_NextMatchMarketPrediction>;
};

export type T_FixturePlayedMatch = T_Match & {
	played: true;
	teams: {
		home: T_PlayedMatchTeam & {
			stats: T_TeamStats;
			matches: Array<T_PlayedMatch>;
		};
		away: T_PlayedMatchTeam & {
			stats: T_TeamStats;
			matches: Array<T_PlayedMatch>;
		};
	};
	predictions: Array<T_PlayedMatchMarketPrediction>;
};

export type T_PlayedMatch = T_Match & {
	played: true;
	teams: {
		home: T_PlayedMatchTeam;
		away: T_PlayedMatchTeam;
	};
	league: Pick<T_League, "id" | "name">;
};

export type T_TeamStats = Array<{
	name: string;
	items: Record<string, string | number>;
}>;

export type T_MarketPrediction = {
	id: string;
	name: string;
	shortName: string;
	trustLevel: "HIGH" | "MEDIUM" | "LOW";
	criteria: Array<{
		description: string;
		fulfilled: boolean;
		items: Array<{
			fulfilled: boolean;
			description: string;
			explanation: string;
		}>;
	}>;
};

export type T_NextMatchMarketPrediction = T_MarketPrediction;

export type T_PlayedMatchMarketPrediction = T_MarketPrediction & {
	results: {
		right: boolean;
		lostRight: boolean;
		fail: boolean;
		skippedFail: boolean;
	};
};
