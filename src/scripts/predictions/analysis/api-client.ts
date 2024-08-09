import dayjs from "dayjs";
import axios from "axios";

import type DR from "../../../@diegofrayo/types";
import { readFile, writeFile } from "../../../@diegofrayo/utils/files";
import { delay } from "../../../@diegofrayo/utils/misc";
import { addLeftPadding } from "../../../@diegofrayo/utils/strings";
import v from "../../../@diegofrayo/v";

import { formatCode, formatDate } from "./utils";

const TIME_LIMIT = "10:30";
const RATE_LIMIT_PER_DAY = 200;
const REQUESTS_LIMIT_PER_MINUTE = 30;
const API_USAGE_STATS = JSON.parse(
	readFile("src/scripts/predictions/data/util/api-limits.json"),
) as T_APIUsageStats;
let totalRequestsCounter = -1;
let requestsLimitPerMinuteCounter = 0;

const instance = axios.create({
	baseURL: "https://api-football-v1.p.rapidapi.com/v3",
	headers: {
		"X-RapidAPI-Host": process.env["X-RapidAPI-Host"],
		"X-RapidAPI-Key": process.env["X-RapidAPI-Key"],
	},
});

// --- API ---

const APIClient = {
	async get(path: string, queryParams: DR.Object) {
		if (totalRequestsCounter === -1) {
			if (dayjs(new Date()).diff(API_USAGE_STATS["last-request-execution"], "seconds") < 60) {
				console.log(
					"    .....",
					"First execution delay for 1:30 minutes |",
					new Date().toISOString(),
					".....",
				);
				await delay(1000 * 90);
			}

			totalRequestsCounter = readCounterStats();
		}

		if (totalRequestsCounter >= RATE_LIMIT_PER_DAY) {
			throw new Error(`    Rate limit reached: ${JSON.stringify(queryParams)}`);
		} else {
			totalRequestsCounter += 1;
			requestsLimitPerMinuteCounter += 1;
			console.log(
				`    ${totalRequestsCounter}. Fetching "${path}" | "${JSON.stringify(queryParams)}" `,
			);
			await updateCounterStats(totalRequestsCounter);
			await checkForAPIRequestsPerMinuteLimit();
		}

		const output = await instance.get(path, { params: queryParams });

		if ("errors" in output.data && !v.isEmptyArray(output.data.errors)) {
			throw new Error(JSON.stringify(output.data.errors));
		}

		return output;
	},

	async calculateUsageStats() {
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
	},
};

export default APIClient;

// --- UTILS ---

function readCounterStats() {
	return API_USAGE_STATS["daily-requests"][composeFormattedDate()] || 0;
}

async function updateCounterStats(counter: number) {
	API_USAGE_STATS["daily-requests"][composeFormattedDate()] = counter;
	API_USAGE_STATS["last-request-execution"] = new Date().getTime();

	writeFile(
		"src/scripts/predictions/data/util/api-limits.json",
		await formatCode(API_USAGE_STATS, "json"),
	);
}

async function checkForAPIRequestsPerMinuteLimit() {
	if (requestsLimitPerMinuteCounter >= REQUESTS_LIMIT_PER_MINUTE) {
		console.log("    .....", "Delay for 1:30 minutes |", new Date().toISOString(), ".....");

		await delay(1000 * 90);
		requestsLimitPerMinuteCounter = 0;

		console.log(
			"    .....",
			"Script execution continues again |",
			new Date().toISOString(),
			".....",
		);
	}
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
	"last-request-execution": number;
};
