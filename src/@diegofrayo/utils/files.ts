import * as fs from "fs";
import path from "path";

import v from "../v";

export function writeFile(filePath: string, data: unknown) {
	prepareFilePathFolder(filePath);
	fs.writeFileSync(filePath, typeof data === "string" ? data : JSON.stringify(data));
}

export function readFile(filePath: string) {
	return fs.readFileSync(filePath).toString().trimEnd();
}

export function copyFolder(sourcePath: string, targetPath: string) {
	const targetFolder = path.resolve(targetPath, path.basename(sourcePath));

	if (!fs.existsSync(targetFolder)) {
		fs.mkdirSync(targetFolder, { recursive: true });
	}

	if (fs.lstatSync(sourcePath).isDirectory()) {
		const files = fs.readdirSync(sourcePath);
		files.forEach((fileName) => {
			const filePath = path.resolve(sourcePath, fileName);

			if (fs.lstatSync(filePath).isDirectory()) {
				copyFolder(filePath, targetFolder);
			} else {
				copyFile(filePath, { outputFolderPath: targetFolder });
			}
		});
	}
}

export function copyFile(
	filePath: string,
	opts: { outputFolderPath: string; outputFileName?: string },
) {
	prepareFilePathFolder(opts.outputFolderPath, true);

	fs.copyFileSync(
		filePath,
		path.resolve(opts.outputFolderPath, opts.outputFileName || path.basename(filePath)),
	);
}

export type T_CustomFile = {
	filePath: string;
	fileName: string;
	baseName: string;
	stats: fs.Stats;
	ext: string;
	isDirectory: boolean;
	parentFolderPath: string;
	parentFolderName: string;
};

interface I_ReadFolderFilesOpts1 {
	includeDirectories?: boolean;
	recursive?: boolean;
	includeTheseExtensions: string[];
	includeMediaFiles?: never;
	includeImages?: never;
}

interface I_ReadFolderFilesOpts2 {
	includeDirectories?: boolean;
	recursive?: boolean;
	includeTheseExtensions?: never;
	includeMediaFiles: true;
	includeImages?: never;
}

interface I_ReadFolderFilesOpts3 {
	includeDirectories?: boolean;
	recursive?: boolean;
	includeTheseExtensions?: never;
	includeMediaFiles?: never;
	includeImages: true;
}

type T_ReadFolderFilesOpts =
	| I_ReadFolderFilesOpts1
	| I_ReadFolderFilesOpts2
	| I_ReadFolderFilesOpts3;

export function readFolderFiles(
	sourceFolderPath: string,
	opts?: T_ReadFolderFilesOpts,
): T_CustomFile[] {
	return fs.readdirSync(sourceFolderPath).reduce((result: T_CustomFile[], fileName) => {
		const filePath = path.resolve(sourceFolderPath, fileName);
		const stats = fs.statSync(filePath);
		const { ext, name } = path.parse(filePath);
		const file = {
			filePath,
			fileName,
			baseName: name,
			stats,
			ext: ext.toLowerCase().slice(1),
			isDirectory: stats.isDirectory(),
			parentFolderPath: path.dirname(filePath),
			parentFolderName: path.basename(path.dirname(filePath)),
		};

		if (opts?.recursive && file.isDirectory) {
			return [...result, ...readFolderFiles(file.filePath, opts)];
		}

		if (
			!opts ||
			(opts.includeDirectories && file.isDirectory) ||
			(v.isBoolean(opts.includeMediaFiles) && isMediaFile(file.ext)) ||
			(v.isBoolean(opts.includeImages) && isImageFile(file.ext)) ||
			(v.isArray(opts.includeTheseExtensions) && opts.includeTheseExtensions.includes(file.ext))
		) {
			return result.concat([file]);
		}

		return result;
	}, []);
}

export function createFolder(outputFolderPath: string) {
	fs.mkdirSync(outputFolderPath, { recursive: true });
}

export function fileExists(filePath: string) {
	return fs.existsSync(filePath);
}

export function renameFile(
	currentFilePath: string,
	opts: { newFilePath?: string; newFileName: string },
) {
	if (opts.newFilePath) {
		prepareFilePathFolder(opts.newFilePath, true);
		fs.renameSync(currentFilePath, path.resolve(opts.newFilePath, opts.newFileName));
	} else if (opts.newFileName) {
		fs.renameSync(currentFilePath, path.resolve(path.dirname(currentFilePath), opts.newFileName));
	} else {
		throw new Error("Wrong 'opts' param passed in 'renameFile' function");
	}
}

export function isMediaFile(extension: string) {
	return isImageFile(extension) || ["heic", "mp4", "mov"].includes(extension.toLowerCase());
}

export function isImageFile(extension: string) {
	return ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(extension.toLowerCase());
}

export function prepareFilePathFolder(filePath: string, isDirectory?: boolean) {
	const folderPath = isDirectory ? filePath : path.dirname(filePath);

	if (!fs.existsSync(folderPath)) {
		fs.mkdirSync(folderPath, { recursive: true });
	}
}

export function deleteFolder(folderPath: string) {
	fs.rmSync(folderPath, { recursive: true, force: true });
}
