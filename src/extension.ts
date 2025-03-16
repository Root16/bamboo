import * as vscode from 'vscode';
import { BambooManager } from './classes/syncer/BambooManager';
import { WebResourcesProvider } from './classes/treeview/WebResourcesProvider';
import { showErrorMessage, showTemporaryMessage } from './log/message';
import { CredentialType } from './classes/syncer/BambooConfig';

export async function activate(context: vscode.ExtensionContext) {
	const bambooManager = BambooManager.getInstance();

	if (! await bambooManager.currentWorkspaceHasConfigFile()) {
		return;
	}

	const bambooConfig = await bambooManager.getConfig();

	if (!bambooConfig) {
		return;
	}

	if (bambooConfig.credential.type !== CredentialType.ClientSecret) {
		showErrorMessage(`Bamboo doesn't support credential type: ${bambooConfig.credential.type}`);
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
			`componentTree`,
			webResourceProvider,
		);

		vscode.commands.registerCommand('bamboo.componentTree.refreshEntry', () =>
			webResourceProvider.refresh()
		);
	}

	vscode.commands.registerCommand('bamboo.syncCurrentFile', async () => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo.`);
		}
		const editor = vscode.window.activeTextEditor;

		if (editor === undefined || editor === null) {
			showErrorMessage(`You are not in the context of the editor.`);
		}

		const filePath = editor!.document.uri.path;

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		await bambooManager.syncCurrentFile(currentWorkspacePath, filePath);
	});

	vscode.commands.registerCommand('bamboo.syncAllFiles', async () => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
		}

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		await bambooManager.syncAllFiles(currentWorkspacePath);
	});

	showTemporaryMessage(`Bamboo initialized successfully.`);
}

function deactivate() { }