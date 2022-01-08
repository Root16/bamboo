import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';




export class WebResoucesProvider implements vscode.TreeDataProvider<WebResource> {
    private _onDidChangeTreeData: vscode.EventEmitter<WebResource | undefined | null | void> = new vscode.EventEmitter<WebResource | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<WebResource | undefined | null | void> = this._onDidChangeTreeData.event;

    // return new Dependency(
    //     moduleName,
    //     version,
    //     vscode.TreeItemCollapsibleState.Collapsed
    // );
    private testData: WebResource[] = [
        new WebResource (
            "main.js",
            "12-01-2021",
            vscode.TreeItemCollapsibleState.Collapsed
        ),
        new WebResource (
            "account.js",
            "05-01-2021",
            vscode.TreeItemCollapsibleState.Collapsed
        ),
        new WebResource (
            "opportunity.js",
            "12-01-2022",
            vscode.TreeItemCollapsibleState.Collapsed
        )
    ];

    constructor(private solutionName: string, webResources: string[]) {


    }

    getTreeItem(element: WebResource): vscode.TreeItem {
        return element;
    }

    getChildren(element?: WebResource): Thenable<WebResource[]> {
        if (element == null)
        {
            return Promise.resolve(this.testData);
        }
        return Promise.resolve([]);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

class WebResource extends vscode.TreeItem {
    constructor(
        public readonly name: string,
        public lastModifiedOn: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(name, collapsibleState);
        this.tooltip = `${this.name}-${this.lastModifiedOn}`;
        this.description = this.lastModifiedOn;
    }

    iconPath = {
        light: path.join(__filename, '..', '..', 'resources', 'light', 'debug.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'dark', 'debug.svg')
    };
}