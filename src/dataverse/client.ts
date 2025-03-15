import { PublicClientApplication, Configuration, DeviceCodeRequest } from "@azure/msal-node";
import fs from "fs/promises";
import * as path from "path";
import { BambooManager } from "../classes/syncer/BambooManager";
import jwt from "jsonwebtoken";

const DATAVERSE_BASE_URL = "https://jyb.crm.dynamics.com";
const WEB_RESOURCES_API = `${DATAVERSE_BASE_URL}/api/data/v9.1/webresourceset`;
const SOLUTIONS_API = `${DATAVERSE_BASE_URL}/api/data/v9.1/AddSolutionComponent`;
const PUBLISH_API = `${DATAVERSE_BASE_URL}/api/data/v9.1/PublishXml`;

/**
 * Uploads a JavaScript file as a Web Resource to Dataverse, adds it to a solution, and publishes it.
 */
export async function uploadJavaScriptFile(
	filePath: string,
	name: string,
	solutionName: string,
	token: string
) {
	try {
		const normalizedPath = path.normalize(filePath);
		const content = await fs.readFile(normalizedPath, "utf-8");
		const base64Content = Buffer.from(content).toString("base64");

		// Step 1: Check if the web resource exists
		console.log("Checking if web resource exists...");
		const existingResource = await getWebResource(name, token);

		let webResourceId: string;
		if (existingResource) {
			console.log(`Updating existing web resource: ${name}`);
			webResourceId = existingResource.webresourceid;
			await updateWebResource(webResourceId, base64Content, token);
		} else {
			console.log(`Creating new web resource: ${name}`);
			webResourceId = await createWebResource(name, base64Content, token);
		}

		// Step 2: Add to Solution
		console.log(`Adding Web Resource to solution: ${solutionName}`);
		await addToSolution(webResourceId, solutionName, token);

		// Step 3: Publish Web Resource
		console.log(`Publishing Web Resource: ${name}`);
		await publishWebResource(webResourceId, token);

		return "Upload completed successfully!";
	} catch (error) {
		console.log(error);
		return "Error uploading JavaScript file:";
	}
}

/**
 * Checks if a Web Resource exists in Dataverse.
 */
async function getWebResource(name: string, token: string) {
	//@ts-expect-error cause i said so
	const response = await fetch(`${WEB_RESOURCES_API}?$filter=name eq '${name}'`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
	});

	const data = await response.json();
	return data.value.length > 0 ? data.value[0] : null;
}

/**
 * Creates a new Web Resource.
 */
async function createWebResource(name: string, base64Content: string, token: string): Promise<string> {
	const body = {
		name: name,
		displayname: name,
		webresourcetype: 3, // Type 3 = JavaScript
		content: base64Content,
	};

	//@ts-expect-error cause i said so
	const response = await fetch(WEB_RESOURCES_API, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`Failed to create Web Resource: ${response.statusText}`);
	}

	const data = await response.json();
	return data.webresourceid;
}

/**
 * Updates an existing Web Resource.
 */
async function updateWebResource(webResourceId: string, base64Content: string, token: string) {
	const body = {
		content: base64Content,
	};

	//@ts-expect-error cause i said so
	const response = await fetch(`${WEB_RESOURCES_API}(${webResourceId})`, {
		method: "PATCH",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`Failed to update Web Resource: ${response.statusText}`);
	}
}

/**
 * Adds a Web Resource to a solution.
 */
async function addToSolution(webResourceId: string, solutionName: string, token: string) {
	const body = {
		ComponentId: webResourceId,
		ComponentType: 61, // Web Resource
		SolutionUniqueName: solutionName,
		AddRequiredComponents: false,
	};

	//@ts-expect-error cause i said so
	const response = await fetch(SOLUTIONS_API, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`Failed to add Web Resource to solution: ${response.statusText}`);
	}
}

/**
 * Publishes a Web Resource.
 */
async function publishWebResource(webResourceId: string, token: string) {
	const body = {
		ParameterXml: `<importexportxml><webresources><webresource>${webResourceId}</webresource></webresources></importexportxml>`,
	};

	//@ts-expect-error cause i said so
	const response = await fetch(PUBLISH_API, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(`Failed to publish Web Resource: ${response.statusText}`);
	}
}


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
): Promise<string | null> {
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
		return null;
	}
}

async function loadCachedToken(): Promise<OAuthTokenResponse | null> {
	const TOKEN_CACHE_PATH = await BambooManager.getTokenCacheFilePath();

	try {
		const fileContent = await fs.readFile(TOKEN_CACHE_PATH, "utf-8");
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