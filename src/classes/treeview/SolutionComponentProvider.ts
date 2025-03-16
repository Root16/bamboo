import { stringify } from 'querystring';
import * as vscode from 'vscode';
import { Event, EventEmitter } from 'vscode';
import { SolutionComponentTreeItem } from './SolutionComponentTreeItem';
import { BambooManager } from '../syncer/BambooManager';

export class SolutionComponentsProvider implements vscode.TreeDataProvider<SolutionComponentTreeItem> {
    constructor(private bambooManager: BambooManager) {
    }

    getTreeItem(element: SolutionComponentTreeItem): vscode.TreeItem {
        return element;
    }


    async getChildren(element?: SolutionComponentTreeItem): Promise<SolutionComponentTreeItem[]> {
        if (element) {
            if (element.pathOnDisk) {
                return Promise.resolve([new SolutionComponentTreeItem(element.pathOnDisk, element.id + "idk", true,
                    vscode.TreeItemCollapsibleState.None
                )]);

            } else {
                return Promise.resolve([]);
            }
        } else {
            const webResources = await this.bambooManager.listWebResourcesInSolution();
            const customControls = await this.bambooManager.listCustomControlsInSolution();

            const mapped = Promise.all([...webResources, ...customControls].map(async r => {
                const solutionComponent = new SolutionComponentTreeItem(r.name, r.id, true,
                    vscode.TreeItemCollapsibleState.None
                );

                return solutionComponent;
            }));

            return mapped;
        }
    }

    private _onDidChangeTreeData: EventEmitter<SolutionComponentTreeItem | undefined> = new EventEmitter<SolutionComponentTreeItem | undefined>();

    readonly onDidChangeTreeData: Event<SolutionComponentTreeItem | undefined> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }
}
