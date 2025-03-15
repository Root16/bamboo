import * as vscode from 'vscode';
import path from "path";
import { WebResourcesProvider } from './classes/treeview/WebResourcesProvider';
import { WebResource } from './models/WebResource';
import { BambooManager } from './classes/syncer/BambooManager';
import WebResourceSyncer from './classes/syncer/WebResourceSyncer';
import { getOAuthToken, getSingle, uploadJavaScriptFile } from './dataverse/client';

const SYNCER_EXE_PATH = "/WebResource.Syncer/WebResource.Syncer/bin/Release/net6.0/win-x64/publish/WebResource.Syncer.exe";
const EXTENSION_NAME = "bamboo";

export async function activate(context: vscode.ExtensionContext) {
	if (! await BambooManager.currentWorkspaceHasConfigFile()) {
		vscode.window.showErrorMessage(`There is no ${BambooManager.workspaceConfigFileName} in the root of the current workspace! Please add one with the properties: 'connectionString' and 'solutionName', and then refresh the extension by running the command: '>Reload Window'`);
		return;
	}

	const bambooConfig = await BambooManager.getConfig();

	//Always test connection on startup
	const token = await getOAuthToken(
		bambooConfig.credential.clientId,
		bambooConfig.credential.clientSecret,
		bambooConfig.credential.tenantId,
		bambooConfig.credential.baseUrl,
	);

	if (token === null) {
		vscode.window.showErrorMessage("Unable to authenticate with the CRM instance. Please check your connection details.");
		return;
	}

	const account = await getSingle('accounts', "b3ae0b11-60ea-eb11-bacb-000d3a332312", token, bambooConfig.credential.baseUrl);

	// if (vscode.workspace.getConfiguration().get<boolean>("bamboo.general.listFilesOnStartup")) {
	// 	const solutionName = await BambooManager.getSolution();

	// 	const webResourceProvider = new WebResourcesProvider(solutionName, syncer);

	// 	vscode.window.registerTreeDataProvider(
	// 		`webresourceTree`,
	// 		webResourceProvider,
	// 	);

	// 	vscode.commands.registerCommand('bamboo.webresourceTree.refreshEntry', () =>
	// 		webResourceProvider.refresh()
	// 	);
	// }

	// vscode.commands.registerCommand('bamboo.createAndUploadFile', async (resource: vscode.Uri) => {
	// 	let currentWorkspaceFolders = vscode.workspace.workspaceFolders;
	// 	if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
	// 		vscode.window.showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
	// 	}
	// 	let currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

	// 	let localPath = resource.path.replace(currentWorkspacePath, "");

	// 	let possibleRemotePath = await BambooManager.getWRPathInPowerApps(localPath);
	// 	let remotePath = possibleRemotePath;

	// 	if (
	// 		vscode.workspace.getConfiguration().get<boolean>("bamboo.createWebResource.askForName") &&
	// 		possibleRemotePath === null
	// 	) {
	// 		remotePath = localPath;
	// 		let userRequestedRemotePath = await vscode.window.showInputBox({
	// 			prompt: `Input the full name of the webresource. Cancel this dialog to use the relative path from ${BambooManager.workspaceConfigFileName} instead.`,
	// 			placeHolder: "/my-webresources/forms/project.js"
	// 		});

	// 		if (userRequestedRemotePath !== undefined && userRequestedRemotePath !== "") {
	// 			userRequestedRemotePath = userRequestedRemotePath[0] === "/" ? userRequestedRemotePath : "/" + userRequestedRemotePath;
	// 			remotePath = userRequestedRemotePath;
	// 		}

	// 		await BambooManager.saveWebResourceFileMapping(localPath, remotePath);
	// 	}
	// 	else if (possibleRemotePath === null) {
	// 		remotePath = localPath;
	// 		await BambooManager.saveWebResourceFileMapping(localPath, remotePath);
	// 	}

	// 	const solutionName = await BambooManager.getSolution();

	// 	const updateIfExists = vscode.workspace.getConfiguration().get<boolean>("bamboo.createWebResource.updateIfExists");

	// 	await syncer.uploadFile(solutionName, resource.fsPath, remotePath!, updateIfExists);
	// });

	vscode.commands.registerCommand('bamboo.updateFile', async (resource: vscode.Uri) => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			vscode.window.showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
		}

		const token = await getOAuthToken(
			bambooConfig.credential.clientId,
			bambooConfig.credential.clientSecret,
			bambooConfig.credential.tenantId,
			bambooConfig.credential.baseUrl,
		);

		//TODO this code shouldnt be everywhere
		if (token === null) {
			vscode.window.showErrorMessage("Unable to authenticate with the CRM instance. Please check your connection details.");
			return;
		}

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		const filePathInPowerApps = resource.path.replace(currentWorkspacePath, "");

		const solutionName = await BambooManager.getSolution();

		const webResourceFileName = await BambooManager.getWRPathInPowerApps(filePathInPowerApps);

		if (webResourceFileName === null) {
			throw new Error("File mapping not found in config file! Please either manually add the mapping to the config file, or create the webresource through this tool.");
		}

		return;

		// await uploadJavaScriptFile(
		// 	resource.fsPath,
		// 	webResourceFileName,
		// 	solutionName,
		// 	token
		// );

		// await syncer.uploadFile(solutionName, resource.fsPath, webResourceFileName, true);
	});

	vscode.commands.registerCommand('bamboo.syncAllFiles', async () => {
		const currentWorkspaceFolders = vscode.workspace.workspaceFolders;
		if (currentWorkspaceFolders === undefined || currentWorkspaceFolders?.length > 1) {
			vscode.window.showErrorMessage(`Either no workspace is open - or too many are! Please open only one workspace in order to use Bamboo`);
		}

		const token = await getOAuthToken(
			bambooConfig.credential.clientId,
			bambooConfig.credential.clientSecret,
			bambooConfig.credential.tenantId,
			bambooConfig.credential.baseUrl,
		);

		//TODO this code shouldnt be everywhere
		if (token === null) {
			vscode.window.showErrorMessage("Unable to authenticate with the CRM instance. Please check your connection details.");
			return;
		}

		const currentWorkspacePath = currentWorkspaceFolders![0].uri.path;

		const solutionName = await BambooManager.getSolution();

		const config = await BambooManager.getConfig();

		for (const wrMapping of config.webResources) {
			const relativePathOnDisk = currentWorkspacePath + "/" + wrMapping.relativePathOnDisk;
			let fixedPath = relativePathOnDisk.replace(/^\/([a-zA-Z]):\//, "$1:/"); // Remove extra leading slash if present
			const normalizedPath = path.normalize(fixedPath);

			const response = await uploadJavaScriptFile(
				normalizedPath,
				wrMapping.dataverseName,
				solutionName,
				token
			);

			vscode.window.showInformationMessage(response);
		}
	});

	vscode.window.showInformationMessage(`Bamboo initialized successfully.`);
}

function deactivate() { }