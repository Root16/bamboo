import { stringify } from 'querystring';
import * as vscode from 'vscode';
import { Event, EventEmitter } from 'vscode';
import { WebResource } from '../../models/WebResource';
import WebResourceSyncer from '../syncer/WebResourceSyncer';
import { BambooManager } from '../syncer/BambooManager';

//TODO - this class should not use 'WebResource' as it's model, instead it should use a new model that is more generic
export class WebResourcesProvider implements vscode.TreeDataProvider<WebResource> {
    constructor(private solutionName: string, private syncer: WebResourceSyncer) {
    }

    getTreeItem(element: WebResource): vscode.TreeItem {
        return element;
    }


    async getChildren(element?: WebResource): Promise<WebResource[]> {
        if (element) {
            if (element.pathOnDisk) {
                return Promise.resolve([new WebResource(element.pathOnDisk, element.id + "idk", true,
                    vscode.TreeItemCollapsibleState.Collapsed
                )]);

            } else {
                return Promise.resolve([]);
            }
        } else {
            var webresources = await this.syncer.retreiveWebResourcesInSolution(this.solutionName);

            var mapped = Promise.all(webresources.map(async r => {
                var webResource = new WebResource(r.name, r.id, true,
                    vscode.TreeItemCollapsibleState.Collapsed
                );

                var pathInPAWithoutPublisher = r.name.substring(r.name.indexOf("_") + 1);

                // var diskPath = await BambooManager.getWRDiskPath(pathInPAWithoutPublisher);
                var diskPath = "";
                if (diskPath !== null) {
                    webResource.pathOnDisk = diskPath;
                }

                return webResource;
            }));

            return mapped;
        }
    }

    private _onDidChangeTreeData: EventEmitter<WebResource | undefined> = new EventEmitter<WebResource | undefined>();

    readonly onDidChangeTreeData: Event<WebResource | undefined> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}
