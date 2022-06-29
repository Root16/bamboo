import * as vscode from 'vscode';
import { WebResourcesProvider } from './classes/treeview/WebResourcesProvider';
import { WebResource } from './models/WebResource';
import { WebResourceSyncer } from './classes/syncer/WebResourceSyncer';
import { WebResourceSyncerConfiguration } from './classes/syncer/WebResourceSyncerConfiguration';

const SYNCER_EXE_PATH = "/Webresource.Syncer/Webresource.Syncer/bin/Release/net6.0/win-x64/publish/Webresource.Syncer.exe";
const EXTENSION_NAME = "bamboo";

export async function activate(context: vscode.ExtensionContext) {
	if (! await WebResourceSyncerConfiguration.currentWorkspaceHasConfigFile()) {
		vscode.window.showErrorMessage(`There is no package.json in the root of the current workspace! Please add one with the properties: 'connectionString' and 'solutionName', and then refresh the extension by running the command: '>Reload Window'`);
		return;
	}

	let syncer = new WebResourceSyncer(context.extensionPath + SYNCER_EXE_PATH, await WebResourceSyncerConfiguration.getConnectionString());

	if (vscode.workspace.getConfiguration().get<boolean>("bamboo.general.listFilesOnStartup")) {
		const solutionName = await WebResourceSyncerConfiguration.getSolution();

		// let resources = await syncer.retreiveWebResourcesInSolution(solutionName);

		// let updated = resources.map(r => new WebResource(r.name, r.id, true,
		// 	vscode.TreeItemCollapsibleState.Collapsed
		// ));

		const webResourceProvider = new WebResourcesProvider(solutionName, syncer);

		vscode.window.registerTreeDataProvider(
			`webresourceTree`,
			webResourceProvider,
		);

		vscode.commands.registerCommand('bamboo.webresourceTree.refreshEntry', () =>
			webResourceProvider.refresh()
		);
	}

	vscode.commands.registerCommand('bamboo.createAndUploadFile', async (resource: vscode.Uri) => {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			vscode.window.showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
		}
		let currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		let filePathInPowerApps = resource.path.replace(currentWorkspacePath, "");

		if (vscode.workspace.getConfiguration().get<boolean>("bamboo.createWebresource.askForName")) {
			let userRequestedFilePath = await vscode.window.showInputBox({
				prompt: "Input the full name of the webresource. Cancel this dialog to use the relative path from 'package.json' instead.",
				placeHolder: "/my-webresources/forms/project.js"
			});

			if (userRequestedFilePath !== undefined && userRequestedFilePath !== "") {
				userRequestedFilePath = userRequestedFilePath[0] === "/" ? userRequestedFilePath : "/" + userRequestedFilePath;
				filePathInPowerApps = userRequestedFilePath;
			}
		}

		const solutionName = await WebResourceSyncerConfiguration.getSolution();

		const updateIfExists = vscode.workspace.getConfiguration().get<boolean>("bamboo.createWebresource.updateIfExists");

		await syncer.uploadFile(solutionName, resource.fsPath, filePathInPowerApps, updateIfExists);
	});

	// vscode.commands.registerCommand('bamboo.uploadAndPublishFile', async (resource: vscode.Uri) => {
	// 	const solutionName = await WebResourceSyncerConfiguration.getSolution();
	// 	await syncer.uploadFile(solutionName, resource.fsPath, true);
	// });

	vscode.commands.registerCommand('test.view.showError', async (item: WebResource) => {
		console.log(item);
	});
}

export function deactivate() { }
