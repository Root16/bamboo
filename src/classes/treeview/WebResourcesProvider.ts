import * as vscode from 'vscode';
import { WebResource } from '../../models/WebResource';

export class WebResourcesProvider implements vscode.TreeDataProvider<WebResource> {
    id: number = 0;
    constructor(private webResources: WebResource[]) { }

    getTreeItem(element: WebResource): vscode.TreeItem {
        return element;
    }


    getChildren(element?: WebResource): Thenable<WebResource[]> {
        if (element) {
            //I think we're at the end of a branch of the tree? Just return nothing
            return Promise.resolve([]);
        } else {
            //I think we're at the root of the tree? Just return the list

            // return Promise.resolve(this.webresourceNames.map(n => new WebResource(n, `${this.id++}`, true,
            //     vscode.TreeItemCollapsibleState.Collapsed
            // )));
            return Promise.resolve(this.webResources);
        }
    }
}
