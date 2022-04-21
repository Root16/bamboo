import * as vscode from 'vscode';
import util = require('util');
import { WebResourcesProvider } from './treeview/webresourcesprovider';
import { WebResource } from './treeview/webresource';
import { assert, Console } from 'console';
import { WebResoureceSyncerResponse } from './models/webresourcesyncerresponse';
const execFile = util.promisify(require('child_process').execFile);

const globalSavedConfigFile = "whatever the context for the global storage folder thing is" + "\\settings.json";

const syncerExePath = "/WebResource.Syncer/WebResource.Syncer/bin/Release/net6.0/WebResource.Syncer.exe";

const currentlySelectedSolution = "vscodeextentiontest";

export class WebResourceSyncer {
	_exePath: string;

	constructor(exePath: string) {
		this._exePath = exePath;
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

		//split on the uploader logging scope - in the future we can use the exact scope to trace back what stage failed to just rerun that stage
		let stageStrings: string[] = procResult.stdout.toString()
			.split("info: WebResource.Syncer.Upload.Uploader[0]\r\n")
			.map((s: string) => s.trim())
			.filter((s: string) => s !== "");

		assert(stageStrings.length === 1); //should really only be one log output - the response object

		let response: WebResoureceSyncerResponse = JSON.parse(stageStrings[0]);  

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

	vscode.window.registerTreeDataProvider(
		'nodeDependencies',
		new WebResourcesProvider([
			"test",
			"test",
			"test",
		])
	);

	let syncer = new WebResourceSyncer(context.extensionPath + syncerExePath);

	vscode.commands.registerCommand('webber.uploadFile', async (resource: vscode.Uri) => {
		await syncer.uploadFile(resource.fsPath);
	});

	vscode.commands.registerCommand('webber.uploadAndPublishFile', async (resource: vscode.Uri) => {
		await syncer.uploadFile(resource.fsPath, true);
	});

	vscode.commands.registerCommand('test.view.showError', async (item: WebResource ) => {
		console.log(item);
	});
}

export function deactivate() { }
