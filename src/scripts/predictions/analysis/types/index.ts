export * from "./shared";

export type T_RequestConfig = {
	date: string;
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
				}>
			>;
		};
	}>;
};
