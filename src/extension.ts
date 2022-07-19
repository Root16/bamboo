import * as vscode from 'vscode';
import { WebResourcesProvider } from './classes/treeview/WebResourcesProvider';
import { WebResource } from './models/WebResource';
import { WebResourceSyncerConfigurationManager } from './classes/syncer/WebResourceSyncerConfigurationManager';
import WebResourceSyncer from './classes/syncer/WebResourceSyncer';

const SYNCER_EXE_PATH = "/WebResource.Syncer/WebResource.Syncer/bin/Release/net6.0/win-x64/publish/WebResource.Syncer.exe";
const EXTENSION_NAME = "bamboo";

export async function activate(context: vscode.ExtensionContext) {
	if (! await WebResourceSyncerConfigurationManager.currentWorkspaceHasConfigFile()) {
		vscode.window.showErrorMessage(`There is no package.json in the root of the current workspace! Please add one with the properties: 'connectionString' and 'solutionName', and then refresh the extension by running the command: '>Reload Window'`);
		return;
	}

	let syncer = new WebResourceSyncer(context.extensionPath + SYNCER_EXE_PATH, await WebResourceSyncerConfigurationManager.getConnectionString());

	if (vscode.workspace.getConfiguration().get<boolean>("bamboo.general.listFilesOnStartup")) {
		const solutionName = await WebResourceSyncerConfigurationManager.getSolution();

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

		let localPath = resource.path.replace(currentWorkspacePath, "");

		let possibleRemotePath = await WebResourceSyncerConfigurationManager.getWebResourceFileMapping(localPath);
		let remotePath = possibleRemotePath;

		if (
			vscode.workspace.getConfiguration().get<boolean>("bamboo.createWebResource.askForName") &&
			possibleRemotePath === null
		) {
			remotePath = localPath;
			let userRequestedRemotePath = await vscode.window.showInputBox({
				prompt: "Input the full name of the webresource. Cancel this dialog to use the relative path from 'package.json' instead.",
				placeHolder: "/my-webresources/forms/project.js"
			});

			if (userRequestedRemotePath !== undefined && userRequestedRemotePath !== "") {
				userRequestedRemotePath = userRequestedRemotePath[0] === "/" ? userRequestedRemotePath : "/" + userRequestedRemotePath;
				remotePath = userRequestedRemotePath;
			}

			await WebResourceSyncerConfigurationManager.saveWebResourceFileMapping(localPath, remotePath);
		}
		else if (possibleRemotePath === null) {
			remotePath = localPath;
			await WebResourceSyncerConfigurationManager.saveWebResourceFileMapping(localPath, remotePath);
		}

		const solutionName = await WebResourceSyncerConfigurationManager.getSolution();

		const updateIfExists = vscode.workspace.getConfiguration().get<boolean>("bamboo.createWebResource.updateIfExists");

		await syncer.uploadFile(solutionName, resource.fsPath, remotePath!, updateIfExists);
	});

	vscode.commands.registerCommand('bamboo.updateFile', async (resource: vscode.Uri) => {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			vscode.window.showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
		}
		let currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		let filePathInPowerApps = resource.path.replace(currentWorkspacePath, "");

		const solutionName = await WebResourceSyncerConfigurationManager.getSolution();

		const webResourceFileName = await WebResourceSyncerConfigurationManager.getWebResourceFileMapping(filePathInPowerApps);

		if(webResourceFileName === null) {
			throw new Error("File mapping not found in config file! Please either manually add the mapping to the config file, or create the webresource through this tool.");
		}

		await syncer.uploadFile(solutionName, resource.fsPath, webResourceFileName, true);
	});
}

export function deactivate() { }
