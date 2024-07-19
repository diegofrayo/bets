import dayjs from "dayjs";
import axios from "axios";

import type DR from "../../@diegofrayo/types";
import { readFile, writeFile } from "../../@diegofrayo/utils/files";
import { addLeftPadding } from "../../@diegofrayo/utils/strings";

import { formatCode, formatDate } from "./utils";

const TIME_LIMIT = "10:30";
const RATE_LIMIT_PER_DAY = 100;
const instance = axios.create({
	baseURL: "https://api-football-v1.p.rapidapi.com/v3",
	headers: {
		"X-RapidAPI-Host": "api-football-v1.p.rapidapi.com",
		"X-RapidAPI-Key": "c6a400b2ccmsh2ffe9687266d19ep11447ejsn7a83d3f196c2",
	},
});
const API_USAGE_STATS = JSON.parse(
	readFile("src/scripts/predictions/data/util/api-limits.json"),
) as T_APIUsageStats;
let requestsCounter = -1;

const APIClient = {
	get: async (path: string, queryParams: DR.Object) => {
		if (requestsCounter === -1) {
			requestsCounter = readCounterStats();
		}

		if (requestsCounter >= RATE_LIMIT_PER_DAY) {
			throw new Error(`    Rate limit reached: ${JSON.stringify(queryParams)}`);
		} else {
			requestsCounter += 1;
			console.log(`    ${requestsCounter}. Fetching "${path}" | "${JSON.stringify(queryParams)}" `);
			await updateCounterStats(requestsCounter);
		}

		return instance.get(path, { params: queryParams });
	},
};

export default APIClient;

export async function calculateAPIUsageStats() {
	const VALUES = {
		RATE_LIMIT_PER_DAY: 100,
		AMOUNT_PER_REQUEST: 0.005,
		COP: 4000,
	};
	const monthDate = formatDate(new Date()).substring(0, 7);
	const monthRequests = Object.entries(API_USAGE_STATS["daily-requests"]).reduce(
		(result, [key, value]) => {
			if (value > VALUES.RATE_LIMIT_PER_DAY && key.startsWith(monthDate)) {
				return result + (value - VALUES.RATE_LIMIT_PER_DAY);
			}

			return result;
		},
		0,
	);

	API_USAGE_STATS.bills[monthDate] = {
		requests: monthRequests,
		paymentUSD: monthRequests * VALUES.AMOUNT_PER_REQUEST,
		paymentCOP: monthRequests * VALUES.AMOUNT_PER_REQUEST * VALUES.COP,
	};

	writeFile(
		"src/scripts/predictions/data/util/api-limits.json",
		await formatCode(API_USAGE_STATS, "json"),
	);
}

// --- UTILS ---

function readCounterStats() {
	return API_USAGE_STATS["daily-requests"][composeFormattedDate()] || 0;
}

async function updateCounterStats(counter: number) {
	API_USAGE_STATS["daily-requests"][composeFormattedDate()] = counter;

	writeFile(
		"src/scripts/predictions/data/util/api-limits.json",
		await formatCode(API_USAGE_STATS, "json"),
	);
}

function composeFormattedDate() {
	const date = new Date();
	let formattedDate;

	if (`${addLeftPadding(date.getHours())}:${addLeftPadding(date.getMinutes())}` < TIME_LIMIT) {
		formattedDate = dayjs().subtract(1, "day").toDate();
	} else {
		formattedDate = date;
	}

	return dateWithTime(formattedDate);
}

function dateWithTime(date: Date) {
	return `${formatDate(date)}T${TIME_LIMIT}`;
}

// --- TYPES ---

type T_APIUsageStats = {
	bills: DR.Object<{ requests: number; paymentUSD: number; paymentCOP: number }>;
	"daily-requests": DR.Object<number>;
};
