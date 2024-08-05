import type DR from "../../../../@diegofrayo/types";

export * from "./shared";

export type T_RequestConfig = {
	date: DR.Dates.DateString;
	enableRemoteAPI: boolean;
	fetchFromAPI: {
		FIXTURE_MATCHES: boolean;
		PLAYED_MATCHES: boolean;
		LEAGUE_STANDINGS: boolean;
	};
};

export type T_RawMatchesResponse = {
	response: Array<{
		teams: {
			home: { id: number; name: string; winner: boolean | null };
			away: { id: number; name: string; winner: boolean | null };
		};
		league: {
			id: number;
			name: string;
			country: string;
		};
		fixture: {
			id: number;
			date: string;
		};
		goals: {
			home: number | null;
			away: number | null;
		};
	}>;
};

export type T_RawLeagueStandingsResponse = {
	response: Array<{
		league: {
			id: number;
			standings: Array<
				Array<{
					team: {
						id: number;
						name: string;
					};
					points: number;
					goalsDiff: number;
					group: string;
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
				}>
			>;
		};
	}>;
};

export type T_LeaguesFile = {
	items: Array<{
		enabled: boolean;
		id: number;
		name: string;
		type: string;
		country: { code: string; name: string; flag: string };
		season: number;
		priority: number;
	}>;
	fixtures: Record<string, Array<string>>;
};

export type T_TeamsFile = DR.Object<T_TeamsFileItem>;

export type T_TeamsFileItem = {
	name: string;
	country: { code: string; name: string; flag: string } | null;
};

export type T_PredictionsStatsFile = DR.Object<{
	stats: {
		winning: number;
		lost: number;
		lostWinning: number;
		skippedLost: number;
		total: number;
	};
	record: {
		winning: DR.Object<Array<string>>;
		lost: DR.Object<Array<string>>;
		lostWinning: DR.Object<Array<string>>;
		skippedLost: DR.Object<Array<string>>;
	};
}>;
