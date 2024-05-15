import { addLeftPadding } from "../../@diegofrayo/utils/strings";
import { getTextContent, getTextContentAsNumber, parseHTML } from "./utils";
import { type T_Bet, type I_BetHouse } from "./types";

class WPlay implements I_BetHouse {
	private COMMON_SELECTORS = {
		BETS: ".bet-row",
		BET_STATUS: ".overview > td",
		BET_TYPE: ".bet-details .bet-leg",
		BET_DATE: ".overview .date-status",
		BET_NAME_AND_DETAILS: ".expander-content .bet-leg .bet-part > td",
		BET_TEAMS: ".expander-content .bet-leg .bet-part > td",
		BET_STAKE: ".overview .number.stake",
		BET_PAYMENT: ".overview > td",
	};
	private SIMPLE_BETS_SELECTORS = {
		BET_QUOTA: ".overview > td",
	};
	private MULTIPLE_BETS_SELECTORS = {
		BET_QUOTA: ".overview > td",
		BET_ITEMS: ".expander-content .bet-leg",
		BET_ITEM_QUOTA: "td.number",
	};

	public name = "wplay" as const;

	getBetsElements(document: Document) {
		return document.querySelectorAll(this.COMMON_SELECTORS.BETS);
	}

	getBetStatus(betElement: Element) {
		const result = betElement.querySelectorAll(this.COMMON_SELECTORS.BET_STATUS);
		const betStatus = getTextContent(result[8]);

		if (betStatus === "Ganar") {
			return "GANADA";
		}

		if (betStatus === "Perder") {
			return "PERDIDA";
		}

		return "EN_PROGRESO";
	}

	getBetType(betElement: Element) {
		const betItems = betElement.querySelectorAll(this.COMMON_SELECTORS.BET_TYPE);

		return betItems.length > 1 ? "Combinada" : "Sencilla";
	}

	getBetDate(betElement: Element) {
		const year = new Date().getFullYear();
		const [day, month] = (
			betElement.querySelector(this.COMMON_SELECTORS.BET_DATE)?.textContent || ""
		)
			.toLowerCase()
			.split(" ");

		return `${year}/${month}/${addLeftPadding(Number(day))}`;
	}

	getBetNameAndDetails(betElement: Element, teamA: string, teamB: string) {
		const result = betElement.querySelectorAll(this.COMMON_SELECTORS.BET_NAME_AND_DETAILS);

		const name = getTextContent(result[2]);
		const details = getTextContent(result[3]).replace(teamA, "Local").replace(teamB, "Visitante");

		return [name, details] as const;
	}

	getBetTeams(betElement: Element) {
		const result = betElement.querySelectorAll(this.COMMON_SELECTORS.BET_TEAMS);
		const [teamA, teamB] = getTextContent(result[1]).split(" v ");

		return [teamA, teamB] as const;
	}

	getBetQuota(_: T_Bet["type"], betElement: Element) {
		const result = betElement.querySelectorAll(this.SIMPLE_BETS_SELECTORS.BET_QUOTA);

		return Number(getTextContent(result[5]));
	}

	getBetStake(betElement: Element) {
		const stake = getTextContentAsNumber(betElement.querySelector(this.COMMON_SELECTORS.BET_STAKE));

		return stake;
	}

	getBetPayment(betElement: Element) {
		const result = betElement.querySelectorAll(this.COMMON_SELECTORS.BET_PAYMENT);
		const payment = getTextContentAsNumber(result[7]);

		return payment;
	}

	getMultipleBetItemsElements(betElement: Element) {
		return betElement.querySelectorAll(this.MULTIPLE_BETS_SELECTORS.BET_ITEMS);
	}

	getBetItemQuota(betElement: Element) {
		return Number(
			getTextContent(betElement.querySelector(this.MULTIPLE_BETS_SELECTORS.BET_ITEM_QUOTA)),
		);
	}

	parseHTML(html: string) {
		return parseHTML(html);
	}
}

export default WPlay;
