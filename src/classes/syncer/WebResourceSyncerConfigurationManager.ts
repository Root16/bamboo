import * as vscode from 'vscode';
import { WebResourceSyncerConfiguration } from './WebResourceSyncerConfiguration';

export abstract class WebResourceSyncerConfigurationManager {
	private static workspaceConfigFileName: string = 'bamboo.conf.json';

	public static async currentWorkspaceHasConfigFile(): Promise<boolean> {
		if (vscode.workspace.workspaceFolders === undefined) {
			throw new Error("Cannot activate extension. Workspace is undefined");
		}

		const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;

		try {
			await vscode.workspace.fs.stat(vscode.Uri.file(workspacePath + '/' + this.workspaceConfigFileName));
			return true;
		} catch (error) {
			return false;
		}
	}

	public static async getConfigFileAsJson(): Promise<WebResourceSyncerConfiguration> {
		if (vscode.workspace.workspaceFolders === undefined) {
			throw new Error("Cannot activate extension. Workspace is undefined");
		}
		const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;
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

	public static async getConnectionString(): Promise<string> {
		const propertyName = 'connectionString';

		const json: WebResourceSyncerConfiguration = await this.getConfigFileAsJson();

		if (json.hasOwnProperty(propertyName)) {
			return json.connectionString;
		} else {
			vscode.window.showErrorMessage(`No property named ${propertyName} in package.json`);
			throw new Error(`No property named ${propertyName} in package.json`);
		}
	}

	public static async getSolution(): Promise<string> {
		const propertyName = 'solutionName';

		const json: WebResourceSyncerConfiguration = await this.getConfigFileAsJson();

		if (json.hasOwnProperty(propertyName)) {
			return json.solutionName;
		} else {
			vscode.window.showErrorMessage(`No property named ${propertyName} in package.json`);
			throw new Error(`No property named ${propertyName} in package.json`);
		}
	}
}