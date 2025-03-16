import * as vscode from 'vscode';
import { BambooManager } from './classes/syncer/BambooManager';
import { SolutionComponentsProvider } from './classes/treeview/SolutionComponentProvider';
import { logErrorMessage, logMessage, logMessageWithProgress, VerboseSetting } from './log/message';
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
		logErrorMessage(`Bamboo doesn't support credential type: ${bambooConfig.credential.type}`, VerboseSetting.Low);
		return;
	}

	//Always test connection on startup
	const token = await bambooManager.getToken();

	if (token === null) {
		return;
	}

	const webResourceProvider = new SolutionComponentsProvider(bambooManager);

	vscode.window.registerTreeDataProvider(
		`componentTree`,
		webResourceProvider,
	);

	vscode.commands.registerCommand('bamboo.componentTree.refreshEntry', async () =>
		await webResourceProvider.refresh()
	);

	if (vscode.workspace.getConfiguration().get<boolean>("bamboo.general.listSolutionComponentsOnStartup")) {
		await webResourceProvider.refresh();
	}

	vscode.commands.registerCommand('bamboo.syncCurrentFile', async () => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			logErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo.`, VerboseSetting.High);
			return;
		}
		const editor = vscode.window.activeTextEditor;

		if (editor === undefined || editor === null) {
			logErrorMessage(`You are not in the context of the editor.`, VerboseSetting.High);
			return;
		}

		const filePath = editor!.document.uri.path;

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		await bambooManager.syncCurrentFile(currentWorkspacePath, filePath);
	});

	vscode.commands.registerCommand('bamboo.syncAllFiles', async () => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			logErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`, VerboseSetting.High);
			return;
		}

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		await bambooManager.syncAllFiles(currentWorkspacePath);
	});

	vscode.commands.registerCommand('bamboo.syncCustomControl', async () => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			logErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`, VerboseSetting.High);
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

	//TODO
	logMessage(`Bamboo initialized successfully.`, VerboseSetting.Low)
}

function deactivate() { }