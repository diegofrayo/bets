import { type FirebaseOptions, initializeApp } from "firebase/app";

const { DATABASE_API_KEY, DATABASE_AUTH_DOMAIN, DATABASE_URL, STORAGE_URL } = process.env;

if (!DATABASE_API_KEY || !DATABASE_AUTH_DOMAIN || !DATABASE_URL || !STORAGE_URL) {
	throw new Error("Invalid env vars");
}

const config: FirebaseOptions = {
	apiKey: DATABASE_API_KEY,
	authDomain: DATABASE_AUTH_DOMAIN,
	databaseURL: DATABASE_URL,
	storageBucket: STORAGE_URL,
};

export const app = initializeApp(config);
