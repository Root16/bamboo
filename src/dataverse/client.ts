import { PublicClientApplication, DeviceCodeRequest } from "@azure/msal-node";

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
	const params = parseConnectionString(connectionString);
	const baseUrl = params.Url;

	const msalConfig = {
		auth: {
			clientId: params.AppId, 
			authority: "https://login.microsoftonline.com/common",
		},
	};

	const pca = new PublicClientApplication(msalConfig);

	const deviceCodeRequest: DeviceCodeRequest = {
		scopes: [`${params.Url}/.default`],
		deviceCodeCallback: (response) => {
			console.log(`\nPlease authenticate at: ${response.verificationUri}`);
			console.log(`Enter this code: ${response.userCode}`);
		},
	};

	try {
		const authResponse = await pca.acquireTokenByDeviceCode(deviceCodeRequest);
		if (!authResponse) throw new Error("Failed to get token.");

		console.log("authentication successful!");
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
export { 
	getSingle, 
	getMultiple, 
	getEntities, 
	getDataverseToken,
};