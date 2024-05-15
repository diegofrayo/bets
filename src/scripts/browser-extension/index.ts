import BetHouseClass from "./bethouse";
import Betplay from "./betplay";
import Rushbet from "./rushbet";
import WPlay from "./wplay";
import { type T_ReadBetsConfig } from "./types";

export const BetsService = {
	readBets: function readBets(domHTML: string, config: T_ReadBetsConfig) {
		const BetHouse = new BetHouseClass(
			config.betHouseName === "rushbet"
				? new Rushbet()
				: config.betHouseName === "wplay"
				? new WPlay()
				: new Betplay(),
		);
		const bets = BetHouse.extractBetsData(BetHouse.parseHTML(domHTML), config);

		return bets;
	},
};

/*
// npm run script:bets
function main() {
	try {
		const BetHouse = new BetHouseClass(new Betplay());
		const htmlTemplate = readFile("./src/scripts/bets/templates/betplay.html");

		const bets = BetHouse.extractBetsData(BetHouse.parseHTML(htmlTemplate), {
			betHouseName: "betplay",
			lastBetDate: "",
			lastBetId: 0,
		});
		console.log(bets);

		console.log(`"bets" executed successfully`);
		process.exit();
	} catch (error) {
		console.log(error);
		process.exit(1);
	}
}

main();
*/
