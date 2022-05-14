import * as vscode from 'vscode';
import { WebResoureceSyncerResponse, ListWebResourcesInSolutionAction } from '../../models/WebResourceSyncerResponse';
import util = require('util');
import { Func } from 'mocha';
import { Value } from 'sass';



export class WebResourceSyncer {
	_exePath: string;
	_execFile: Function;


	constructor(exePath: string) {
		this._exePath = exePath;
		this._execFile = util.promisify(require('child_process').execFile);
	}

	//TODO - this should be not a singular function, but a list of steps
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
			const args = ['list', '--solution', solutionName,];

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

			if (response.action.actionName === "ListWebresourcesInSolution") {
				let listAction = response.action as ListWebResourcesInSolutionAction;

				return listAction.webResources;
			} else {
				throw new Error("No ListWebResourceAction found?");
			}
		};

		return await this.reportProgress<{
			name: string;
			id: string;
		}[]>("Fetching Webresources...", asyncFunc, solutionName);
	}

	async uploadFile(solutionName: string, path: string, updateIfExists: boolean = false) {

		let asyncFunc = async (solutionName: string, path: string, updateIfExists: boolean) => {
			const args = ['upload', '--file', path, '--solution', solutionName,];

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
		};

		await this.reportProgress("Uploading Webresource...", asyncFunc, solutionName, path, updateIfExists);
	}

	async publishFile(path: string) {

		let asyncFunc = async (path: string) => {
			const args = ['publish', '--file', path];

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

		await this.reportProgress("Publishing Webresource...", asyncFunc, path);
	}
}