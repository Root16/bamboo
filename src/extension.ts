import * as vscode from 'vscode';
import util = require('util');
import { WebResourcesProvider } from './treeview/webresourcesprovider';
import { WebResource } from './treeview/webresource';
import { assert, Console } from 'console';
import { WebResoureceSyncerResponse, ListWebResourcesInSolutionAction } from './models/webresourcesyncerresponse';
const execFile = util.promisify(require('child_process').execFile);

const globalSavedConfigFile = "whatever the context for the global storage folder thing is" + "\\settings.json";

const syncerExePath = "/WebResource.Syncer/WebResource.Syncer/bin/Release/net6.0/WebResource.Syncer.exe";

const currentlySelectedSolution = "vscodeextentiontest";

export class WebResourceSyncer {
	_exePath: string;

	constructor(exePath: string) {
		this._exePath = exePath;
	}

	async retreiveWebResourcesInSolution(solutionName: string): Promise<{
		name: string,
		id: string,
	}[]> {
		const args = ['--solution', currentlySelectedSolution, '--listWebResources',];

		const procResult = await execFile(this._exePath, args, {
			shell: true,
			windowsHide: true,
		});

		let response: WebResoureceSyncerResponse = JSON.parse(procResult.stdout);

		if (response.dryRun) {
			await vscode.window.showInformationMessage("Dry run successful");
			return Promise.resolve([]);
		}

		for (let action of response.actionList) {
			let string = `Stage: ${action.actionName}. Successful: ${action.successful}. ` + (action.successful ? "" : `Error message: ${action.errorMessage}`);
			vscode.window.showInformationMessage(string, "Reun this stage?");

			if (action.actionName === "ListWebResourcesInSolution") {
				let listAction = action as ListWebResourcesInSolutionAction;

				return listAction.webResources;
			}
		}
		throw new Error("No ListWebResourceAction found?");
	}

	async uploadFile(path: string, publish: boolean = false) {
		const args = ['--filePath', path, '--solution', currentlySelectedSolution, '--updateIfExists',];

		if (publish) {
			args.push('--publish');
		}

		const procResult = await execFile(this._exePath, args, {
			shell: true,
			windowsHide: true,
		});

		let response: WebResoureceSyncerResponse = JSON.parse(procResult.stdout);

		if (response.dryRun) {
			await vscode.window.showInformationMessage("Dry run successful");
			return;
		}

		for (let action of response.actionList) {
			let string = `Stage: ${action.actionName}. Successful: ${action.successful}. ` + (action.successful ? "" : `Error message: ${action.errorMessage}`);
			vscode.window.showInformationMessage(string, "Reun this stage?");
		}
	}
}

export async function activate(context: vscode.ExtensionContext) {
	let syncer = new WebResourceSyncer(context.extensionPath + syncerExePath);

	let resources = await syncer.retreiveWebResourcesInSolution(currentlySelectedSolution);

	let updated = resources.map(r => new WebResource(r.name, r.id, true,
		vscode.TreeItemCollapsibleState.Collapsed
	));

	vscode.window.registerTreeDataProvider(
		`webresourcetree`,
		new WebResourcesProvider(updated),
	);

	vscode.commands.registerCommand('webber.uploadFile', async (resource: vscode.Uri) => {
		await syncer.uploadFile(resource.fsPath);
	});

	vscode.commands.registerCommand('webber.uploadAndPublishFile', async (resource: vscode.Uri) => {
		await syncer.uploadFile(resource.fsPath, true);
	});

	vscode.commands.registerCommand('test.view.showError', async (item: WebResource) => {
		console.log(item);
	});
}

export function deactivate() { }
