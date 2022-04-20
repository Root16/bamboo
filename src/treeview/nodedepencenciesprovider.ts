import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Dependency as WebResource } from './webresource';

export class WebResourcesProvider implements vscode.TreeDataProvider<WebResource> {
    constructor(private webresourceNames: string[]) { }

    getTreeItem(element: WebResource): vscode.TreeItem {
        return element;
    }

    getChildren(element?: WebResource): Thenable<WebResource[]> {
        if (element) {
            console.log("I think we're at the end of a branch of the tree? Just return nothing");
            return Promise.resolve([]);
            // return Promise.resolve(
            //     this.getDepsInPackageJson(
            //         path.join(this.workspaceRoot, 'node_modules', element.label, 'package.json')
            //     )
            // );
        } else {
            console.log("I think we're at the root of the tree? Just return the list");

            return Promise.resolve(this.webresourceNames.map(n => new WebResource(n, true,
                vscode.TreeItemCollapsibleState.Collapsed
            )));
        }
    }

    /**
     * Given the path to package.json, read all its dependencies and devDependencies.
     */
    // private getDepsInPackageJson(packageJsonPath: string): WebResource[] {
    //     if (this.pathExists(packageJsonPath)) {
    //         const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

    //         const toDep = (moduleName: string, version: string): WebResource => {
    //             if (this.pathExists(path.join(this.workspaceRoot, 'node_modules', moduleName))) {
    //                 return new WebResource(
    //                     moduleName,
    //                     version,
    //                     vscode.TreeItemCollapsibleState.Collapsed
    //                 );
    //             } else {
    //                 return new WebResource(moduleName, version, vscode.TreeItemCollapsibleState.None);
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
}
