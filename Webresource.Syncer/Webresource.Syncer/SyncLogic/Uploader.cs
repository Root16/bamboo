#nullable enable
using System;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Extensions.Configuration;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebResource.Syncer.Models;
using System.IO;

namespace WebResource.Syncer.SyncLogic
{
    class Uploader
    {
        private readonly ServiceClient ServiceClient;
        private readonly bool UpdateIfExists;
        private readonly string SolutionName;
        private readonly FileInfo File;
        private readonly JsonSerializerSettings JsonSerializerSettings = new()
        {
            ContractResolver = new DefaultContractResolver
            {
                NamingStrategy = new CamelCaseNamingStrategy(),
            },
        };

        public Uploader(IConfiguration configuration, FileInfo file, string solutionName, bool updateIfExists, string? connectionString)
        {
            ServiceClient = string.IsNullOrEmpty(connectionString) ?
                                new ServiceClient(configuration["ConnectionString"]) :
                                new ServiceClient(connectionString);
            UpdateIfExists = updateIfExists;
            SolutionName = solutionName;
            File = file;
        }
        public async Task<string> UploadFileAsync()
        {
            var responseObject = new WebResoureceSyncerResponse();
            var wr = new Models.WebResource(@$"{File.FullName}");

            var listOfWebResources = new List<Models.WebResource> { wr };

            if (UpdateIfExists)
            {
                await wr.CreateOrUpdate(ServiceClient, SolutionName);
                responseObject.ActionList.Add(new WebResouceUploadAction
                {
                    WebResourceName = wr.Name,
                    ActionName = ActionName.Update,
                    Successful = true,
                });
            }
            else
            {
                await wr.Create(ServiceClient, SolutionName);
                responseObject.ActionList.Add(new WebResouceUploadAction
                {
                    WebResourceName = wr.Name,
                    ActionName = ActionName.Create,
                    Successful = true,
                });
            }

            await AddToSolution(listOfWebResources, SolutionName, ServiceClient);
            responseObject.ActionList.Add(new WebResouceUploadAction
            {
                WebResourceName = wr.Name,
                ActionName = ActionName.AddedToSolution,
                Successful = true,
            });

            return JsonConvert.SerializeObject(responseObject, JsonSerializerSettings);
        }
        private static async Task Publish(List<Models.WebResource> webresources, ServiceClient service)
        {
            string idsAsXML = string.Empty;

            foreach (Models.WebResource webresource in webresources)
            {
                idsAsXML += $"<webresource>{webresource.Id:B}</webresource>";
            }

            var publishRequest = new PublishXmlRequest
            {
                ParameterXml = $"<importexportxml><webresources>{idsAsXML}</webresources></importexportxml>"
            };

            await service.ExecuteAsync(publishRequest);
        }

        private static async Task AddToSolution(List<Models.WebResource> resources, string solutionUniqueName, ServiceClient service)
        {
            var bulkRequest = new ExecuteMultipleRequest
            {
                Settings = new ExecuteMultipleSettings
                {
                    ContinueOnError = true,
                    ReturnResponses = false
                },
                Requests = new OrganizationRequestCollection()
            };

            foreach (var resource in resources)
            {
                bulkRequest.Requests.Add(new AddSolutionComponentRequest
                {
                    AddRequiredComponents = false,
                    ComponentId = resource.Id,
                    ComponentType = 61, // WebResource
                    SolutionUniqueName = solutionUniqueName
                });
            }

            if (bulkRequest.Requests.Count == 1)
            {
                await service.ExecuteAsync(bulkRequest.Requests.First());
            }
            else
            {
                await service.ExecuteAsync(bulkRequest);
            }
        }
    }
}
