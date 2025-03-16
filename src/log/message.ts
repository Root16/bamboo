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

export function logMessage(message: string, verboseSetting: VerboseSetting) {
    console.log(message);

    const verbosityPreference: "low" | "high" | undefined = vscode.workspace.getConfiguration().get<"low" | "high">("bamboo.general.messageVerbosity");

    if (verboseSetting === VerboseSetting.Low && (
        verbosityPreference === "low" ||
        verbosityPreference === "high"
    )) {
        vscode.window.showInformationMessage(message);
    } else if (verboseSetting === VerboseSetting.High && verbosityPreference === "high") {
        vscode.window.showInformationMessage(message);
    }
}

export function logErrorMessage(message: string, verboseSetting: VerboseSetting) {
    console.error(message);

    const verbosityPreference: "low" | "high" | undefined = vscode.workspace.getConfiguration().get<"low" | "high">("bamboo.general.messageVerbosity");

    if (verboseSetting === VerboseSetting.Low && (
        verbosityPreference === "low" ||
        verbosityPreference === "high"
    )) {
        vscode.window.showErrorMessage(message);
    } else if (verboseSetting === VerboseSetting.High && verbosityPreference === "high") {
        vscode.window.showErrorMessage(message);
    }
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

export enum VerboseSetting {
    Low = 0,
    High = 1,
    Internal = 2
}