import { type FirebaseOptions, initializeApp } from "firebase/app";
import {
	getDownloadURL,
	getStorage,
	ref as storageRef,
	uploadBytes,
	deleteObject,
} from "firebase/storage";
import { throwError } from "./misc";

const DATABASE_CONFIG: FirebaseOptions = {
	apiKey: process.env["DATABASE_API_KEY"] || throwError(`Invalid "DATABASE_API_KEY" value`),
	authDomain:
		process.env["DATABASE_AUTH_DOMAIN"] || throwError(`Invalid "DATABASE_AUTH_DOMAIN" value`),
	databaseURL: process.env["DATABASE_URL"] || throwError(`Invalid "DATABASE_URL" value`),
	storageBucket: process.env["STORAGE_URL"] || throwError(`Invalid "STORAGE_URL" value`),
};
const app = initializeApp(DATABASE_CONFIG);
const storage = getStorage(app);

// await DatabaseService.uploadFile(
// 	"bets/new.json",
// 	readFile(`${PATHS.MODULES_FOLDER}/home/data.json`, "blob"),
// );
function uploadFile(storageFilePath: string, blobFile: Buffer) {
	const fileRef = storageRef(storage, storageFilePath);
	return uploadBytes(fileRef, blobFile);
}

// const file = await DatabaseService.downloadFile("bets/new.json");
// writeFile(`${PATHS.MODULES_FOLDER}/home/data-1234.json`, file);
function downloadFile(storageFilePath: string) {
	const fileRef = storageRef(storage, storageFilePath);

	return getDownloadURL(fileRef).then(async (url) => {
		const blob = await (await fetch(url, { method: "GET" })).blob();
		const buffer = Buffer.from(await blob.arrayBuffer());
		return buffer;
	});
}

function fileExists() {}

function deleteFile(storageFilePath: string) {
	const fileRef = storageRef(storage, storageFilePath);
	return deleteObject(fileRef);
}

const StorageService = {
	uploadFile,
	downloadFile,
	fileExists,
	deleteFile,
};

export default StorageService;
