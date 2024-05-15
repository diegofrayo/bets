import { toSentenceCase } from "js-convert-case";
import { replaceAll } from "../../@diegofrayo/utils/strings";
import {
	type T_Bets,
	type I_BetHouse,
	type T_MultipleBet,
	type T_Bet,
	type T_ReadBetsConfig,
} from "./types";

class BetHouse {
	public betHouse;

	constructor(betHouse: I_BetHouse) {
		this.betHouse = betHouse;
	}

	extractBetsData(document: Document, configParam: T_ReadBetsConfig): string {
		const bets: T_Bets = [];
		const config = {
			...configParam,
			lastBetDate: replaceAll(configParam.lastBetDate || "", "-", "/"),
		};

		this.betHouse.getBetsElements(document).forEach((betElement) => {
			const betType = this.betHouse.getBetType(betElement);

			if (betType === "Sencilla") {
				const date = this.parseBetDate(this.betHouse.getBetDate(betElement));
				const status = this.betHouse.getBetStatus(betElement);
				const [teamA, teamB] = this.betHouse.getBetTeams(betElement);
				const [name, details] = this.betHouse.getBetNameAndDetails(betElement, teamA, teamB);
				const quota = this.betHouse.getBetQuota(betType, betElement);
				const stake = this.betHouse.getBetStake(betElement);
				const payment = this.calculatePayment(this.betHouse.getBetPayment(betElement), stake);

				const bet = {
					type: "Sencilla",
					status,
					date,
					name,
					details: this.parseBetDetails(details),
					teamA,
					teamB,
					quota,
					stake,
					payment,
				} as const;

				bets.push(bet);
			} else {
				const date = this.parseBetDate(this.betHouse.getBetDate(betElement));
				const status = this.betHouse.getBetStatus(betElement);
				const quota = this.betHouse.getBetQuota(betType, betElement);
				const stake = this.betHouse.getBetStake(betElement);
				const payment = this.calculatePayment(this.betHouse.getBetPayment(betElement), stake);

				const bet = {
					type: "Combinada" as const,
					status,
					date,
					quota,
					stake,
					payment,
					bets: [],
				} as T_MultipleBet;

				this.betHouse.getMultipleBetItemsElements(betElement).forEach((betElement) => {
					const [teamA, teamB] = this.betHouse.getBetTeams(betElement);
					const [name, details] = this.betHouse.getBetNameAndDetails(betElement, teamA, teamB);
					const quota = this.betHouse.getBetItemQuota(betElement);

					bet.bets.push({
						name,
						details: this.parseBetDetails(details),
						teamA,
						teamB,
						quota,
					});
				});

				bets.push(bet);
			}
		});

		return this.toCSV(
			bets
				.filter((bet) => {
					if ((config.lastBetDate && bet.date >= config.lastBetDate) || !config.lastBetDate) {
						return true;
					}

					return false;
				})
				.reverse(),
			config,
		);
	}

	parseHTML(html: string): Document {
		return this.betHouse.parseHTML(html);
	}

	private toCSV(bets: T_Bet[], config: T_ReadBetsConfig): string {
		return bets
			.map((bet, index) => {
				const betId = (config.lastBetId || 1) + index;

				if (bet.type === "Combinada") {
					return [
						[
							this.parseNumber(betId + 0.1),
							"Combinada",
							"Combinada",
							"Combinada",
							"Combinada",
							this.parseBetQuota(this.parseNumber(bet.quota)),
							bet.date,
							this.parseBetHouseName(config.betHouseName),
							bet.stake,
							"",
							bet.status,
						].join(";"),
					]
						.concat(
							bet.bets.map((betItem) => {
								return [
									this.parseNumber(betId),
									betItem.teamA,
									betItem.teamB,
									this.parseBetName(betItem.name),
									betItem.details,
									this.parseBetQuota(this.parseNumber(betItem.quota)),
									bet.date,
									this.parseBetHouseName(config.betHouseName),
								].join(";");
							}),
						)
						.join("\n");
				}

				return [
					this.parseNumber(betId),
					bet.teamA,
					bet.teamB,
					this.parseBetName(bet.name),
					bet.details,
					this.parseNumber(bet.quota),
					bet.date,
					this.parseBetHouseName(config.betHouseName),
					bet.stake,
					"",
					bet.status,
				].join(";");
			})
			.join("\n");
	}

	private parseBetDate(betDate: string) {
		return betDate
			.replace("ene", "01")
			.replace("feb", "02")
			.replace("mar", "03")
			.replace("abr", "04")
			.replace("may", "05")
			.replace("jun", "06")
			.replace("jul", "06");
	}

	private parseBetName(betName: string) {
		return toSentenceCase(betName)
			.replace("Ambos equipos marcar n", "Ambos equipos marcarán")
			.replace("Resultado tiempo completo", "Tiempo reglamentario");
	}

	private parseBetDetails(betDetails: string) {
		return betDetails.replace(" o ", "/");
	}

	private parseBetHouseName(betHouseName: string) {
		return toSentenceCase(betHouseName).replace("Wp", "WP");
	}

	private parseBetQuota(betQuota: string) {
		return betQuota === "0" ? "" : betQuota;
	}

	private calculatePayment(payment: number, stake: number) {
		if (payment) {
			return payment;
		}

		return stake * -1;
	}

	private parseNumber(number: number) {
		return String(number).replace(".", ",");
	}
}

export default BetHouse;
