import fs from "fs/promises";
import * as path from "path";
import { BambooManager } from "../classes/syncer/BambooManager";
import jwt from "jsonwebtoken";
import { OAuthTokenResponse } from "./IOAuthtokenResponse";
import { IWebResource } from "./IWebResource";
import { ISolution } from "./ISolution";
import { showMessageWithProgress, showTemporaryMessage } from "../log/message";
import { BambooConfig } from "../classes/syncer/BambooConfig";
import { ICustomControl } from "./ICustomControl";

export class DataverseClient {
	private webResourcesApi: string;
	private solutionApi: string;
	private solutionsApi: string;
	private publishApi: string;

	constructor(private config: BambooConfig) {
		this.webResourcesApi = `${this.config.baseUrl}/api/data/v9.2/webresourceset`;
		this.solutionApi = `${this.config.baseUrl}/api/data/v9.2/solutions`;
		this.solutionsApi = `${this.config.baseUrl}/api/data/v9.2/AddSolutionComponent`;
		this.publishApi = `${this.config.baseUrl}/api/data/v9.2/PublishXml`;
	}
	async listWebResourcesInSolution(
		solutionUniqueName: string,
		token: string
	): Promise<IWebResource[]> {
		const solution = await this.getSolution(solutionUniqueName, token);

		if (solution === null) {
			console.log(`Can't find solution with name: ${solutionUniqueName}`);
			return [];
		}

		const fetchXml = `
			<fetch>
				<entity name="solutioncomponent">
					<attribute name="componenttype" />
						<link-entity name="webresource" to="objectid" from="webresourceid" alias="webresource" link-type="inner">
							<attribute name="webresourceid" />
							<attribute name="name" />
						</link-entity>
					<filter>
						<condition attribute="solutionid" operator="eq" value="${solution.solutionid}" />
						<condition attribute="componenttype" operator="eq" value="61" />
					</filter>
				</entity>
			</fetch>
		`.replace(/\s+/g, ' ').trim();

		const solutionComponentUrl = `${this.config.baseUrl}/api/data/v9.2/solutioncomponents?fetchXml=${encodeURIComponent(fetchXml)}`;

		try {
			//@ts-expect-error cause i said so
			const response = await fetch(solutionComponentUrl, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch web resources: ${response.statusText}`);
			}

			const data = await response.json();

			const mapped = data.value.map((item: any) => {
				const wr: IWebResource = {
					id: item["webresource.webresourceid"],
					name: item["webresource.name"],
				};

				return wr;
			});

			return mapped;
		} catch (error) {
			console.error("Error fetching web resources:", error);
			return [];
		}
	}
	async listCustomControlsInSolution(
		solutionUniqueName: string,
		token: string
	): Promise<ICustomControl[]> {
		const solution = await this.getSolution(solutionUniqueName, token);

		if (solution === null) {
			console.log(`Can't find solution with name: ${solutionUniqueName}`);
			return [];
		}

		const fetchXml = `
			<fetch>
				<entity name="solutioncomponent">
					<attribute name="componenttype" />
					<link-entity name="customcontrol" to="objectid" from="customcontrolid" alias="customcontrol" link-type="inner">
						<attribute name="customcontrolid" />
						<attribute name="name" />
					</link-entity>
					<filter>
						<condition attribute="solutionid" operator="eq" value="${solution.solutionid}" />
						<condition attribute="componenttype" operator="eq" value="66" />
					</filter>
				</entity>
			</fetch>
		`.replace(/\s+/g, ' ').trim();

		const solutionComponentUrl = `${this.config.baseUrl}/api/data/v9.2/solutioncomponents?fetchXml=${encodeURIComponent(fetchXml)}`;

		try {
			//@ts-expect-error cause i said so
			const response = await fetch(solutionComponentUrl, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
					Accept: "application/json",
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch custom controls: ${response.statusText}`);
			}

			const data = await response.json();

			const mapped = data.value.map((item: any) => {
				const cc: ICustomControl = {
					id: item["customcontrol.customcontrolid"],
					name: item["customcontrol.name"],
				};

				return cc;
			});

			return mapped;
		} catch (error) {
			console.error("Error fetching custom controls:", error);
			return [];
		}
	}


	async uploadJavaScriptFile(
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
			showTemporaryMessage(`Uploading web resource ${name}`, 3000);
			const existingResource = await this.getWebResource(name, token);

			let webResourceId: string;
			if (existingResource) {
				showTemporaryMessage(`Updating existing web resource: ${name}`, 3000);
				webResourceId = existingResource.webresourceid;
				await this.updateWebResource(webResourceId, base64Content, token);
			} else {
				showTemporaryMessage(`Creating new web resource: ${name}`, 3000);

				await this.createWebResource(name, base64Content, token);

				const existingResource = await this.getWebResource(name, token);
				webResourceId = existingResource.webresourceid;
			}

			// Step 2: Add to Solution
			showTemporaryMessage(`Adding Web Resource to solution: ${solutionName}`, 3000);
			await this.addToSolution(webResourceId, solutionName, token);

			// Step 3: Publish Web Resource
			showTemporaryMessage(`Publishing Web Resource: ${name}`, 3000);
			await this.publishWebResource(webResourceId, token);

			return `Sync of file ${name} completed successfully.`;
		} catch (error) {
			console.log(error);
			return `Error uploading ${name}.`;
		}
	}

	async getSolution(uniqueName: string, token: string): Promise<ISolution | null> {
		//@ts-expect-error cause i said so
		const response = await fetch(`${this.solutionApi}?$filter=uniquename eq '${uniqueName}'`, {
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

	async getWebResource(name: string, token: string): Promise<any | null> {
		//@ts-expect-error cause i said so
		const response = await fetch(`${this.webResourcesApi}?$filter=name eq '${name}'`, {
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

	async createWebResource(name: string, base64Content: string, token: string): Promise<void> {
		const body = {
			name: name,
			displayname: name,
			webresourcetype: 3, // Type 3 = JavaScript
			content: base64Content,
		};

		//@ts-expect-error cause i said so
		const response = await fetch(this.webResourcesApi, {
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
	}

	async updateWebResource(webResourceId: string, base64Content: string, token: string) {
		const body = {
			content: base64Content,
		};

		//@ts-expect-error cause i said so
		const response = await fetch(`${this.webResourcesApi}(${webResourceId})`, {
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

	async addToSolution(webResourceId: string, solutionName: string, token: string) {
		const body = {
			ComponentId: webResourceId,
			ComponentType: 61, // Web Resource
			SolutionUniqueName: solutionName,
			AddRequiredComponents: false,
		};

		//@ts-expect-error cause i said so
		const response = await fetch(this.solutionsApi, {
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

	async publishWebResource(webResourceId: string, token: string) {
		const body = {
			ParameterXml: `<importexportxml><webresources><webresource>${webResourceId}</webresource></webresources></importexportxml>`,
		};

		//@ts-expect-error cause i said so
		const response = await fetch(this.publishApi, {
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

	async getOAuthToken(): Promise<string | null> {
		const cachedToken = await this.loadCachedToken();
		if (cachedToken && cachedToken.expires_at > Date.now() + 60_000) {
			console.log("Using cached token.");
			return cachedToken.access_token;
		}

		console.log("Fetching new token...");
		const tokenUrl = `https://login.microsoftonline.com/${this.config.credential.tenantId}/oauth2/v2.0/token`;
		const params = new URLSearchParams({
			client_id: this.config.credential.clientId,
			client_secret: this.config.credential.clientSecret,
			scope: `${this.config.baseUrl}/.default`,
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

			await this.saveCachedToken(data);

			return data.access_token;
		} catch (error) {
			console.error("Error fetching OAuth token:", error);
			return null;
		}
	}

	async loadCachedToken(): Promise<OAuthTokenResponse | null> {
		const tokenCachePath = await BambooManager.getTokenCacheFilePath();

		try {
			const fileContent = await fs.readFile(tokenCachePath, "utf-8");
			return JSON.parse(fileContent);
		} catch {
			return null;
		}
	}


	async saveCachedToken(token: OAuthTokenResponse): Promise<void> {
		const tokenCachePath = await BambooManager.getTokenCacheFilePath();

		try {
			await fs.writeFile(tokenCachePath, JSON.stringify(token, null, 2), "utf-8");
		} catch (error) {
			console.error("Failed to write token cache:", error);
		}
	}

}