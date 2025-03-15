import * as vscode from 'vscode';

export function showTemporaryMessage(message: string, ms: number = 1000) {
	console.log(message);
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: message,
            cancellable: false
        },
        async (progress) => {
            return new Promise<void>((resolve) => {
                setTimeout(() => resolve(), ms);
            });
        }
    );
}

export function showMessage(message: string) {
	console.log(message);
    vscode.window.showInformationMessage(message);
}

export function showErrorMessage(message: string) {
	console.log(message);
	vscode.window.showErrorMessage(message);
}

export function showMessageWithProgress(message: string, callback: Promise<void>) {
	console.log(message);
    vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: message,
            cancellable: false
        },
        async (progress) => {
            return callback;
        }
    );
}