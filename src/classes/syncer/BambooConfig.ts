export interface BambooConfig {
    baseUrl: string;
    solutionUniqueName: string;
    credential: Credential;
    webResources: WebResourceMapping[];
    customControls: CustomControlMapping[];
}

export enum CredentialType {
    ClientSecret = 0,
    OAuth = 1,
}

export interface Credential {
    type: CredentialType;
    clientId: string;
    clientSecret: string;
    tenantId: string;
}

export interface WebResourceMapping {
    dataverseName: string;
    relativePathOnDisk: string;
}

export interface CustomControlMapping {
    dataverseName: string;
    relativePathOnDiskToSolution: string;
    solutionName: string;
}
