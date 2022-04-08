// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import { env } from 'process';
import { homedir } from 'os';
import * as child from 'child_process';

let currentSolutionStatusBar: vscode.StatusBarItem;
let currentAuthStatusBar: vscode.StatusBarItem;
let currentSolution: string;
let currentAuth: string;


const globalExtensionFolder = homedir() + "\\AppData\\Roaming\\Code\\User\\globalStorage\\" + "root16.vscode-web-resource-explorer";

const globalSavedConfigFile = globalExtensionFolder + "\\settings.json";

interface WebResourceUploadResult {
    data: string;
}

export class WebResourceUploader {
    uploadFile() {            
        const res = child.execFileSync('C:\\Users\\JohnYenter-Briars\\hackathon\\dev\\vscode-web-resource-explorer\\web-resource-uploader\\WebResource.Uploader\\bin\\Release\\ne6.0\\WebResource.Uploader.exe', ['arg0', 'arg1']);
        const res1 = child.execFileSync('pwd');
		// var idk = res1.toString();
        // const res = child.execFileSync('.\\web-resource-uploader\\Webresource.Uploader\\Webresource.Uploader\\bin\\Release\\net6.0\\WebResource.Uploader.exe', ['arg0', 'arg1']);
        let result: WebResourceUploadResult = {data: res.toString()};
		console.log(result.data);
    }
}

export async function activate(context: vscode.ExtensionContext) {

	//confirming that this really does work. do with it what you will
	let idk = context.extensionPath;
	let value = idk + "/Webresource.Uploader/Webresource.Uploader/bin/Release/net6.0/";
	console.log(idk);
	const res2 = child.execFileSync('dir', [idk]).toString();
	const res1 = child.execFileSync('dir', [value]).toString();
	console.log(res1);
}

// this method is called when your extension is deactivated
export function deactivate() { }
