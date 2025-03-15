import * as vscode from 'vscode';
import { BambooConfig } from './BambooConfig';
import path from 'path';
import { getOAuthToken, listWebResourcesInSolution, uploadJavaScriptFile } from '../../dataverse/client';
import { IWebResource } from '../../dataverse/IWebResource';
import { showMessage, showTemporaryMessage } from '../../log/message';

export class BambooManager {
	public static workspaceConfigFileName: string = 'bamboo.conf.json';
	public static workspaceTokenCacheFolderName: string = '.bamboo_tokens';

	private static ExceptionMessages = {
		UnableToAuthenticateToD365: "Unable to authenticate with the CRM instance. Please check your connection details.",
		CantFindBambooConfig: "Cannot find bamboo config file.",
		UndefinedWorkspace: "Cannot activate Bamboo. Workspace is undefined.",
		NoBambooConfig: `There is no ${BambooManager.workspaceConfigFileName} in the root of the current workspace!`,
	};

	private static instance: BambooManager;

	private constructor() {
	}

	static getInstance(): BambooManager {
		if (!BambooManager.instance) {
			BambooManager.instance = new BambooManager();
		}
		return BambooManager.instance;
	}

	public async currentWorkspaceHasConfigFile(): Promise<boolean> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			vscode.window.showErrorMessage(BambooManager.ExceptionMessages.UndefinedWorkspace);
			return false;
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;

		try {
			await vscode.workspace.fs.stat(vscode.Uri.file(workspacePath + '/' + BambooManager.workspaceConfigFileName));
			return true;
		} catch (error) {
			vscode.window.showErrorMessage(BambooManager.ExceptionMessages.NoBambooConfig);
			return false;
		}
	}

	public async getConfig(): Promise<BambooConfig | null> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			vscode.window.showErrorMessage(BambooManager.ExceptionMessages.UndefinedWorkspace);
			return null;
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;
		const packageJsonUri = vscode.Uri.file(workspacePath + '/' + BambooManager.workspaceConfigFileName);
		try {
			const dataAsU8Array = await vscode.workspace.fs.readFile(packageJsonUri);
			const jsonString = Buffer.from(dataAsU8Array).toString('utf8');
			const json: BambooConfig = JSON.parse(jsonString);
			return json;
		} catch (error) {
			throw new Error(`Unable to open file ${workspacePath + '/' + BambooManager.workspaceConfigFileName}. Please make sure it exists.`);
		}
	}

	public static async getTokenCacheFolderPath(): Promise<vscode.Uri> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			throw new Error(BambooManager.ExceptionMessages.UndefinedWorkspace);
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;

		const tokenCacheFolder = vscode.Uri.file(workspacePath + '/' + this.workspaceTokenCacheFolderName);

		return tokenCacheFolder;
	}

	public static async getTokenCacheFilePath(): Promise<string> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			throw new Error(BambooManager.ExceptionMessages.UndefinedWorkspace);
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

	// public static async getWRPathInPowerApps(pathToFileOnDisk: string): Promise<string | null> {
	// 	const json: BambooConfig = await this.getConfig();

	// 	const mapping = json.webResources.find(wr => wr.relativePathOnDisk === pathToFileOnDisk);

	// 	return mapping ? mapping.dataverseName : null;
	// }

	// public static async getWRDiskPath(pathToFileInPowerApps: string): Promise<string | null> {
	// 	const json: BambooConfig = await this.getConfig();

	// 	const mapping = json.webResources.find(wr => wr.dataverseName === pathToFileInPowerApps);

	// 	return mapping ? mapping.relativePathOnDisk : null;
	// }

	// public static async getSolution(): Promise<string> {
	// 	const propertyName = 'solutionName';

	// 	const json: BambooConfig = await this.getConfig();

	// 	if (json.hasOwnProperty(propertyName)) {
	// 		return json.solutionName;
	// 	} else {
	// 		vscode.window.showErrorMessage(`No property named ${propertyName} in ${this.workspaceConfigFileName}`);
	// 		throw new Error(`No property named ${propertyName} in ${this.workspaceConfigFileName}`);
	// 	}
	// }

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


	public async getToken(): Promise<string | null> {
		const bambooConfig = await this.getConfig();

		if (bambooConfig === null) {
			vscode.window.showErrorMessage(BambooManager.ExceptionMessages.CantFindBambooConfig);
			return null;
		}

		const token = await getOAuthToken(
			bambooConfig.credential.clientId,
			bambooConfig.credential.clientSecret,
			bambooConfig.credential.tenantId,
			bambooConfig.credential.baseUrl,
		);

		if (token === null) {
			vscode.window.showErrorMessage(BambooManager.ExceptionMessages.CantFindBambooConfig);
			return null;
		}

		return token;
	}
	public async syncAllFiles(currentWorkspacePath: string): Promise<void> {
		const config = await this.getConfig();

		if (!config) {
			return;
		}

		for (const wrMapping of config.webResources) {
			const relativePathOnDisk = currentWorkspacePath + "/" + wrMapping.relativePathOnDisk;
			let fixedPath = relativePathOnDisk.replace(/^\/([a-zA-Z]):\//, "$1:/"); // Remove extra leading slash if present
			const normalizedPath = path.normalize(fixedPath);

			const token = await this.getToken();

			if (token === null) {
				return;
			}

			const response = await uploadJavaScriptFile(
				normalizedPath,
				wrMapping.dataverseName,
				config.solutionUniqueName,
				token
			);

			showTemporaryMessage(response);
		}
	}

	public async listWebResourcesInSolution(): Promise<IWebResource[]> {
		const config = await this.getConfig();

		if (config === null) {
			return [];
		}

		const token = await this.getToken();

		if (token === null) {
			return [];
		}

		const wrs = await listWebResourcesInSolution(config.solutionUniqueName, token)

		return wrs;
	}
}
