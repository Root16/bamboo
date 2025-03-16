import * as vscode from 'vscode';
import { BambooConfig, CredentialType, CustomControlMapping } from './BambooConfig';
import path from 'path';
import { IWebResource } from '../../dataverse/IWebResource';
import { showErrorMessage, showMessage, showTemporaryMessage } from '../../log/message';
import { DataverseClient } from '../../dataverse/DataverseClient';

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

	private constructor(private client: DataverseClient) {
		
	}

	static async getInstance(): Promise<BambooManager | null> {
		if (!BambooManager.instance) {
			const config = await BambooManager.getConfig();

			if (config === null) {
				return null;
			}

			const client = new DataverseClient(config);

			BambooManager.instance = new BambooManager(client);
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
			const json: BambooConfig = BambooManager.parseBambooConfig(jsonString);
			return json;
		} catch (error) {
			throw new Error(`Unable to open file ${workspacePath + '/' + BambooManager.workspaceConfigFileName}. Please make sure it exists.`);
		}
	}
	public static async getConfig(): Promise<BambooConfig | null> {
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
			const json: BambooConfig = BambooManager.parseBambooConfig(jsonString);
			return json;
		} catch (error) {
			throw new Error(`Unable to open file ${workspacePath + '/' + BambooManager.workspaceConfigFileName}. Please make sure it exists.`);
		}
	}

	private static parseBambooConfig(jsonString: string): BambooConfig {
		const rawData = JSON.parse(jsonString);

		const credentialTypeMap: Record<string, CredentialType> = {
			ClientSecret: CredentialType.ClientSecret,
			OAuth: CredentialType.OAuth,
		};

		return {
			baseUrl: rawData.baseUrl,
			solutionUniqueName: rawData.solutionUniqueName,
			webResources: rawData.webResources,
			customControls: rawData.customControls,
			credential: {
				...rawData.credential,
				type: credentialTypeMap[rawData.credential.type] ?? CredentialType.ClientSecret,
			}
		};
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

		const cacheFile = path.join(
			(
				await BambooManager.getTokenCacheFolderPath()
			).path, "tokenCache.json");

		//TODO
		const normalizedPath = path.resolve(cacheFile).replace("\\c:", "");

		return normalizedPath;
	}


	public async getToken(): Promise<string | null> {
		const bambooConfig = await this.getConfig();

		if (bambooConfig === null) {
			vscode.window.showErrorMessage(BambooManager.ExceptionMessages.CantFindBambooConfig);
			return null;
		}

		const token = await this.client.getOAuthToken();

		if (token === null) {
			vscode.window.showErrorMessage(BambooManager.ExceptionMessages.UnableToAuthenticateToD365);
			return null;
		}

		return token;
	}
	public async syncAllFiles(currentWorkspacePath: string): Promise<void> {
		const config = await this.getConfig();

		if (!config) {
			return;
		}

		const token = await this.getToken();

		if (token === null) {
			return;
		}

		for (const wrMapping of config.webResources) {
			const relativePathOnDisk = currentWorkspacePath + "/" + wrMapping.relativePathOnDisk;
			let fixedPath = relativePathOnDisk.replace(/^\/([a-zA-Z]):\//, "$1:/"); // Remove extra leading slash if present
			const normalizedPath = path.normalize(fixedPath);

			const response = await this.client.uploadJavaScriptFile(
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

		const [success, errorMessage, wrs] = await this.client.listWebResourcesInSolution(config.solutionUniqueName, token)

		if (!success) {
			showErrorMessage(errorMessage!);
			return [];
		}

		return wrs;
	}

	public async listCustomControlsInSolution(): Promise<IWebResource[]> {
		const config = await this.getConfig();

		if (config === null) {
			return [];
		}

		const token = await this.getToken();

		if (token === null) {
			return [];
		}

		const wrs = await this.client.listCustomControlsInSolution(config.solutionUniqueName, token)

		return wrs;
	}

	public async syncCurrentFile(currentWorkspacePath: string, filePath: string): Promise<void> {
		const config = await this.getConfig();

		if (!config) {
			return;
		}

		const token = await this.getToken();

		if (token === null) {
			return;
		}

		const relativePathOnDisk = filePath.replace(currentWorkspacePath, "").substring(1);

		const matchingFiles = config.webResources.filter(w => w.relativePathOnDisk === relativePathOnDisk);

		if (matchingFiles.length !== 1) {
			showErrorMessage(`There are more than one or no files matching the relative path: ${relativePathOnDisk}.`);
			return;
		}

		const matchingFile = matchingFiles[0];

		const fullPath = currentWorkspacePath + "/" + matchingFile.relativePathOnDisk;
		const fixedPath = fullPath.replace(/^\/([a-zA-Z]):\//, "$1:/"); // Remove extra leading slash if present
		const normalizedPath = path.normalize(fixedPath);

		const response = await this.client.uploadJavaScriptFile(
			normalizedPath,
			matchingFile.dataverseName,
			config.solutionUniqueName,
			token
		);

		showTemporaryMessage(response);
	}
	public async syncCustomControl(currentWorkspacePath: string, customControl: CustomControlMapping): Promise<void> {
		const config = await this.getConfig();

		if (!config) {
			return;
		}

		const token = await this.getToken();

		if (token === null) {
			return;
		}

		const fullPath = currentWorkspacePath + "/" + customControl.relativePathOnDiskToSolution;
		const fixedPath = fullPath.replace(/^\/([a-zA-Z]):\//, "$1:/"); // Remove extra leading slash if present
		const normalizedPath = path.normalize(fixedPath);

		const [success, errorMessage] = await this.client.syncSolution(
			customControl.solutionName, 
			normalizedPath,
			token);

		if (success) {
			showTemporaryMessage(`Synced control: ${customControl.dataverseName}.`);
		} else {
			showErrorMessage(errorMessage!);
		}
	}
}
