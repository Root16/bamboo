import * as vscode from 'vscode';
import { BambooManager } from './classes/syncer/BambooManager';
import { SolutionComponentsProvider } from './classes/treeview/SolutionComponentProvider';
import { showErrorMessage, showTemporaryMessage } from './log/message';
import { CredentialType } from './classes/syncer/BambooConfig';

export async function activate(context: vscode.ExtensionContext) {
	const bambooManager = await BambooManager.getInstance();

	if (bambooManager === null) {
		return;
	}

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
		const webResourceProvider = new SolutionComponentsProvider(bambooManager);

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
			return;	
		}
		const editor = vscode.window.activeTextEditor;

		if (editor === undefined || editor === null) {
			showErrorMessage(`You are not in the context of the editor.`);
			return;	
		}

		const filePath = editor!.document.uri.path;

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		await bambooManager.syncCurrentFile(currentWorkspacePath, filePath);
	});

	vscode.commands.registerCommand('bamboo.syncAllFiles', async () => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
			return;
		}

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		await bambooManager.syncAllFiles(currentWorkspacePath);
	});

	vscode.commands.registerCommand('bamboo.syncCustomControl', async () => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
			return;
		}

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		const config = await bambooManager.getConfig();

		if (config === null) {
			return;
		}
		
		const items: vscode.QuickPickItem[] = config.customControls.map(c => {
			return { label: c.dataverseName, description: c.relativePathOnDiskToSolution };
		});

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select a Custom Control...',
			canPickMany: false
		});

		if (selected) {
			const selectedCustomConrol = config.customControls.filter(c => c.dataverseName === selected.label)![0];

			await bambooManager.syncCustomControl(currentWorkspacePath, selectedCustomConrol);
		}
	});

	showTemporaryMessage(`Bamboo initialized successfully.`);
}

function deactivate() { }