// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import util = require('util');
const execFile = util.promisify(require('child_process').execFile);

const globalSavedConfigFile = "whatever the context for the global storage folder thing is" + "\\settings.json";

const syncerExePath = "/Webresource.Syncer/Webresource.Syncer/bin/Release/net6.0/Webresource.Syncer.exe";

const currentlySelectedSolution = "vscodeextentiontest";

export class WebresourceSyncer {
	_exePath: string;

	constructor(exePath: string) {
		this._exePath = exePath;
	}

	async uploadFile(path: string, publish: boolean = false) {
		const args = ['--filePath', path, '--solution', currentlySelectedSolution, '--updateIfExists'];

		if (publish) {
			args.push('--publish');
		}

		const procResult = await execFile(this._exePath, args, {
			shell: true,
			windowsHide: true,
		});

		//split on the uploader logging scope - in the future we can use the exact scope to trace back what stage failed to just rerun that stage
		let stageStrings: string[] = procResult.stdout.toString()
									.split("info: Webresource.Syncer.Upload.Uploader[0]\r\n")
									.map((s: string) => s.trim())
									.filter((s: string) => s !== "");
		for(let resultMessage of stageStrings) {
			await vscode.window.showInformationMessage(
				resultMessage,
			);
		}
	}
}

export async function activate(context: vscode.ExtensionContext) {
	let syncer = new WebresourceSyncer(context.extensionPath + syncerExePath);

	vscode.commands.registerCommand('webber.uploadFile', async (resource: vscode.Uri) => {
		await syncer.uploadFile(resource.fsPath);
	});

	vscode.commands.registerCommand('webber.uploadAndPublishFile', async (resource: vscode.Uri) => {
		await syncer.uploadFile(resource.fsPath, true);
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }
