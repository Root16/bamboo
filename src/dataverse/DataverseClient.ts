import * as vscode from 'vscode';
import fs from "fs/promises";
import * as path from "path";
import { BambooManager } from "../classes/syncer/BambooManager";
import jwt from "jsonwebtoken";
import { OAuthTokenResponse } from "./IOAuthtokenResponse";
import { IWebResource } from "./IWebResource";
import { ISolution } from "./ISolution";
import { showErrorMessage, showMessage, showMessageWithProgress, showTemporaryMessage } from "../log/message";
import { BambooConfig } from "../classes/syncer/BambooConfig";
import { ICustomControl } from "./ICustomControl";
import * as crypto from 'crypto';

export class DataverseClient {
	private webResourcesApi: string;
	private solutionApi: string;
	private addSolutionComponentApi: string;
	private publishApi: string;
	private importSolutionApi: string;

	constructor(private config: BambooConfig) {
		this.webResourcesApi = `${this.config.baseUrl}/api/data/v9.2/webresourceset`;
		this.solutionApi = `${this.config.baseUrl}/api/data/v9.2/solutions`;
		this.addSolutionComponentApi = `${this.config.baseUrl}/api/data/v9.2/AddSolutionComponent`;
		this.publishApi = `${this.config.baseUrl}/api/data/v9.2/PublishXml`;
		this.importSolutionApi = `${this.config.baseUrl}/api/data/v9.0/ImportSolution`;
	}

	public async syncSolution(solutionName: string, solutionPath: string, token: string): Promise<[boolean, string | null]> {
		try {
			showTemporaryMessage(`Uploading solution: ${path.basename(solutionPath)}`, 3000);
			const [uploadSuccess, uploadErrorMessage] = await this.uploadSolution(solutionPath, token);

			if (!uploadSuccess) [uploadSuccess, uploadErrorMessage];
			showTemporaryMessage(`Uploaded solution successfully: ${path.basename(solutionPath)}`);

			const publish = vscode.workspace.getConfiguration().get<boolean>(
				"bamboo.customControl.publishAfterSync");

			if (publish) {
				showTemporaryMessage(`Publishing solution: ${path.basename(solutionPath)}`, 3000);
				const [publishSuccess, publishErrorMessage] = await this.publishSolution(solutionName, token);

				if (!publishSuccess) [publishSuccess, publishErrorMessage];
				showTemporaryMessage(`Published solution successfully: ${path.basename(solutionPath)}`);
			}

			return [true, null];
		} catch (error) {
			return [false, `Unable to upload solution: ${solutionName}`];
		}
	}

