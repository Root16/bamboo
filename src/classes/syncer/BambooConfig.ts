export interface BambooConfig {
    solutionName: string;
    credential: Credential;
    fileMappings: { [key: string]: string };
}

export interface Credential {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    baseUrl: string;
}