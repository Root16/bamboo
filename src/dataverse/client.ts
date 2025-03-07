import { PublicClientApplication, Configuration, DeviceCodeRequest } from "@azure/msal-node";
import * as fs from "fs";
import * as path from "path";
import { WebResourceSyncerConfigurationManager } from "../classes/syncer/WebResourceSyncerConfigurationManager";
import jwt from "jsonwebtoken";



async function getEntities(token: string) {
	//@ts-expect-error cause i said so
	var headers = new Headers();
	headers.append("OData-MaxVersion", "4.0");
	headers.append("OData-Version", "4.0");
	headers.append("Accept", "application/json");
	headers.append("Authorization", "Bearer " + token);

	// var baseUrl = dynamicsUrl
	var baseUrl = ""
	var requestUrl = baseUrl + "/api/data/v9.2/entities?$select=name,logicalcollectionname";

	var requestOptions = {
		method: "GET",
		headers: headers
	};

	try {
		//@ts-expect-error cause i said so
		const response = await fetch(requestUrl, requestOptions)

		if (!response.ok) {
			throw new Error('GetSingle Request Not OK: ' + response.statusText);
		}
		return response.json();
	}
	catch (ex) {
		console.log(ex);
	}
}

async function getSingle(entityName: string, entityId: string, token: string, baseUrl: string) {
	//@ts-expect-error cause i said so
	var headers = new Headers();
	headers.append("OData-MaxVersion", "4.0");
	headers.append("OData-Version", "4.0");
	headers.append("Accept", "application/json");
	headers.append("Authorization", "Bearer " + token);

	var requestUrl = baseUrl + "/api/data/v9.2/" + entityName + "(" + entityId + ")";

	var requestOptions = {
		method: "GET",
		headers: headers
	};

	try {
		console.log(`Request URL ${requestUrl}`)
		//@ts-expect-error cause i said so
		const response = await fetch(requestUrl, requestOptions)

		if (!response.ok) {
			const foo = response.statusText;
			const bar = await response.json();
			throw new Error('GetSingle Request Not OK: ' + response.statusText);
		}
		return response.json();
	}
	catch (ex) {
		console.log(ex);
	}
}

async function getMultiple(entityName: string, token: string, queryOptions: string) {
	//@ts-expect-error cause i said so
	var headers = new Headers();
	headers.append("OData-MaxVersion", "4.0");
	headers.append("OData-Version", "4.0");
	headers.append("odata.include-annotations", "*");
	headers.append("Accept", "application/json");
	headers.append("Authorization", "Bearer " + token);
	headers.append("Prefer", 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"')

	// var baseUrl = dynamicsUrl
	var baseUrl = ""
	var requestUrl = baseUrl + "/api/data/v9.2/" + entityName + queryOptions;

	var requestOptions = {
		method: "GET",
		headers: headers
	};

	try {
		//@ts-expect-error cause i said so
		const response = await fetch(requestUrl, requestOptions)

		if (!response.ok) {
			throw new Error('GetMultiple Request Not OK: ' + response.statusText);
		}
		return response.json();
	}
	catch (ex) {
		console.log(ex);
	}
}



async function getDataverseToken(connectionString: string): Promise<[string, string]> {
	const cacheFile = await WebResourceSyncerConfigurationManager.getTokenCacheFilePath();

	const params = parseConnectionString(connectionString);

	const baseUrl = params.Url;

	const msalConfig: Configuration = {
		auth: {
			clientId: params.AppId,
			authority: "https://login.microsoftonline.com/common",
		},
		cache: {
			cachePlugin: createFileCachePlugin(cacheFile),
		},
	};

	const pca = new PublicClientApplication(msalConfig);

	const cachedToken = await getTokenFromCache();
	if (cachedToken) {
		console.log("using cached token");
		return [cachedToken, baseUrl];
	}

	const deviceCodeRequest: DeviceCodeRequest = {
		scopes: [`${params.Url}/.default`],
		deviceCodeCallback: (response) => {
			console.log(`please authenticate at: ${response.verificationUri}`);
			console.log(`enter this code: ${response.userCode}`);
		},
	};

	try {
		const authResponse = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
		if (!authResponse) throw new Error("failed to get token");

		console.log("authentication successful");

		return [authResponse.accessToken, baseUrl];
	} catch (error) {
		console.error("authentication failed:", error);
		throw error;
	}
}

function parseConnectionString(connectionString: string): Record<string, string> {
	return Object.fromEntries(
		connectionString
			.split(";")
			.map((pair) => pair.split("=").map((s) => s.trim()))
			.filter(([key, value]) => key && value) as [string, string][]
	);
}

async function getTokenFromCache(): Promise<any | null> {
    const tokenCachePath = await WebResourceSyncerConfigurationManager.getTokenCacheFilePath();

    if (!fs.existsSync(tokenCachePath)) {
        console.log("Token cache file not found.");
        return null;
    }

    const cacheData = JSON.parse(fs.readFileSync(tokenCachePath, "utf8"));
    
    const accessTokenEntry = Object.values(cacheData.AccessToken || {})[0] as any;
    if (!accessTokenEntry || !accessTokenEntry.secret) {
        console.log("No access token found in cache.");
        return null;
    }

    const decodedToken = jwt.decode(accessTokenEntry.secret) as jwt.JwtPayload;
    if (!decodedToken || !decodedToken.exp) {
        console.log("Invalid token format.");
        return null;
    }

    // Convert expiration time to ISO format
    accessTokenEntry.expiresOn = new Date(decodedToken.exp * 1000).toISOString();

    return accessTokenEntry;
}


// async function getCachedToken(pca: PublicClientApplication, resourceUrl: string): Promise<string | null> {
// 	const tokenCache = await WebResourceSyncerConfigurationManager.getTokenCacheFilePath();

// 	if (!fs.existsSync(tokenCache)) return null;

// 	try {
// 		const cache = JSON.parse(fs.readFileSync(tokenCache, "utf-8"));
// 		if (cache.expiresOn && new Date(cache.expiresOn) > new Date()) {
// 			return cache.accessToken;
// 		}
// 	} catch (error) {
// 		console.error("error reading token cache:", error);
// 	}

// 	return null;
// }

async function saveTokenToCache(accessToken: string): Promise<void> {
	const tokenCache = await WebResourceSyncerConfigurationManager.getTokenCacheFilePath();

	const decoded = jwt.decode(accessToken) as { exp?: number };

	if (!decoded || !decoded.exp) {
		console.error("failed to extract token expiration date");
		return;
	}

	const expiresOn = new Date(decoded.exp * 1000).toISOString();

	const cacheData = {
		accessToken,
		expiresOn,
	};

	fs.writeFileSync(tokenCache, JSON.stringify(cacheData, null, 2));

	console.log("token cached successfully");
}

function createFileCachePlugin(filePath: string) {
	return {
		beforeCacheAccess: async (cacheContext: any) => {
			if (fs.existsSync(filePath)) {
				cacheContext.tokenCache.deserialize(fs.readFileSync(filePath, "utf-8"));
			}
		},
		afterCacheAccess: async (cacheContext: any) => {
			if (cacheContext.cacheHasChanged) {
				fs.writeFileSync(filePath, cacheContext.tokenCache.serialize());
			}
		},
	};
}

export {
	getSingle,
	getMultiple,
	getEntities,
	getDataverseToken,
};