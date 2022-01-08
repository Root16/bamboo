// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import { env, stdout } from 'process';
import { homedir } from 'os';
import { WebResoucesProvider } from './ui/webresourceprovider';
import { unzip } from 'zlib';

let currentSolutionStatusBar: vscode.StatusBarItem;
let currentAuthStatusBar: vscode.StatusBarItem;
let currentSolution: string;
let currentAuth: string;

const globalExtensionFolder = homedir() + "\\AppData\\Roaming\\Code\\User\\globalStorage\\" + "root16.vscode-web-resource-explorer";

const globalSavedConfigFile = globalExtensionFolder + "\\settings.json";

const userSolutionWorkspaceDir = homedir() + "\\source\\repos";
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	//make the sandbox recource folder if it doesnt exist	
	if (!fs.existsSync(globalExtensionFolder)) {
		fs.mkdirSync(globalExtensionFolder);
	}

	if (fs.existsSync(globalSavedConfigFile)) {
		let rawdata = fs.readFileSync(globalSavedConfigFile);
		let config = JSON.parse(rawdata.toString());

		currentAuth = config["currentAuth"] ? config["currentAuth"] : "";
		currentSolution = config["currentSolution"] ? config["currentSolution"] : "";
	}

	//allow pac to be on the path
	env.path = env.path + `;${homedir()}\\AppData\\Roaming\\Code\\User\\globalStorage\\microsoft-isvexptools.powerplatform-vscode\\pac\\tools;`

	initStatusBar(context);

	const webResourcesProvider = new WebResoucesProvider("solution1", []);
	vscode.window.registerTreeDataProvider('webResources', webResourcesProvider);
	vscode.commands.registerCommand('webResources.refreshEntry', () =>
		webResourcesProvider.refresh()
	);

	let solutionPushCommand = vscode.commands.registerCommand('solutionexplorer.solutionPush', async () => {
		//TODO: implement global state - so that the extension remember's what the currently selected solution is
		if (currentSolution === undefined) {
			currentSolution = "test";
		}

		var solutionName = currentSolution;

		let from = homedir() + `\\source\\repos\\${solutionName}\\WebResources`;
		let to = globalExtensionFolder + `\\${solutionName}`;

		cp.exec(`cp -r ${from} ${to}`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' });

		var solutionDirectory = globalExtensionFolder + `\\${solutionName}`;

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Importing and Publishing Web Resources",
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 20, message: "Starting to push	 solution" });

			let response = await pushSolution(solutionDirectory, "", progress);

			if (response.failure) {
				vscode.window.showErrorMessage(response.text);
			}
			else {
				progress.report({ increment: 100, message: "Finished uploading solution!" });
				vscode.window.showInformationMessage("Finished uploading solution!");
			}
		});

	});

	let authCreateCommand = vscode.commands.registerCommand('solutionexplorer.authCreate', async () => {
		const result = await vscode.window.showInputBox({
			value: 'https://org.crm.dynamics.com/',
			placeHolder: 'CRM Url',
		});

		var regex = /https:\/\/(.*).crm.dynamics.com/g;
		let shortName = result?.matchAll(regex)?.next().value[1];

		currentAuth = shortName;

		cp.exec(`pac auth create --name ${shortName} --url ${result}`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }, (err, stdout, _stderr) => {
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

			let regexp2 = /\(([^)]+)\)/;
			let matches = regexp2.exec(result!);
			let name = matches![1];

			updateSetting("currentSolution", name);

			let defaultSolutionsFolder = globalExtensionFolder + `\\${name}`;

			if (!fs.existsSync(defaultSolutionsFolder)) {
				fs.mkdirSync(defaultSolutionsFolder);
			}

			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Extracting Zip Data",
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 20, message: "Starting to checkout solution" });

				let response = await unzipSolution(defaultSolutionsFolder, name, progress);

				if (response.failure) {
					vscode.window.showErrorMessage(response.text);
				}
				else {
					progress.report({ increment: 100, message: "Finished unpacking the solution!" });
					vscode.window.showInformationMessage("Finished unpacking solution!");
				}
			});
		});
	});

	let authSelectCommand = vscode.commands.registerCommand('solutionexplorer.authSelect', async () => {
		cp.exec(`pac auth list`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }, async (err, stdout, _stderr) => {
			if (err) {
				vscode.window.showErrorMessage('error: ' + err);
			}
			var regex = /https:\/\/(.*).crm.dynamics.com/g;
			let auths = [...stdout.matchAll(regex)].map(array => array[1]);
			const result = await vscode.window.showQuickPick(auths);

			updateSetting("currentAuth", result!);

			cp.exec(`pac auth select --name ${currentAuth}`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }, async (err, stdout, stderr) => {
				if (err) {
					throw "idk";
				}
				vscode.window.showInformationMessage(`Currently Selected Auth: ${currentAuth}`);
				updateAuthStatusBarItem();
			});
		});
	});

	context.subscriptions.push(authCreateCommand);
	context.subscriptions.push(solutionSelectCommand);
	context.subscriptions.push(authSelectCommand);
	context.subscriptions.push(solutionPushCommand);
}

