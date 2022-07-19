// yea I know these are supposed to be camel case but the backend current won't both serialize an enum as a string AND camelcase it at the same time
export interface Action {
    actionName: string;
    successful: boolean;
    errorMessage: string;
}

export interface WebResouceUploadAction extends Action {
    webResourceName: string;
}

export interface ListWebResourcesInSolutionAction extends Action {
    webResources: {name: string, id: string}[];
}

export interface WebResoureceSyncerResponse {
    action: Action;
}