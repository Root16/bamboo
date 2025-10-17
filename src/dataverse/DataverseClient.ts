import * as vscode from 'vscode';
import fs from "fs/promises";
import * as path from "path";
import { BambooManager } from "../classes/syncer/BambooManager";
import { OAuthTokenResponse } from "./IOAuthtokenResponse";
import { IWebResource } from "./IWebResource";
import { ISolution } from "./ISolution";
import { logErrorMessage, logMessage, logMessageWithProgress, logTemporaryMessage, VerboseSetting } from "../log/message";
import { BambooConfig } from "../classes/syncer/BambooConfig";
import { ICustomControl } from "./ICustomControl";
import AdmZip from "adm-zip";
import { parseStringPromise } from "xml2js";
import * as crypto from 'crypto';

export class DataverseClient {
	private webResourcesApi: string;
	private solutionApi: string;
	private addSolutionComponentApi: string;
	private publishApi: string;
	private publishAllApi: string;
	private importSolutionApi: string;
	private pluginPackagesApi: string;
	private pluginPackagesExportKeyApi: string;

	constructor(private config: BambooConfig) {
		this.webResourcesApi = `${this.config.baseUrl}/api/data/v9.2/webresourceset`;
		this.solutionApi = `${this.config.baseUrl}/api/data/v9.2/solutions`;
		this.addSolutionComponentApi = `${this.config.baseUrl}/api/data/v9.2/AddSolutionComponent`;
		this.publishApi = `${this.config.baseUrl}/api/data/v9.2/PublishXml`;
		this.publishAllApi = `${this.config.baseUrl}/api/data/v9.0/PublishAllXml`;
		this.importSolutionApi = `${this.config.baseUrl}/api/data/v9.0/ImportSolution`;
		this.pluginPackagesApi = `${this.config.baseUrl}/api/data/v9.2/pluginpackages`;
		this.pluginPackagesExportKeyApi = `${this.config.baseUrl}/api/data/v9.2/UpdatePluginTypeExportKey`;
	}

