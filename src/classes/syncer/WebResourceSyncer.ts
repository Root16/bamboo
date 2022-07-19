import * as vscode from 'vscode';
import util = require('util');
import { Func } from 'mocha';
import { ListWebResourcesInSolutionAction, WebResoureceSyncerResponse } from '../../models/WebResourceSyncerResponse';


export default class WebResourceSyncer {
	_exePath: string;
	_execFile: Function;

	constructor(exePath: string, private connString: string) {
        if ([exePath, connString].some((s: string) => s === undefined || s === "")){
            throw new Error("Invalid parameters");
		}

		this._exePath = exePath;
		this._execFile = util.promisify(require('child_process').execFile);
	}

	//TODO - this should be not a singular function, but a list of steps
	//TODO - this should not use any[]
	private async reportProgress<T>(actionName: string, asyncFunc: Function, ...functionParams: any[]): Promise<T> {

		return await vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			cancellable: false,
			title: actionName
		}, async (progress) => {

			progress.report({ increment: 25 });

			let val = await asyncFunc(...functionParams) as T;

			progress.report({ increment: 100 });

			return val;
		});
	}

	async retreiveWebResourcesInSolution(solutionName: string): Promise<{
		name: string;
		id: string;
	}[]> {
		let asyncFunc = async (solutionName: string) => {
			const args = ['list', '--solution', solutionName, '--conn-string', this.connString];

			const procResult = await this._execFile(this._exePath, args, {
				shell: true,
				windowsHide: true,
			});

			let response: WebResoureceSyncerResponse = JSON.parse(procResult.stdout);

			let string = `Action: ${response.action.actionName}. Successful: ${response.action.successful}. ` 
							+ (response.action.successful ? "" : `Error message: ${response.action.errorMessage}`);

			if (response.action.successful) {
				vscode.window.showInformationMessage(string);
			} else {
				vscode.window.showErrorMessage(string, "Rerun this action?");
			}

			if (response.action.actionName === "ListWebResourcesInSolution") {
				let listAction = response.action as ListWebResourcesInSolutionAction;

				return listAction.webResources;
			} else {
				throw new Error("No ListWebResourceAction found?");
			}
		};

		return await this.reportProgress<{
			name: string;
			id: string;
		}[]>("Fetching WebResources...", asyncFunc, solutionName);
	}

	async uploadFile(solutionName: string, path: string, filePathInPowerApps: string, updateIfExists: boolean = false) {

		let asyncFunc = async (solutionName: string, path: string, filePathInPowerApps: string, updateIfExists: boolean)  => {
			const args = ['upload', '--file', path, '--file-name-in-pa', filePathInPowerApps,  '--solution',  solutionName, '--conn-string', this.connString];

			if (updateIfExists) {
				args.push('--update-if-exists');
			}
			
			const procResult = await this._execFile(this._exePath, args, {
				shell: true,
				windowsHide: true,
			});

			let response: WebResoureceSyncerResponse = JSON.parse(procResult.stdout);

			let string = `Action: ${response.action.actionName}. Successful: ${response.action.successful}. ` 
							+ (response.action.successful ? "" : `Error message: ${response.action.errorMessage}`);

			if (response.action.successful) {
				vscode.window.showInformationMessage(string);
			} else {
				vscode.window.showErrorMessage(string, "Rerun this action?");
			}

			return response.action.successful;
		};

		let successful = await this.reportProgress<boolean>("Uploading WebResource...", asyncFunc, solutionName, path, filePathInPowerApps, updateIfExists);

		let shouldPublish = vscode.workspace.getConfiguration().get<boolean>("bamboo.uploadWebResource.publishIfSuccessful");

		if (successful && shouldPublish) {
			await this.publishFile(path, filePathInPowerApps);
		}
	}

	async publishFile(path: string, filePathInPowerApps: string) {

		let asyncFunc = async (path: string) => {
			const args = ['publish', '--file', path, '--file-name-in-pa', filePathInPowerApps, '--conn-string', this.connString];

			const procResult = await this._execFile(this._exePath, args, {
				shell: true,
				windowsHide: true,
			});

			let response: WebResoureceSyncerResponse = JSON.parse(procResult.stdout);

			let string = `Action: ${response.action.actionName}. Successful: ${response.action.successful}. ` 
							+ (response.action.successful ? "" : `Error message: ${response.action.errorMessage}`);

			if (response.action.successful) {
				vscode.window.showInformationMessage(string);
			} else {
				vscode.window.showErrorMessage(string, "Rerun this action?");
			}
		};

		await this.reportProgress("Publishing WebResource...", asyncFunc, path);
	}
}
