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
