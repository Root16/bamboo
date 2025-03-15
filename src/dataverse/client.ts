import { PublicClientApplication, Configuration, DeviceCodeRequest } from "@azure/msal-node";
import fs from "fs/promises";
import * as path from "path";
import { BambooManager } from "../classes/syncer/BambooManager";
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

interface OAuthTokenResponse {
	token_type: string;
	expires_in: number;
	ext_expires_in: number;
	access_token: string;
	expires_at: number; // Custom field to store expiration time
}

async function getOAuthToken(
	clientId: string,
	clientSecret: string,
	tenantId: string,
	baseUrl: string
): Promise<string> {
	const cachedToken = await loadCachedToken();
	if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
		console.log("Using cached token.");
		return cachedToken.access_token;
	}

	console.log("Fetching new token...");
	const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
	const params = new URLSearchParams({
		client_id: clientId,
		client_secret: clientSecret,
		scope: `${baseUrl}/.default`,
		grant_type: "client_credentials",
	});

	try {
		//@ts-expect-error cause i said so
		const response = await fetch(tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch token: ${response.status} - ${response.statusText}`);
		}

		const data: OAuthTokenResponse = await response.json();

		data.expires_at = Date.now() + data.expires_in * 1000;

		await saveCachedToken(data);

		return data.access_token;
	} catch (error) {
		console.error("Error fetching OAuth token:", error);
		throw error;
	}
}

async function loadCachedToken(): Promise<OAuthTokenResponse | null> {
	const TOKEN_CACHE_PATH = await BambooManager.getTokenCacheFilePath();

	try {
		const fileContent = await fs.readFile(TOKEN_CACHE_PATH,  "utf-8");
		return JSON.parse(fileContent);
	} catch {
		return null;
	}
}


async function saveCachedToken(token: OAuthTokenResponse): Promise<void> {
	const TOKEN_CACHE_PATH = await BambooManager.getTokenCacheFilePath();

	try {
		await fs.writeFile(TOKEN_CACHE_PATH, JSON.stringify(token, null, 2), "utf-8");
	} catch (error) {
		console.error("Failed to write token cache:", error);
	}
}


export {
	getSingle,
	getMultiple,
	getEntities,
	getOAuthToken,
	OAuthTokenResponse,
};