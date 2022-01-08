// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import { env } from 'process';
import { homedir } from 'os';
import { WebResoucesProvider } from './ui/webresourceprovider';
import { unzip } from 'zlib';

let currentSolutionStatusBar: vscode.StatusBarItem;
let availableSolutions: string[];
let currentSolution: string;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	initStatusBar(context);

	env.path = env.path + `;${homedir()}\\AppData\\Roaming\\Code\\User\\globalStorage\\microsoft-isvexptools.powerplatform-vscode\\pac\\tools;`

	const webResourcesProvider = new WebResoucesProvider("solution1", []);
	vscode.window.registerTreeDataProvider('webResources', webResourcesProvider);
	vscode.commands.registerCommand('webResources.refreshEntry', () =>
		webResourcesProvider.refresh()
	);

	let defaultSolutionsFolder = homedir() + "/source/CRMSolutions";


	let authCreateCommand = vscode.commands.registerCommand('solutionexplorer.authCreate', async () => {
		const result = await vscode.window.showInputBox({
			value: 'https://org.crm.dynamics.com/',
			placeHolder: 'CRM Url',
		});

		cp.exec(`pac auth create --url ${result}`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }, (err, stdout, _stderr) => {
			vscode.window.showInformationMessage(stdout);
			if (err) {
				vscode.window.showErrorMessage('error: ' + err);
			}
		});
	});

	let solutionSelectCommand = vscode.commands.registerCommand('solutionexplorer.solutionSelect', async () => {
		cp.exec(`pac solution list`, async (err, stdout, _stderr) => {
			if (err) {
				vscode.window.showErrorMessage('error: ' + err);
			}
			let regexp = /\[\d*\]\s*(\w*)\s*(.+?(?=\s{2,}))/g;
			let solutions = [...stdout.matchAll(regexp)].map(array => `${array[2]} (${array[1]})`);
			const result = await vscode.window.showQuickPick(solutions);

			let currentSolution = result;
			let availableSolutions = solutions;
			updateStatusBarItem();

			let regexp2 = /\(([^)]+)\)/;
			let matches = regexp2.exec(result!);
			let name = matches![1];


			if (!fs.existsSync(defaultSolutionsFolder)) {
				fs.mkdirSync(defaultSolutionsFolder);
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "I am long running!",
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 50, message: "I am long running! - almost there..." });

				await unzipSolution(defaultSolutionsFolder, name);

				progress.report({ increment: 100, message: "I am long running! - almost there..." });
			});


		});
	});

	// not finished
	let authSelectCommand = vscode.commands.registerCommand('solutionexplorer.authSelect', async () => {
		cp.exec(`pac auth list`, async (err, stdout, _stderr) => {
			if (err) {
				vscode.window.showErrorMessage('error: ' + err);
			}
			let regexp = /(https:\/\/\w+.crm.dynamics.com\/)\s*:\s(\S+)/g;
			let auths = [...stdout.matchAll(regexp)].map(array => `${array[1]} (${array[2]})`);
			const result = await vscode.window.showQuickPick(auths);

		});
	});

	context.subscriptions.push(authCreateCommand);
	context.subscriptions.push(solutionSelectCommand);
}

function unzipSolution(defaultSolutionsFolder: string, name: string): Promise<string> {
	var myPromise = new Promise<string>((resolve, reject) => {
		cp.exec(`pac solution export --path ${defaultSolutionsFolder}/${name}.zip --name ${name}`, async (err, stdout, stderr) => {
			if (err) {
				vscode.window.showErrorMessage(stderr);
				return;
			}
			vscode.window.showInformationMessage(stdout);

			cp.exec(`pac solution unpack --zipfile ${defaultSolutionsFolder}/${name}.zip --folder ${defaultSolutionsFolder}`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }, async (err, stdout, stderr) => {
				if (err) {
					vscode.window.showErrorMessage(stderr);
					return;
				}
				vscode.window.showInformationMessage(stdout);
				var openPath = vscode.Uri.parse("file:" + defaultSolutionsFolder.replace("C:\\", ""), true);
				vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ?
					vscode.workspace.workspaceFolders.length : 0,
					null,
					{ uri: openPath });
			}).on("close", () => { resolve("test"); });
		});
	});

	return myPromise;


}

function initStatusBar(context: vscode.ExtensionContext) {
	const statusBarCommand = 'statusbar.showCurrentSolution';
	vscode.commands.registerCommand(statusBarCommand, () => {
		vscode.window.showInformationMessage(`Currently selected :`);
	});

	currentSolutionStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	currentSolutionStatusBar.command = statusBarCommand;
	context.subscriptions.push(currentSolutionStatusBar);

	updateStatusBarItem();
}

function updateStatusBarItem(): void {
	currentSolutionStatusBar.text = currentSolution !== null ? 'No Solution Selected' : currentSolution;
	currentSolutionStatusBar.show();
}

// this method is called when your extension is deactivated
export function deactivate() { }
