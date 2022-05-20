import * as vscode from 'vscode';

export abstract class WebResourceSyncerConfiguration {
	public static async currentWorkspaceHasConfigFile(): Promise<boolean> {
		if (vscode.workspace.workspaceFolders === undefined) {
			throw new Error("Cannot activate extension. Workspace is undefined");
		}

		const fileName = 'package.json';
		const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;

		try {
			await vscode.workspace.fs.stat(vscode.Uri.file(workspacePath + '/' + fileName));
			return true;
		} catch (error) {
			return false;
		}
	}
	public static async getConfigFileAsJson(): Promise<any> {
		if (vscode.workspace.workspaceFolders === undefined) {
			throw new Error("Cannot activate extension. Workspace is undefined");
		}
		const fileName = 'package.json';
		const workspacePath = vscode.workspace.workspaceFolders[0].uri.path;
		const packageJsonUri = vscode.Uri.file(workspacePath + '/' + fileName);
		try {
			const dataAsU8Array = await vscode.workspace.fs.readFile(packageJsonUri);
			const jsonString = Buffer.from(dataAsU8Array).toString('utf8');
			const json = JSON.parse(jsonString);
			return json;
		} catch (error) {
			throw new Error(`Unable to open file ${workspacePath + '/' + fileName}. Please make sure it exists.`);
		}
	}

	public static async getConnectionString(): Promise<string> {
		const propertyName = 'connectionString';
		const json = await this.getConfigFileAsJson();
		if (json.hasOwnProperty(propertyName)) {
			return json[propertyName];
		} else {
			vscode.window.showErrorMessage(`No property named ${propertyName} in package.json`);
			throw new Error(`No property named ${propertyName} in package.json`);
		}
	}

	public static async getSolution(): Promise<string> {
		const propertyName = 'solutionName';
		const json = await this.getConfigFileAsJson();
		if (json.hasOwnProperty(propertyName)) {
			return json[propertyName];
		} else {
			vscode.window.showErrorMessage(`No property named ${propertyName} in package.json`);
			throw new Error(`No property named ${propertyName} in package.json`);
		}
	}

	public static async getFilePath(): Promise<string> {
		const propertyName = 'filePath';
		const json = await this.getConfigFileAsJson();
		if (json.hasOwnProperty(propertyName)) {
			return json[propertyName];
		} else {
			vscode.window.showErrorMessage(`No property named ${propertyName} in package.json`);
			throw new Error(`No property named ${propertyName} in package.json`);
		}
	}
}