	public async syncSolution(solutionName: string, solutionPath: string, token: string): Promise<[boolean, string | null]> {
		try {
			const [uploadSuccess, uploadErrorMessage] = await logMessageWithProgress(`Uploading solution: ${path.basename(solutionPath)}`, () => {
				return this.uploadSolution(solutionPath, token);
			});

			if (!uploadSuccess) [uploadSuccess, uploadErrorMessage];

			logTemporaryMessage(`Uploaded solution successfully: ${path.basename(solutionPath)}`, VerboseSetting.High);

			const publish = vscode.workspace.getConfiguration().get<boolean>(
				"bamboo.customControl.publishAfterSync");

			if (publish) {
				const [publishSuccess, publishErrorMessage] = await logMessageWithProgress(`Publishing all.`, () => {
					return this.publishAllCustomizations(token);
				});

				if (!publishSuccess) [publishSuccess, publishErrorMessage];
				logTemporaryMessage(`Published all successfully.`, VerboseSetting.High);
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
				return [false, `Failed to fetch custom controls: ${response.statusText}`, []];
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

			const existingResource = await logMessageWithProgress(`Uploading web resource ${name}`, () => {
				return this.getWebResource(name, token);
			});

			let webResourceId: string;
			if (existingResource) {
				webResourceId = existingResource.webresourceid;

				const [updateSuccess, updateErrorMessage] = await logMessageWithProgress(`Updating existing web resource: ${name}`, () => {
					return this.updateWebResource(webResourceId, base64Content, token);
				});

				if (!updateSuccess) return [updateSuccess, updateErrorMessage];
			} else {
				const [createSuccess, createErrorMessage] = await logMessageWithProgress(`Creating new web resource: ${name}`, () => {
					return this.createWebResource(name, base64Content, token);
				});

				if (!createSuccess) return [createSuccess, createErrorMessage];

				const existingResource = await this.getWebResource(name, token);
				webResourceId = existingResource.webresourceid;
			}

			const [addSuccess, addErrorMessage] = await logMessageWithProgress(`Adding Web Resource to solution: ${solutionName}`, () => {
				return this.addToSolution(webResourceId, solutionName, token);
			});

			if (!addSuccess) return [addSuccess, addErrorMessage];

			const publish = vscode.workspace.getConfiguration().get<boolean>(
				"bamboo.webResource.publishAfterSync");

			if (publish) {
				const [publishSuccess, publishErrorMessage] = await logMessageWithProgress(`Publishing Web Resource: ${name}`, () => {
					return this.publishWebResource(webResourceId, token);
				});

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
			const data = await response.json();
			console.log(data);
			return [false, `Failed to publish solution: ${response.statusText}`];
		}

		return [true, null];
	}
	private async publishAllCustomizations(token: string): Promise<[boolean, string | null]> {
		//@ts-expect-error cause i said so
		const response = await fetch(this.publishAllApi, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			const data = await response.json();
			console.log(data);
			return [false, `Failed to publish all customizations: ${response.statusText}`];
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

	/**
	 * Registers (create or update) a plugin package in D365.
	 * @param filePath Path to the .nupkg file
	 * @param token OAuth access token
	 * @param solutionUniqueName (Optional) solution to add the package to
	 */
	public async registerPluginPackage(
		filePath: string,
		token: string,
		solutionUniqueName?: string
	): Promise<[boolean, string | null]> {
		try {
			const { id, version } = await this.analyzeNupkg(filePath);
			if (!id || !version) throw new Error("Could not read .nuspec metadata");

			const content = (await fs.readFile(filePath)).toString("base64");
			const name = id;
			const uniquename = id;

			const existing = await this.findPluginPackage('jyb_JYB.Plugins', token);

			if (existing) {
				console.log(`Updating existing plugin package: ${name}`);
				await this.updatePluginPackage(existing.pluginpackageid, content, token);
				await this.refreshAllPluginTypesForPackage(existing.pluginpackageid, token);
			} else {
				return [false, `Package: ${name} is not found. Creating a plugin package is not implemented.`];
			}

			return [true, null];
		} catch (err: any) {
			console.error("Error registering plugin package:", err);
			return [false, err.message];
		}
	}

	private async analyzeNupkg(filePath: string): Promise<{ id: string; version: string }> {
		try {
			await fs.access(filePath);
		} catch {
			throw new Error(`File not found: ${filePath}`);
		}

		const buffer = await fs.readFile(filePath);
		const zip = new AdmZip(buffer);
		const nuspecEntry = zip.getEntries().find(e => e.entryName.endsWith(".nuspec"));
		if (!nuspecEntry) throw new Error("Could not find .nuspec in package");

		const xmlContent = nuspecEntry.getData().toString("utf-8");
		const parsed = await parseStringPromise(xmlContent);
		const metadata = parsed.package?.metadata?.[0];
		const id = metadata?.id?.[0];
		const version = metadata?.version?.[0];

		return { id, version };
	}

	private async findPluginPackage(name: string, token: string): Promise<any | null> {
		const query = `${this.pluginPackagesApi}?$select=pluginpackageid,name&$filter=name eq '${name}'`;
		//@ts-expect-error cause i said so
		const res = await fetch(query, {
			headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
		});
		if (!res.ok) throw new Error(`Failed to query pluginpackage: ${res.statusText}`);
		const data = await res.json();
		return data.value?.[0] ?? null;
	}

	private async updatePluginPackage(id: string, content: string, token: string): Promise<void> {
		//@ts-expect-error cause i said so
		const res = await fetch(`${this.pluginPackagesApi}(${id})`, {
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({ content }),
		});

		if (!res.ok) {
			const err = await res.text();
			logErrorMessage(`Failed to update pluginpackage: ${res.statusText} ${err}`, VerboseSetting.High);
		}
	}

	private async refreshAllPluginTypesForPackage(
		pluginPackageId: string,
		token: string
	): Promise<void> {
		const apiBase = `${this.config.baseUrl}/api/data/v9.0`;

		const fetchXml = `
			<fetch mapping="logical">
				<entity name="plugintype">
					<attribute name="plugintypeid"/>
					<attribute name="name"/>
					<link-entity name="pluginassembly" from="pluginassemblyid" to="pluginassemblyid" alias="pa">
						<filter>
							<condition attribute="packageid" operator="eq" value="${pluginPackageId}"/>
						</filter>
					</link-entity>
				</entity>
			</fetch>
		`;

		const url = `${apiBase}/plugintypes?fetchXml=${encodeURIComponent(fetchXml)}`;

		//@ts-expect-error cause i said so
		const typeRes = await fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
				"OData-Version": "4.0",
				"OData-MaxVersion": "4.0",
			},
		});

		if (!typeRes.ok) {
			const err = await typeRes.text();
			logErrorMessage(`Failed to retrieve plugintypes: ${typeRes.status} ${typeRes.statusText}\n${err}`, VerboseSetting.High);
		}

		const { value: pluginTypes } = await typeRes.json();
		if (!pluginTypes || pluginTypes.length === 0) {
			logErrorMessage("No plugintypes found for this package.", VerboseSetting.High);
			return;
		}

		for (const pluginType of pluginTypes) {
			const refreshUrl = `${apiBase}/plugintypes(${pluginType.plugintypeid})/Microsoft.Dynamics.CRM.UpdatePluginTypeExportKey`;

			//@ts-expect-error cause i said so
			const res = await fetch(refreshUrl, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json; charset=utf-8",
					Accept: "application/json",
					"OData-Version": "4.0",
					"OData-MaxVersion": "4.0",
				},
				body: JSON.stringify({}), // empty body
			});

			if (!res.ok) {
				const errText = await res.text();
				//Even a fail response is a success. Go figure
				logMessage('Even though the .', VerboseSetting.High);
			} else {
				logMessage('Success? This should never hit.', VerboseSetting.High);
			}
		}
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
				logErrorMessage(`Failed to fetch token: ${response.status} - ${response.statusText}`, VerboseSetting.Low);
				return null;
			}

			const data: OAuthTokenResponse = await response.json();

			data.expires_at = Date.now() + data.expires_in * 1000;

			const [saveSuccess, saveError] = await this.saveCachedToken(data);

			if (!saveSuccess) logErrorMessage(saveError!, VerboseSetting.High);

			return data.access_token;
		} catch (error) {
			console.log("Error fetching OAuth token:", error);
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

	private async saveCachedToken(token: OAuthTokenResponse): Promise<[boolean, string | null]> {
		const tokenCachePath = await BambooManager.getTokenCacheFilePath();

		if (tokenCachePath === null) return [false, `Token cache path not found.`];

		try {
			await fs.writeFile(tokenCachePath, JSON.stringify(token, null, 2), "utf-8");
			return [true, null];
		} catch (error) {
			console.log(error);
			return [false, `Failed to write token cache: ${error}`];
		}
	}
}