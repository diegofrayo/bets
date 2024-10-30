import {
	getDownloadURL,
	getStorage,
	ref as storageRef,
	uploadBytes,
	deleteObject,
} from "firebase/storage";
import { app } from "./_config";

const storage = getStorage(app);

function uploadFile(storageFilePath: string, blobFile: Buffer) {
	const fileRef = storageRef(storage, storageFilePath);
	return uploadBytes(fileRef, blobFile);
}

function downloadFile(storageFilePath: string) {
	const fileRef = storageRef(storage, storageFilePath);

	return getDownloadURL(fileRef).then(async (url) => {
		const blob = await (await fetch(url, { method: "GET" })).blob();
		const buffer = Buffer.from(await blob.arrayBuffer());
		return buffer;
	});
}

function getFileURL(storageFilePath: string) {
	const fileRef = storageRef(storage, storageFilePath);
	return getDownloadURL(fileRef);
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
	getFileURL,
};

export default StorageService;
