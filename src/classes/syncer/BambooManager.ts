import * as vscode from 'vscode';
import { BambooConfig, CredentialType, CustomControlMapping } from './BambooConfig';
import path from 'path';
import { IWebResource } from '../../dataverse/IWebResource';
import { logErrorMessage, logMessage, logMessageWithProgress, logTemporaryMessage, VerboseSetting } from '../../log/message';
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
			logErrorMessage(BambooManager.ExceptionMessages.UndefinedWorkspace, VerboseSetting.High);
			return false;
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;

		try {
			await vscode.workspace.fs.stat(vscode.Uri.file(workspacePath + '/' + BambooManager.workspaceConfigFileName));
			return true;
		} catch (error) {
			logErrorMessage(BambooManager.ExceptionMessages.NoBambooConfig, VerboseSetting.High);
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
			logErrorMessage(
				`Unable to open file ${workspacePath + '/' + BambooManager.workspaceConfigFileName}. Please make sure it exists.`,
				VerboseSetting.High
			);
			return null;
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
			logErrorMessage(
				`Unable to open file ${workspacePath + '/' + BambooManager.workspaceConfigFileName}. Please make sure it exists.`,
				VerboseSetting.High
			);
			return null;
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


	public static async getTokenCacheFolderPath(): Promise<vscode.Uri | null> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			logErrorMessage(BambooManager.ExceptionMessages.UndefinedWorkspace, VerboseSetting.High);
			return null;
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;

		const tokenCacheFolder = vscode.Uri.file(workspacePath + '/' + this.workspaceTokenCacheFolderName);

		return tokenCacheFolder;
	}
	public static async getTokenCacheFilePath(): Promise<string | null> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			logErrorMessage(BambooManager.ExceptionMessages.UndefinedWorkspace, VerboseSetting.High);
			return null;
		}

		const tokenFileFolderPath = await BambooManager.getTokenCacheFolderPath();
		if (tokenFileFolderPath === null) return null;

		const tokenFileFolderPathStr = tokenFileFolderPath instanceof vscode.Uri ? tokenFileFolderPath.fsPath : tokenFileFolderPath;

		const tokenCacheFilePath = path.join(tokenFileFolderPathStr, "tokenCache.json");

		const normalizedPath = path.resolve(tokenCacheFilePath);

		return normalizedPath;
	}

	public async getToken(): Promise<string | null> {
		const bambooConfig = await this.getConfig();

		if (bambooConfig === null) {
			logErrorMessage(BambooManager.ExceptionMessages.CantFindBambooConfig, VerboseSetting.High);
			return null;
		}

		const token = await this.client.getOAuthToken();

		if (token === null) {
			logErrorMessage(BambooManager.ExceptionMessages.UnableToAuthenticateToD365, VerboseSetting.High);
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

			const [success, errorMessage] = await this.client.uploadJavaScriptFile(
				normalizedPath,
				wrMapping.dataverseName,
				config.solutionUniqueName,
				token
			);

			if (!success) {
				logErrorMessage(errorMessage!, VerboseSetting.Low);
				return;
			}

			logTemporaryMessage(`${wrMapping.dataverseName} synced successfully.`, VerboseSetting.Low);
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
			logErrorMessage(errorMessage!, VerboseSetting.Low);
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

		const [success, errorMessage, ctrls] = await this.client.listCustomControlsInSolution(config.solutionUniqueName, token)

		if (!success) {
			logErrorMessage(errorMessage!, VerboseSetting.Low);
			return [];
		}

		return ctrls;
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
			logErrorMessage(
				`There are more than one or no files matching the relative path: ${relativePathOnDisk}.`,
				VerboseSetting.Low
			);
			return;
		}

		const matchingFile = matchingFiles[0];

		const fullPath = currentWorkspacePath + "/" + matchingFile.relativePathOnDisk;
		const fixedPath = fullPath.replace(/^\/([a-zA-Z]):\//, "$1:/"); // Remove extra leading slash if present
		const normalizedPath = path.normalize(fixedPath);

		const [success, errorMessage] = await this.client.uploadJavaScriptFile(
			normalizedPath,
			matchingFile.dataverseName,
			config.solutionUniqueName,
			token
		);

		if (!success) {
			logErrorMessage(errorMessage!, VerboseSetting.Low);
			return;
		}

		logTemporaryMessage(`${matchingFile.dataverseName} synced successfully.`, VerboseSetting.Low);
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
			logTemporaryMessage(`Synced control: ${customControl.dataverseName}.`, VerboseSetting.Low);
		} else {
			logErrorMessage(errorMessage!, VerboseSetting.Low);
		}
	}
}