function pushSolution(defaultSolutionsFolder: string, name: string, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>): Promise<{ failure: boolean, text: string }> {

	var myPromise = new Promise<{ failure: boolean, text: string }>((resolve, reject) => {
		cp.exec(`pac solution pack --folder ${defaultSolutionsFolder}\\ --zipfile ${defaultSolutionsFolder}.zip`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }, (err, stdout, stderr) => {
			if (err) {
				return resolve({ failure: true, text: stdout });
			}
			progress.report({ increment: 60, message: "Starting to import solution." });

			// There are a lot of options for this command that we should prob look more into
			// https://docs.microsoft.com/en-us/powerapps/developer/data-platform/cli/reference/solution-command
			cp.exec(`pac solution import --publish-changes --path ${defaultSolutionsFolder}.zip`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }, (err, stdout, stderr) => {
				if (err) {
					return resolve({ failure: true, text: stdout });
				}
			}).on("close", () => { resolve({ failure: false, text: "" }) });
		});
	});

	return myPromise;
}

function unzipSolution(defaultSolutionsFolder: string, name: string, progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>): Promise<{ failure: boolean, text: string }> {
	var myPromise = new Promise<{ failure: boolean, text: string }>((resolve, reject) => {
		//delete any previous zip that was there
		// cp.exec(`rm -f ${defaultSolutionsFolder}.zip`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' });
		cp.exec(`rm ${defaultSolutionsFolder}.zip`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' });

		cp.exec(`pac solution export --path ${defaultSolutionsFolder}.zip --name ${name}`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }, async (err, stdout, stderr) => {
			if (err) {
				return resolve({ failure: true, text: stdout });
			}

			progress.report({ increment: 60, message: "Starting to unpack solution." });

			cp.exec(`pac solution unpack --zipfile ${defaultSolutionsFolder}.zip --folder ${defaultSolutionsFolder}`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }, async (err, stdout, stderr) => {
				if (err) {
					return resolve({ failure: true, text: stdout });
				}

				var tempWorkspace = homedir() + `\\source\\repos\\${name}`;

				if (!fs.existsSync(tempWorkspace)) {
					fs.mkdirSync(tempWorkspace);
				}

				let from = globalExtensionFolder + `\\${name}\\WebResources`;

				let to = tempWorkspace;

				//I have no idea how to copy a directory in node - so i somply shant
				cp.exec(`cp -r ${from} ${to}`, { shell: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' });

				//open up in random repo 
				var openPath = vscode.Uri.parse("file:" + tempWorkspace.replace("C:\\", ""), true);

				vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ?
					vscode.workspace.workspaceFolders.length : 0,
					null,
					{ uri: openPath });
			}).on("close", () => { resolve({ failure: false, text: stdout }); });
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

	const currentAuthStatusBarCmd = 'statusbar.showCurrentAuth';
	vscode.commands.registerCommand(currentAuthStatusBarCmd, () => {
		vscode.window.showInformationMessage(`Currently selected :`);
	});

	currentAuthStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	currentAuthStatusBar.command = currentAuthStatusBarCmd;
	context.subscriptions.push(currentAuthStatusBar);


	updateSolutionStatusBarItem();
	updateAuthStatusBarItem();

}

function updateSolutionStatusBarItem(): void {
	currentSolutionStatusBar.text = currentSolution ? `Current Solution: ${currentSolution}` : "No Solution Selected";
	currentSolutionStatusBar.show();
}

function updateAuthStatusBarItem(): void {
	currentAuthStatusBar.text = currentAuth ? `Current Auth: ${currentAuth}` : "No Auth Selected";
	currentAuthStatusBar.show();
}

function updateSetting(setting: string, value: string) {
	if (setting === "currentAuth") {
		currentAuth = value;
		updateAuthStatusBarItem();
	} else if (setting === "currentSolution") {
		currentSolution = value;
		updateSolutionStatusBarItem();
	}
	updateSettingFile();

}

function updateSettingFile() {
	fs.writeFileSync(globalSavedConfigFile, `{
		"currentAuth": "${currentAuth}",
		"currentSolution": "${currentSolution}"
	}`);
}

function getUserSolutionWorkspace(): string {
	return userSolutionWorkspaceDir + `\\${currentSolution}`
}

// this method is called when your extension is deactivated
export function deactivate() { }
