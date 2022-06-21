import * as vscode from 'vscode';
import { WebResourcesProvider } from './classes/treeview/WebResourcesProvider';
import { WebResource } from './models/WebResource';
import { WebResourceSyncer } from './classes/syncer/WebResourceSyncer';
import { WebResourceSyncerConfiguration } from './classes/syncer/WebResourceSyncerConfiguration';

const syncerExePath = "/WebResource.Syncer/WebResource.Syncer/bin/Release/net6.0/WebResource.Syncer.exe";
const ExtensionName = "bamboo";

export async function activate(context: vscode.ExtensionContext) {
	if (! await WebResourceSyncerConfiguration.currentWorkspaceHasConfigFile()) {
		vscode.window.showErrorMessage(`There is no package.json in the root of the current workspace! Please add one with the properties: 'connectionString' and 'solutionName', and then refresh the extension by running the command: '>Reload Window'`);
		return;
	}

	let syncer = new WebResourceSyncer(context.extensionPath + syncerExePath, await WebResourceSyncerConfiguration.getConnectionString());

	const solutionName = await WebResourceSyncerConfiguration.getSolution();
	let resources = await syncer.retreiveWebResourcesInSolution(solutionName);

	let updated = resources.map(r => new WebResource(r.name, r.id, true,
		vscode.TreeItemCollapsibleState.Collapsed
	));

	vscode.window.registerTreeDataProvider(
		`webresourcetree`,
		new WebResourcesProvider(updated),
	);

	vscode.commands.registerCommand('bamboo.createAndUploadFile', async (resource: vscode.Uri) => {
		let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			vscode.window.showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
		}
		let currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		let filePathInPowerApps = resource.path.replace(currentWorkspacePath, "");

		const solutionName = await WebResourceSyncerConfiguration.getSolution();

		let updateIfExists = vscode.workspace.getConfiguration().get<boolean>("bamboo.createWebresource.updateIfExists");

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
