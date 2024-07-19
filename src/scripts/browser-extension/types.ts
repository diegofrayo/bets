export type T_SimpleBet = {
	type: "Sencilla";
	status: "PERDIDA" | "GANADA" | "EN_PROGRESO" | "NULA";
	date: string;
	name: string;
	details: string;
	teamA: string;
	teamB: string;
	quota: number;
	stake: number;
	payment: number;
};

export type T_MultipleBet = Pick<T_SimpleBet, "date" | "quota" | "status" | "stake" | "payment"> & {
	type: "Combinada";
	bets: Pick<T_SimpleBet, "name" | "details" | "teamA" | "teamB" | "quota">[];
};

export type T_Bet = T_SimpleBet | T_MultipleBet;

export type T_Bets = T_Bet[];

export interface I_BetHouse {
	name: "rushbet" | "wplay" | "betplay";
	getBetStatus(betElement: Element): T_SimpleBet["status"];
	getBetsElements(document: Document): NodeListOf<Element>;
	getBetType(betElement: Element): "Sencilla" | "Combinada";
	getBetDate(betElement: Element): string;
	getBetNameAndDetails(
		betElement: Element,
		teamA: string,
		teamB: string,
	): readonly [string, string];
	getBetTeams(betElement: Element): readonly [string, string];
	getBetQuota(betType: T_Bet["type"], betElement: Element): number;
	getBetStake(betElement: Element): number;
	getBetPayment(betElement: Element): number;
	getMultipleBetItemsElements(betElement: Element): NodeListOf<Element>;
	getBetItemQuota(betElement: Element): number;
	parseHTML(html: string): Document;
}

export type T_ReadBetsConfig = {
	betHouseName: I_BetHouse["name"];
	lastBetDate: string;
	lastBetId: number;
};
