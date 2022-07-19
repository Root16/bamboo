import * as vscode from 'vscode';
import { Event, EventEmitter } from 'vscode';
import { WebResource } from '../../models/WebResource';
import WebResourceSyncer from '../syncer/WebResourceSyncer';

export class WebResourcesProvider implements vscode.TreeDataProvider<WebResource> {
    // webresources: WebResource[] = [];
    constructor(private solutionName: string, private syncer: WebResourceSyncer) {
    }

    getTreeItem(element: WebResource): vscode.TreeItem {
        return element;
    }


    async getChildren(element?: WebResource): Promise<WebResource[]> {
        if (element) {
            //I think we're at the end of a branch of the tree? Just return nothing
            return Promise.resolve([]);
        } else {
            //I think we're at the root of the tree? Just return the list

            var webresources = await this.syncer.retreiveWebResourcesInSolution(this.solutionName);
            
            var mapped = webresources.map(r => new WebResource(r.name, r.id, true,
                vscode.TreeItemCollapsibleState.Collapsed
            ));

            return Promise.resolve(mapped);
        }
    }

    private _onDidChangeTreeData: EventEmitter<WebResource | undefined> = new EventEmitter<WebResource | undefined>();

    readonly onDidChangeTreeData: Event<WebResource | undefined> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}
