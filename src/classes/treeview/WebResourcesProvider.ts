import { stringify } from 'querystring';
import * as vscode from 'vscode';
import { Event, EventEmitter } from 'vscode';
import { WebResourceTreeItem } from './WebResource';
import WebResourceSyncer from '../syncer/WebResourceSyncer';
import { BambooManager } from '../syncer/BambooManager';

//TODO - this class should not use 'WebResource' as it's model, instead it should use a new model that is more generic
export class WebResourcesProvider implements vscode.TreeDataProvider<WebResourceTreeItem> {
    constructor(private bambooManager: BambooManager) {
    }

    getTreeItem(element: WebResourceTreeItem): vscode.TreeItem {
        return element;
    }


    async getChildren(element?: WebResourceTreeItem): Promise<WebResourceTreeItem[]> {
        if (element) {
            if (element.pathOnDisk) {
                return Promise.resolve([new WebResourceTreeItem(element.pathOnDisk, element.id + "idk", true,
                    vscode.TreeItemCollapsibleState.Collapsed
                )]);

            } else {
                return Promise.resolve([]);
            }
        } else {
            var webresources = await this.bambooManager.listWebResourcesInSolution();

            var mapped = Promise.all(webresources.map(async r => {
                var webResource = new WebResourceTreeItem(r.name, r.id, true,
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

    private _onDidChangeTreeData: EventEmitter<WebResourceTreeItem | undefined> = new EventEmitter<WebResourceTreeItem | undefined>();

    readonly onDidChangeTreeData: Event<WebResourceTreeItem | undefined> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}
