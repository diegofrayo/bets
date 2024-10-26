import * as fs from "fs";
import path from "path";

import v from "../v";

export function writeFile(filePath: string, content: unknown) {
	createOutputFolder(filePath);
	fs.writeFileSync(
		filePath,
		typeof content === "string" || content instanceof Buffer ? content : JSON.stringify(content),
	);
}

export function readFile(filePath: string): string;
export function readFile(filePath: string, type: "blob"): Buffer;
export function readFile(filePath: string, type?: unknown) {
	if (type === "blob") {
		return fs.readFileSync(filePath) as Buffer;
	}

	return fs.readFileSync(filePath).toString().trimEnd();
}

export function copyFolder(sourcePath: string, targetPath: string) {
	if (!isDirectory(sourcePath)) return;

	const targetFolderPath = path.resolve(targetPath, path.basename(sourcePath));
	createOutputFolder(targetFolderPath);

	fs.readdirSync(sourcePath).forEach((fileName) => {
		const filePath = path.resolve(sourcePath, fileName);

		if (isDirectory(filePath)) {
			copyFolder(filePath, targetPath);
		} else {
			copyFile(filePath, { outputFolderPath: targetFolderPath });
		}
	});
}

export function copyFile(
	sourcePath: string,
	opts: { outputFolderPath: string; outputFileName?: string },
) {
	createOutputFolder(opts.outputFolderPath, { isDirectory: true });

	fs.copyFileSync(
		sourcePath,
		path.resolve(opts.outputFolderPath, opts.outputFileName || path.basename(sourcePath)),
	);
}

export function createFolder(outputFolderPath: string) {
	fs.mkdirSync(outputFolderPath, { recursive: true });
}

export function fileExists(sourcePath: string) {
	return fs.existsSync(sourcePath);
}

export function renameFile(
	currentFilePath: string,
	opts: { newFilePath?: string; newFileName: string },
) {
	if (opts.newFilePath) {
		createOutputFolder(opts.newFilePath, { isDirectory: true });
		fs.renameSync(currentFilePath, path.resolve(opts.newFilePath, opts.newFileName));
	} else {
		fs.renameSync(currentFilePath, path.resolve(path.dirname(currentFilePath), opts.newFileName));
	}
}

export function isMediaFile(extension: string) {
	return isImageFile(extension) || ["heic", "mp4", "mov"].includes(extension.toLowerCase());
}

export function isImageFile(extension: string) {
	return ["jpg", "jpeg", "png", "gif", "webp", "avif"].includes(extension.toLowerCase());
}

export function isDirectory(sourcePath: string) {
	return fs.lstatSync(sourcePath).isDirectory();
}

export function createOutputFolder(outputPath: string, opts?: { isDirectory?: boolean }) {
	const folderPath = opts?.isDirectory ? outputPath : getParentFolderPath(outputPath);

	if (!fileExists(folderPath)) {
		createFolder(folderPath);
	}
}

export function deleteFolder(folderPath: string) {
	fs.rmSync(folderPath, { recursive: true, force: true });
}

export function getRelativeOutputPath({
	sourcePath,
	sourcePathRootFolder,
	outputFolderPath,
}: {
	sourcePath: string;
	sourcePathRootFolder: string;
	outputFolderPath: string;
}) {
	const result = getParentFolderPath(
		path.join(outputFolderPath, sourcePath.replace(sourcePathRootFolder, "")),
	);

	return result;
}

export function getParentFolderPath(sourcePath: string) {
	return path.dirname(sourcePath);
}

export type T_CustomFile = {
	path: string;
	name: string;
	baseName: string;
	ext: string;
	stats: fs.Stats;
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
		const sourcePath = path.resolve(sourceFolderPath, fileName);
		const stats = fs.statSync(sourcePath);
		const { ext, name } = path.parse(sourcePath);
		const file = {
			path: sourcePath,
			name: fileName,
			baseName: name,
			ext: ext.toLowerCase().slice(1),
			stats,
			isDirectory: stats.isDirectory(),
			parentFolderPath: getParentFolderPath(sourcePath),
			parentFolderName: path.basename(getParentFolderPath(sourcePath)),
		};

		if (opts?.recursive && file.isDirectory) {
			return [...result, ...readFolderFiles(file.path, opts)];
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
