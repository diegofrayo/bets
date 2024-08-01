// @ts-nocheck

import type { T_MarketPrediction, type T_PredictionsInput } from "../types";
import { analizeCriteria, calculateTrustLevel } from "./utils";

function doubleOpportunityPrediction(predictionsInput: T_PredictionsInput): T_MarketPrediction {
	const criteria = [];
	const analyzedCriteria = analizeCriteria(criteria, predictionsInput);

	return {
		id: "doble-oportunidad",
		name: "Doble Oportunidad",
		shortName: "DO",
		trustLevel: calculateTrustLevel(analyzedCriteria),
		criteria: analyzedCriteria,
	};
}

export default doubleOpportunityPrediction;

/*
function organize() {
	readFolderFiles("src/scripts/predictions/data/output/standings", {
		recursive: true,
		includeDirectories: true,
		includeTheseExtensions: ["json"],
	}).forEach((file) => {
		const parentFolderPathName = file.parentFolderPath.split("/").reverse()[0].substring(11);
		renameFile(file.path, {
			newFilePath: `src/scripts/predictions/data/output/standings/${parentFolderPathName}`,
			newFileName: file.name,
		});
	});
}
*/
