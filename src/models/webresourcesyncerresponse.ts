export enum ActionName {
    create,
    update,
    addedToSolution,
    publish,
    listWebResourcesInSolution
}

export interface Action {
    actionName: ActionName;
    successful: boolean;
    errorMessage: string;
}

export interface WebResouceUploadAction extends Action {
    webResourceName: string;
}

export interface ListWebResourcesInSolution extends Action {
    webResources: string[];
}

export interface WebResoureceSyncerResponse {
    actionList: Action[];
    dryRun: boolean;
}