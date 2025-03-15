import * as vscode from 'vscode';
import path from "path";
import { WebResourcesProvider } from './classes/treeview/WebResourcesProvider';
import { WebResource } from './models/WebResource';
import { BambooManager } from './classes/syncer/BambooManager';
import WebResourceSyncer from './classes/syncer/WebResourceSyncer';
import { getOAuthToken, getSingle, uploadJavaScriptFile } from './dataverse/client';

const SYNCER_EXE_PATH = "/WebResource.Syncer/WebResource.Syncer/bin/Release/net6.0/win-x64/publish/WebResource.Syncer.exe";
const EXTENSION_NAME = "bamboo";

export async function activate(context: vscode.ExtensionContext) {
	const bambooManager = BambooManager.getInstance();

	if (! await bambooManager.currentWorkspaceHasConfigFile()) {
		return;
	}

	const bambooConfig = await bambooManager.getConfig();

	if (!bambooConfig) {
		return;
	}

	//Always test connection on startup
	const token = await bambooManager.getToken();

	if (token === null) {
		return;
	}

	const account = await getSingle('accounts', "b3ae0b11-60ea-eb11-bacb-000d3a332312", token, bambooConfig.credential.baseUrl);

	// if (vscode.workspace.getConfiguration().get<boolean>("bamboo.general.listFilesOnStartup")) {
	// 	const solutionName = await BambooManager.getSolution();

	// 	const webResourceProvider = new WebResourcesProvider(solutionName, syncer);

	// 	vscode.window.registerTreeDataProvider(
	// 		`webresourceTree`,
	// 		webResourceProvider,
	// 	);

	// 	vscode.commands.registerCommand('bamboo.webresourceTree.refreshEntry', () =>
	// 		webResourceProvider.refresh()
	// 	);
	// }

	vscode.commands.registerCommand('bamboo.syncCurrentFile', async (resource: vscode.Uri) => {
		const foo = 10;
	});

	vscode.commands.registerCommand('bamboo.syncAllFiles', async () => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			vscode.window.showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
		}

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		await bambooManager.syncAllFiles(currentWorkspacePath);

		const foo = 10;
	});

	vscode.window.showInformationMessage(`Bamboo initialized successfully.`);
}

function deactivate() { }