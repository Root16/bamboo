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

    /**
     * Given the path to package.json, read all its dependencies and devDependencies.
     */
    // private getDepsInPackageJson(packageJsonPath: string): Dependency[] {
    //     if (this.pathExists(packageJsonPath)) {
    //         const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    //         const toDep = (moduleName: string, version: string): Dependency => {
    //             if (this.pathExists(path.join(this.workspaceRoot, 'node_modules', moduleName))) {
    //                 return new Dependency(
    //                     moduleName,
    //                     version,
    //                     vscode.TreeItemCollapsibleState.Collapsed
    //                 );
    //             } else {
    //                 return new Dependency(moduleName, version, vscode.TreeItemCollapsibleState.None);
    //             }
    //         };

    //         const deps = packageJson.dependencies
    //             ? Object.keys(packageJson.dependencies).map(dep =>
    //                 toDep(dep, packageJson.dependencies[dep])
    //             )
    //             : [];
    //         const devDeps = packageJson.devDependencies
    //             ? Object.keys(packageJson.devDependencies).map(dep =>
    //                 toDep(dep, packageJson.devDependencies[dep])
    //             )
    //             : [];
    //         return deps.concat(devDeps);
    //     } else {
    //         return [];
    //     }
    // }

    // private pathExists(p: string): boolean {
    //     try {
    //         fs.accessSync(p);
    //     } catch (err) {
    //         return false;
    //     }
    //     return true;
    // }


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
        light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
    };
}