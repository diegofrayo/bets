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
		fixture: {
			id: number;
			date: string;
			status: { long: "Not Started" | "Match Finished" | "Match Postponed"; short: string };
		};
		league: {
			id: number;
			name: string;
			country: string;
		};
		teams: {
			home: { id: number; name: string; winner: boolean | null };
			away: { id: number; name: string; winner: boolean | null };
		};
		goals: {
			home: number | null;
			away: number | null;
		};
		score: {
			halftime: { home: number; away: number };
			fulltime: { home: number; away: number };
			extratime: { home: number | null; away: number | null };
		};
	}>;
	errors: [] | DR.JSON;
};

export type T_RawLeagueStandingsResponse = {
	response: Array<{
		league: {
			id: number;
			country: string;
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
		season: { year: number; startDate: string };
		priority: number;
	}>;
	fixtures: Record<string, Array<string>>;
};

export type T_TeamsFile = DR.Object<T_TeamsFileItem>;

export type T_TeamsFileItem = {
	name: string;
	historic: boolean;
	country: { code: string; name: string; flag: string } | null;
};

export type T_PredictionsStatsFile = {
	stats: DR.Object<
		DR.Object<{
			description: string;
			winning: number;
			lost: number;
			lostWinning: number;
			skippedLost: number;
			total: number;
			successPercentaje: number;
			picksPercentaje: number;
		}>
	>;
	records: DR.Object<
		DR.Object<{
			description: string;
			winning: DR.Object<Array<string>>;
			lost: DR.Object<Array<string>>;
			lostWinning: DR.Object<Array<string>>;
			skippedLost: DR.Object<Array<string>>;
		}>
	>;
};
