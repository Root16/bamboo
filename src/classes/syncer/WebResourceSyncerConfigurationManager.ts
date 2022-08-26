import * as vscode from 'vscode';
import { WebResourceSyncerConfiguration } from './WebResourceSyncerConfiguration';

export abstract class WebResourceSyncerConfigurationManager {
	public static workspaceConfigFileName: string = 'bamboo.conf.json';
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

	public static async getConfigFileAsJson(): Promise<WebResourceSyncerConfiguration> {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			throw new Error(this.undefinedWorkspaceExceptionMessage);
		}

		const workspacePath = currentWorkspaceFolders![0].uri.path;
		const packageJsonUri = vscode.Uri.file(workspacePath + '/' + this.workspaceConfigFileName);
		try {
			const dataAsU8Array = await vscode.workspace.fs.readFile(packageJsonUri);
			const jsonString = Buffer.from(dataAsU8Array).toString('utf8');
			const json:WebResourceSyncerConfiguration = JSON.parse(jsonString);
			return json;
		} catch (error) {
			throw new Error(`Unable to open file ${workspacePath + '/' + this.workspaceConfigFileName}. Please make sure it exists.`);
		}
	}

	public static async getWebResourceFileMapping(webResourceFilePath: string): Promise<string | null> {
		const json: WebResourceSyncerConfiguration = await this.getConfigFileAsJson();
		if (json.fileMappings.hasOwnProperty(webResourceFilePath)) {
			return json.fileMappings[webResourceFilePath];
		} else {
			return null;
		}
	}

	public static async getConnectionString(): Promise<string> {
		const propertyName = 'connectionString';

		const json: WebResourceSyncerConfiguration = await this.getConfigFileAsJson();

		if (json.hasOwnProperty(propertyName)) {
			return json.connectionString;
		} else {
			vscode.window.showErrorMessage(`No property named ${propertyName} in ${this.workspaceConfigFileName}`);
			throw new Error(`No property named ${propertyName} in ${this.workspaceConfigFileName}`);
		}
	}

	public static async getSolution(): Promise<string> {
		const propertyName = 'solutionName';

		const json: WebResourceSyncerConfiguration = await this.getConfigFileAsJson();

		if (json.hasOwnProperty(propertyName)) {
			return json.solutionName;
		} else {
			vscode.window.showErrorMessage(`No property named ${propertyName} in ${this.workspaceConfigFileName}`);
			throw new Error(`No property named ${propertyName} in ${this.workspaceConfigFileName}`);
		}
	}

	public static async saveWebResourceFileMapping(localPath: string, remotePath: string): Promise<void> {
		let config;
		try {
			config = await this.getConfigFileAsJson();
		}
		catch {
			vscode.window.showErrorMessage(`Unable to save file mapping. Please make sure ${this.workspaceConfigFileName} exists.`);
			return;
		}

		config = config || {};
		config.fileMappings = config.fileMappings || {};
		config.fileMappings[localPath] = remotePath;

		await this.overwriteConfigFile(config);
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