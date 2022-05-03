import * as vscode from 'vscode';
import * as path from 'path';


export class WebResource extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public readonly id: string,
        public inSync: boolean,
        public collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(name, collapsibleState);
        this.tooltip = `${this.name}`;
        this.description = `In sync: ${this.inSync}`;
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
