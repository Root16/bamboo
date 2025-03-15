export interface BambooConfig {
    solutionName: string;
    credential: Credential;
    webResources: WebResourceMapping[];
}

export interface Credential {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    baseUrl: string;
}

export interface WebResourceMapping {
    dataverseName: string;
    relativePathOnDisk: string;
}
