import * as vscode from 'vscode';
import { BambooManager } from './classes/syncer/BambooManager';
import { WebResourcesProvider } from './classes/treeview/WebResourcesProvider';

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

	if (vscode.workspace.getConfiguration().get<boolean>("bamboo.general.listFilesOnStartup")) {
		const webResourceProvider = new WebResourcesProvider(bambooManager);

		vscode.window.registerTreeDataProvider(
			`webresourceTree`,
			webResourceProvider,
		);

		vscode.commands.registerCommand('bamboo.webresourceTree.refreshEntry', () =>
			webResourceProvider.refresh()
		);
	}

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
	});

	vscode.window.showInformationMessage(`Bamboo initialized successfully.`);
}

function deactivate() { }