export interface BambooConfig {
    baseUrl: string;
    solutionUniqueName: string;
    credential: Credential;
    webResources: WebResourceMapping[];
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
    baseUrl: string;
}

export interface WebResourceMapping {
    dataverseName: string;
    relativePathOnDisk: string;
}
