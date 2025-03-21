import * as vscode from 'vscode';
import * as path from 'path';

export class SolutionComponentTreeItem extends vscode.TreeItem {
    public pathOnDisk: string = "";
    constructor(
        public readonly pathInPowerApps: string,
        public readonly id: string,
        public inSync: boolean,
        public collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(pathInPowerApps, collapsibleState);
        this.tooltip = `${this.pathInPowerApps}`;
        this.description = ``;
    }

    // command = {
    //     "title": "Show error",
    //     "command": "test.view.showError",
    // };

    iconPath = {
        light: vscode.Uri.file('resources/light/icon.svg'),
        dark: vscode.Uri.file('resources/dark/icon.svg')
    };
}
