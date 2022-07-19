export interface WebResourceSyncerConfiguration {
    connectionString: string;
    solutionName: string;
    fileMappings: { [key: string]: string };
}