import * as vscode from 'vscode';
import { WebResourcesProvider } from './classes/treeview/WebResourcesProvider';
import { WebResource } from './models/WebResource';
import { WebResourceSyncer } from './classes/syncer/WebResourceSyncer';
import { WebResourceSyncerConfiguration } from './classes/syncer/WebResourceSyncerConfiguration';

const syncerExePath = "/WebResource.Syncer/WebResource.Syncer/bin/Release/net6.0/WebResource.Syncer.exe";

export async function activate(context: vscode.ExtensionContext) {
	let syncer = new WebResourceSyncer(context.extensionPath + syncerExePath);

	const solutionName = WebResourceSyncerConfiguration.getCurrentSolution();
	let resources = await syncer.retreiveWebResourcesInSolution(solutionName);

	let updated = resources.map(r => new WebResource(r.name, r.id, true,
		vscode.TreeItemCollapsibleState.Collapsed
	));

	vscode.window.registerTreeDataProvider(
		`webresourcetree`,
		new WebResourcesProvider(updated),
	);

	vscode.commands.registerCommand('webber.uploadFile', async (resource: vscode.Uri) => {
		const solutionName = WebResourceSyncerConfiguration.getCurrentSolution();
		await syncer.uploadFile(solutionName, resource.fsPath);
	});

	vscode.commands.registerCommand('webber.uploadAndPublishFile', async (resource: vscode.Uri) => {
		const solutionName = WebResourceSyncerConfiguration.getCurrentSolution();
		await syncer.uploadFile(solutionName, resource.fsPath, true);
	});

	vscode.commands.registerCommand('test.view.showError', async (item: WebResource) => {
		console.log(item);
	});
}

export function deactivate() { }
