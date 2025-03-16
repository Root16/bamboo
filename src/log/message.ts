import * as vscode from 'vscode';

export function logTemporaryMessage(message: string, verboseSetting: VerboseSetting, ms: number = 2000) {
    console.log(message);

    const verbosityPreference: "low" | "high" | undefined = vscode.workspace.getConfiguration().get<"low" | "high">("bamboo.general.messageVerbosity");

    if (verboseSetting === VerboseSetting.Low && (
        verbosityPreference === "low" ||
        verbosityPreference === "high"
    )) {
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
    } else if (verboseSetting === VerboseSetting.High && verbosityPreference === "high") {
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
}

export async function logMessageWithProgress<T>(message: string, action: () => Promise<T>): Promise<T> {
    console.log(message);
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: message,
            cancellable: false
        },
        async () => {
            const result = await action();
            return result;
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