	public async listWebResourcesInSolution(
		solutionUniqueName: string,
		token: string
	): Promise<[boolean, string | null, IWebResource[]]> {
		const solution = await this.getSolution(solutionUniqueName, token);

		if (solution === null) {
			return [false, `Can't find solution with name: ${solutionUniqueName}`, []];
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
				const data = await response.json();
				console.log(data);
				return [false, `Failed to fetch web resources: ${response.statusText}`, []]
			}

			const data = await response.json();

			const mapped = data.value.map((item: any) => {
				const wr: IWebResource = {
					id: item["webresource.webresourceid"],
					name: item["webresource.name"],
				};

				return wr;
			});

			return [true, null, mapped];
		} catch (error) {
			return [false, `Error fetching web resources:, ${error}`, []]
		}
	}

	public async listCustomControlsInSolution(
		solutionUniqueName: string,
		token: string
	): Promise<[boolean, string | null, ICustomControl[]]> {
		const solution = await this.getSolution(solutionUniqueName, token);

		if (solution === null) {
			return [false, `Can't find solution with name: ${solutionUniqueName}`, []];
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
				return [false, `Failed to fetch custom controls: ${response.statusText}`];
			}

			const data = await response.json();

			const mapped = data.value.map((item: any) => {
				const cc: ICustomControl = {
					id: item["customcontrol.customcontrolid"],
					name: item["customcontrol.name"],
				};

				return cc;
			});

			return [true, null, mapped];
		} catch (error) {
			return [false, `Error fetching custom controls:, ${error}`, []]
		}
	}

	public async uploadJavaScriptFile(
		filePath: string,
		name: string,
		solutionName: string,
		token: string
	): Promise<[boolean, string | null]> {
		try {
			const normalizedPath = path.normalize(filePath);
			const content = await fs.readFile(normalizedPath, "utf-8");
			const base64Content = Buffer.from(content).toString("base64");

			showTemporaryMessage(`Uploading web resource ${name}`, 3000);
			const existingResource = await this.getWebResource(name, token);

			let webResourceId: string;
			if (existingResource) {
				showTemporaryMessage(`Updating existing web resource: ${name}`, 3000);
				webResourceId = existingResource.webresourceid;
				const [updateSuccess, updateErrorMessage] = await this.updateWebResource(webResourceId, base64Content, token);
				if (!updateSuccess) return [updateSuccess, updateErrorMessage];
			} else {
				showTemporaryMessage(`Creating new web resource: ${name}`, 3000);

				const [createSuccess, createErrorMessage] = await this.createWebResource(name, base64Content, token);

				if (!createSuccess) return [createSuccess, createErrorMessage];

				const existingResource = await this.getWebResource(name, token);
				webResourceId = existingResource.webresourceid;
			}

			showTemporaryMessage(`Adding Web Resource to solution: ${solutionName}`, 3000);
			const [addSuccess, addErrorMessage] = await this.addToSolution(webResourceId, solutionName, token);
			if (!addSuccess) return [addSuccess, addErrorMessage];

			const publish = vscode.workspace.getConfiguration().get<boolean>(
				"bamboo.webResource.publishAfterSync");

			if (publish) {
				showTemporaryMessage(`Publishing Web Resource: ${name}`, 3000);
				const [publishSuccess, publishErrorMessage] = await this.publishWebResource(webResourceId, token);
				if (!publishSuccess) return [publishSuccess, publishErrorMessage];
			}

			return [true, null];
		} catch (error) {
			console.log(error);
			return [false, `Error uploading ${name}.`];
		}
	}

	private async uploadSolution(solutionPath: string, token: string): Promise<[boolean, string | null]> {
		const fileBuffer = await fs.readFile(solutionPath);
		const base64Content = fileBuffer.toString('base64');
		const importJobId = crypto.randomUUID();

		const body = {
			ImportJobId: importJobId,
			OverwriteUnmanagedCustomizations: true,
			PublishWorkflows: true,
			CustomizationFile: base64Content,
		};

		//@ts-expect-error cause i said so
		const response = await fetch(this.importSolutionApi, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const body = await response.json();
			console.log(body);
			return [false, `Failed to upload solution: ${response.statusText}`];
		}

		return [true, null]
	}

	private async publishSolution(solutionName: string, token: string): Promise<[boolean, string | null]> {
		const body = {
			ParameterXml: `<importexportxml><solutions><solution>${solutionName}</solution></solutions></importexportxml>`,
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
			const data = response.json();
			console.log(data);
			return [false, `Failed to publish solution: ${response.statusText}`];
		}

		return [true, null];
	}

	private async getSolution(uniqueName: string, token: string): Promise<ISolution | null> {
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

	private async getWebResource(name: string, token: string): Promise<any | null> {
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

	private async createWebResource(name: string, base64Content: string, token: string): Promise<[boolean, string | null]> {
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
			const data = await response.json();
			console.log(data);
			return [false, `Failed to create Web Resource: ${response.statusText}`];
		}

		return [true, null];
	}

	private async updateWebResource(webResourceId: string, base64Content: string, token: string): Promise<[boolean, string | null]> {
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
			const data = await response.json();
			console.log(data);
			return [false, `Failed to update Web Resource: ${response.statusText}`];
		}

		return [true, null];
	}

	private async addToSolution(webResourceId: string, solutionName: string, token: string): Promise<[boolean, string | null]> {
		const body = {
			ComponentId: webResourceId,
			ComponentType: 61, // Web Resource
			SolutionUniqueName: solutionName,
			AddRequiredComponents: false,
		};

		//@ts-expect-error cause i said so
		const response = await fetch(this.addSolutionComponentApi, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const data = await response.json();
			console.log(data);
			return [false, `Failed to add Web Resource to solution: ${response.statusText}`];
		}

		return [true, null];
	}

	private async publishWebResource(webResourceId: string, token: string): Promise<[boolean, string | null]> {
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
			const data = await response.json();
			console.log(data);
			return [false, `Failed to publish Web Resource: ${response.statusText}`];
		}

		return [true, null];
	}

	public async getOAuthToken(): Promise<string | null> {
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
				showErrorMessage(`Failed to fetch token: ${response.status} - ${response.statusText}`);
				return null;
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

	private async loadCachedToken(): Promise<OAuthTokenResponse | null> {
		const tokenCachePath = await BambooManager.getTokenCacheFilePath();

		if (tokenCachePath === null) return null;

		try {
			const fileContent = await fs.readFile(tokenCachePath, "utf-8");
			return JSON.parse(fileContent);
		} catch {
			return null;
		}
	}

	private async saveCachedToken(token: OAuthTokenResponse): Promise<void> {
		const tokenCachePath = await BambooManager.getTokenCacheFilePath();

		try {
			await fs.writeFile(tokenCachePath, JSON.stringify(token, null, 2), "utf-8");
		} catch (error) {
			console.error("Failed to write token cache:", error);
		}
	}
}