import * as vscode from 'vscode';
import { Event, EventEmitter } from 'vscode';
import { SolutionComponentTreeItem } from './SolutionComponentTreeItem';
import { BambooManager } from '../syncer/BambooManager';

export class SolutionComponentsProvider implements vscode.TreeDataProvider<SolutionComponentTreeItem> {
    private webResources: SolutionComponentTreeItem[] = [];
    private customControls: SolutionComponentTreeItem[] = [];
    private dataLoaded: boolean = false;

    constructor(private bambooManager: BambooManager) {
    }

    getTreeItem(element: SolutionComponentTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: SolutionComponentTreeItem): Promise<SolutionComponentTreeItem[]> {
        if (element) {
            if (element.pathOnDisk) {
                return Promise.resolve([new SolutionComponentTreeItem(element.pathOnDisk, element.id + "idk", true,
                    vscode.TreeItemCollapsibleState.None)]);
            } else {
                return Promise.resolve([]);
            }
        } else {
            if (this.dataLoaded) {
                return Promise.resolve([...this.webResources, ...this.customControls]);
            } else {
                return Promise.resolve([]);
            }
        }
    }

    private _onDidChangeTreeData: EventEmitter<SolutionComponentTreeItem | undefined> = new EventEmitter<SolutionComponentTreeItem | undefined>();

    readonly onDidChangeTreeData: Event<SolutionComponentTreeItem | undefined> = this._onDidChangeTreeData.event;

    async refresh(): Promise<void> {
        const webResources = await this.bambooManager.listWebResourcesInSolution();
        const customControls = await this.bambooManager.listCustomControlsInSolution();

        this.webResources = webResources.map(r => new SolutionComponentTreeItem(r.name, r.id, true, vscode.TreeItemCollapsibleState.None));
        this.customControls = customControls.map(r => new SolutionComponentTreeItem(r.name, r.id, true, vscode.TreeItemCollapsibleState.None));

        this.dataLoaded = true;

        this._onDidChangeTreeData.fire(undefined);
    }
}