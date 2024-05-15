import { addLeftPadding } from "../../@diegofrayo/utils/strings";
import { getTextContent, getTextContentAsNumber, parseHTML } from "./utils";
import { type T_Bet, type I_BetHouse } from "./types";

class Betplay implements I_BetHouse {
	private COMMON_SELECTORS = {
		BETS: ".KambiBC-react-collapsable-container",
		BET_STATUS: ".KambiBC-my-bets-summary__coupon-status",
		BET_TYPE: ".KambiBC-my-bets-summary__coupon-top-left .KambiBC-my-bets-summary__title",
		BET_DATE: ".KambiBC-my-bets-summary__coupon-top-right .KambiBC-my-bets-summary__coupon-date",
		BET_NAME:
			".KambiBC-my-bets-summary__coupon-bottom-left .KambiBC-my-bets-summary-coupon__event-list-name > span",
		BET_TEAMS:
			".KambiBC-my-bets-summary__coupon-bottom-left .KambiBC-my-bets-summary-coupon__outcome-name",
		BET_STAKE:
			".KambiBC-my-bets-summary__coupon-bottom-right .KambiBC-my-bets-summary__stake-value",
		BET_PAYMENT:
			".KambiBC-my-bets-summary__coupon-bottom-right .KambiBC-my-bets-summary-payout__value",
	};
	private SIMPLE_BETS_SELECTORS = {
		BET_QUOTA:
			".KambiBC-my-bets-summary__coupon-top-left .KambiBC-my-bets-summary__value .KambiBC-my-bets-summary__value",
	};
	private MULTIPLE_BETS_SELECTORS = {
		BET_QUOTA:
			".KambiBC-my-bets-summary__coupon-bottom-left .KambiBC-my-bets-summary__odds-bog .KambiBC-my-bets-summary__value",
		BET_ITEMS: ".KambiBC-my-bets-summary-coupon__event-list > div",
		BET_ITEM_QUOTA: ".KambiBC-my-bets-summary__value",
	};

	public name = "betplay" as const;

	getBetsElements(document: Document) {
		return document.querySelectorAll(this.COMMON_SELECTORS.BETS);
	}

	getBetStatus(betElement: Element) {
		const betStatus = getTextContent(
			betElement.querySelector(this.COMMON_SELECTORS.BET_STATUS),
		).toUpperCase();

		if (betStatus === "GANADA" || betStatus === "PERDIDA") {
			return betStatus;
		}

		return "EN_PROGRESO";
	}

	getBetType(betElement: Element) {
		const betType = getTextContent(betElement.querySelector(this.COMMON_SELECTORS.BET_TYPE));

		if (betType === "Sencilla") {
			return betType;
		}

		return "Combinada";
	}

	getBetDate(betElement: Element) {
		const [day, month, year] = (
			betElement.querySelector(this.COMMON_SELECTORS.BET_DATE)?.textContent || ""
		)
			.split(" • ")[0]
			.toLowerCase()
			.split(" de ");

		return `${year}/${month}/${addLeftPadding(Number(day))}`;
	}

	getBetNameAndDetails(betElement: Element, teamA: string, teamB: string) {
		const result = (betElement.querySelector(this.COMMON_SELECTORS.BET_NAME)?.textContent || "")
			.split("@")[0] // TODO: Remove this when getTextContent function is refactored
			.trim()
			.split(":")
			.map((item) => item.trim());

		let name = result[0]
			.replace("1.ª", "1ra")
			.replace("2.ª", "2da")
			.replace("1ª", "1ra")
			.replace("2ª", "2da");
		let details = result[1]
			.replace("Menos de ", "<")
			.replace("Más de ", ">")
			.replace(teamA, "Local")
			.replace(teamB, "Visitante");

		if (name.includes(teamA)) {
			name = name.replace(teamA, "por equipo").replace("de por", "por");
			details = `${details} (Local)`;
		} else if (name.includes(teamB)) {
			name = name.replace(teamB, "por equipo").replace("de por", "por");
			details = `${details} (Visitante)`;
		}

		if (name === "2da parte") {
			name = "Medio tiempo (2da parte)";
		} else if (name === "1ra parte") {
			name = "Medio tiempo (1ra parte)";
		}

		name = name.replace("a favor por equipo", "por equipo");

		return [name, details] as const;
	}

	getBetTeams(betElement: Element) {
		const [teamA, teamB] = (
			betElement.querySelector(this.COMMON_SELECTORS.BET_TEAMS)?.textContent || ""
		).split(" - ") || ["", ""];

		return [teamA, teamB] as const;
	}

	getBetQuota(betType: T_Bet["type"], betElement: Element) {
		// TODO: Refactor getTextContent uses
		// TODO: Issue getting Doble bets quota
		return Number(
			getTextContent(
				betElement.querySelector(
					betType === "Combinada"
						? this.MULTIPLE_BETS_SELECTORS.BET_QUOTA
						: this.SIMPLE_BETS_SELECTORS.BET_QUOTA,
				),
			),
		);
	}

	getBetStake(betElement: Element) {
		const stake = getTextContentAsNumber(betElement.querySelector(this.COMMON_SELECTORS.BET_STAKE));

		return stake;
	}

	getBetPayment(betElement: Element) {
		const payment = getTextContentAsNumber(
			betElement.querySelector(this.COMMON_SELECTORS.BET_PAYMENT),
		);

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

export default Betplay;
