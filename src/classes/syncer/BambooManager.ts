import * as vscode from 'vscode';
import { BambooConfig } from './BambooConfig';
import path from 'path';

export abstract class BambooManager {
	public static workspaceConfigFileName: string = 'bamboo.conf.json';
	public static workspaceTokenCacheFolderName: string = '.bamboo_tokens';
	private static undefinedWorkspaceExceptionMessage: string = "Cannot activate Bamboo. Workspace is undefined";

	public static async currentWorkspaceHasConfigFile(): Promise<boolean> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			throw new Error(this.undefinedWorkspaceExceptionMessage);
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;

		try {
			await vscode.workspace.fs.stat(vscode.Uri.file(workspacePath + '/' + this.workspaceConfigFileName));
			return true;
		} catch (error) {
			return false;
		}
	}

	public static async getConfig(): Promise<BambooConfig> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			throw new Error(this.undefinedWorkspaceExceptionMessage);
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;
		const packageJsonUri = vscode.Uri.file(workspacePath + '/' + this.workspaceConfigFileName);
		try {
			const dataAsU8Array = await vscode.workspace.fs.readFile(packageJsonUri);
			const jsonString = Buffer.from(dataAsU8Array).toString('utf8');
			const json: BambooConfig = JSON.parse(jsonString);
			return json;
		} catch (error) {
			throw new Error(`Unable to open file ${workspacePath + '/' + this.workspaceConfigFileName}. Please make sure it exists.`);
		}
	}

	public static async getTokenCacheFolderPath(): Promise<vscode.Uri> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			throw new Error(this.undefinedWorkspaceExceptionMessage);
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;

		const tokenCacheFolder = vscode.Uri.file(workspacePath + '/' + this.workspaceTokenCacheFolderName);

		return tokenCacheFolder;
	}

	public static async getTokenCacheFilePath(): Promise<string> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			throw new Error(this.undefinedWorkspaceExceptionMessage);
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;

		const tokenCacheFolder = vscode.Uri.file(workspacePath + '/' + this.workspaceTokenCacheFolderName);

		const cacheFile = path.join(
			(
				await BambooManager.getTokenCacheFolderPath()
			).path, "tokenCache.json");

		//TODO
		const normalizedPath = path.resolve(cacheFile).replace("\\c:", "");

		return normalizedPath;
	}

	public static async getWRPathInPowerApps(pathToFileOnDisk: string): Promise<string | null> {
		const json: BambooConfig = await this.getConfig();

		const mapping = json.webResources.find(wr => wr.relativePathOnDisk === pathToFileOnDisk);

		return mapping ? mapping.dataverseName : null;
	}

	public static async getWRDiskPath(pathToFileInPowerApps: string): Promise<string | null> {
		const json: BambooConfig = await this.getConfig();

		const mapping = json.webResources.find(wr => wr.dataverseName === pathToFileInPowerApps);

		return mapping ? mapping.relativePathOnDisk : null;
	}

	public static async getSolution(): Promise<string> {
		const propertyName = 'solutionName';

		const json: BambooConfig = await this.getConfig();

		if (json.hasOwnProperty(propertyName)) {
			return json.solutionName;
		} else {
			vscode.window.showErrorMessage(`No property named ${propertyName} in ${this.workspaceConfigFileName}`);
			throw new Error(`No property named ${propertyName} in ${this.workspaceConfigFileName}`);
		}
	}

	public static async saveWebResourceFileMapping(localPath: string, remotePath: string): Promise<void> {
		// let config;
		// try {
		// 	config = await this.getConfigFile();
		// }
		// catch {
		// 	vscode.window.showErrorMessage(`Unable to save file mapping. Please make sure ${this.workspaceConfigFileName} exists.`);
		// 	return;
		// }

		// config = config || {};
		// config.fileMappings = config.fileMappings || {};
		// config.fileMappings[localPath] = remotePath;

		// await this.overwriteConfigFile(config);
	}

	private static async overwriteConfigFile(configFile: any): Promise<void> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			throw new Error(this.undefinedWorkspaceExceptionMessage);
		}
		const workspacePath = currentWorkspaceFolders![0].uri.path;
		const packageJsonUri = vscode.Uri.file(workspacePath + '/' + this.workspaceConfigFileName);
		try {
			let configFileAsString = JSON.stringify(configFile, null, 4);
			let dataBuffer = Buffer.from(configFileAsString, 'utf8');
			await vscode.workspace.fs.writeFile(packageJsonUri, dataBuffer);
		}
		catch (error) {
			throw new Error(`Unable to overwrite file ${workspacePath + '/' + this.workspaceConfigFileName}`);
		}
	}
}