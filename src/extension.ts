// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as child from 'child_process';

const globalSavedConfigFile = "whatever the context for the global storage folder thing is" + "\\settings.json";

const uploaderExePath = "/Webresource.Uploader/Webresource.Uploader/bin/Release/net6.0/Webresource.Uploader.exe";

const currentlySelectedSolution = "vscodeextentiontest";

interface WebResourceUploadResult {
	data: string;
}
let terminal: vscode.Terminal | undefined;

export class WebResourceUploader {
	_exePath: string;

	constructor(exePath: string) {
		this._exePath = exePath;
	}

	uploadFile(path: string, publish: boolean = false) {
		const args = ['--filePath', path, '--solution', currentlySelectedSolution, '--updateIfExists'];
		if (publish) {
			args.push('--publish');
		}
		const res = child.execFileSync(this._exePath, args);
		let result: WebResourceUploadResult = { data: res.toString() };
		terminal = terminal || vscode.window.createTerminal('webber', 'C:\\Windows\\System32\\cmd.exe');
		terminal.show();
		terminal.sendText(`${result.data}`); //this isnt quite what we want - we want to either run the command IN the shell - or take the output and make it a message bubble
	}
}

export async function activate(context: vscode.ExtensionContext) {
	let uploader = new WebResourceUploader(context.extensionPath + uploaderExePath);
	vscode.commands.registerCommand('webber.uploadFile', (resource: vscode.Uri) => {
		uploader.uploadFile(resource.fsPath);
	});
	vscode.commands.registerCommand('webber.uploadAndPublishFile', (resource: vscode.Uri) => {
		uploader.uploadFile(resource.fsPath, true);
	});
}

// this method is called when your extension is deactivated
export function deactivate() { }
