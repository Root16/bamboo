import * as vscode from 'vscode';
import * as path from 'path';

export class WebResource extends vscode.TreeItem {
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

    command = {
        "title": "Show error",
        "command": "test.view.showError",
    };

    iconPath = {
        light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    };
}
