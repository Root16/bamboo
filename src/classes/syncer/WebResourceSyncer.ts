import * as vscode from 'vscode';
import { WebResoureceSyncerResponse, ListWebResourcesInSolutionAction } from '../../models/WebResourceSyncerResponse';
import util = require('util');



export class WebResourceSyncer {
	_exePath: string;
	_execFile: Function;


	constructor(exePath: string) {
		this._exePath = exePath;
		this._execFile = util.promisify(require('child_process').execFile);
	}

	async retreiveWebResourcesInSolution(solutionName: string): Promise<{
		name: string;
		id: string;
	}[]> {
		const args = ['--solution', solutionName, '--listWebResources',];

		const procResult = await this._execFile(this._exePath, args, {
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

	async uploadFile(solutionName: string, path: string, publish: boolean = false) {
		const args = ['--filePath', path, '--solution', solutionName, '--updateIfExists',];

		if (publish) {
			args.push('--publish');
		}

		const procResult = await this._execFile(this._exePath, args, {
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
