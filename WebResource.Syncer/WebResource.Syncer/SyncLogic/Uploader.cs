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
        private readonly string FilePathInPowerApps;
        private readonly JsonSerializerSettings JsonSerializerSettings = new()
        {
            ContractResolver = new DefaultContractResolver
            {
                NamingStrategy = new CamelCaseNamingStrategy(),
            },
        };

        public Uploader(IConfiguration configuration, FileInfo file, string filePathInPowerApps, string solutionName, bool updateIfExists, string? connectionString)
        {
            ServiceClient = string.IsNullOrEmpty(connectionString) ?
                                new ServiceClient(configuration["ConnectionString"]) :
                                new ServiceClient(connectionString);
            UpdateIfExists = updateIfExists;
            SolutionName = solutionName;
            File = file;
            FilePathInPowerApps = filePathInPowerApps;
        }
        public async Task<string> UploadFileAsync()
        {
            var wr = new Models.WebResource(File.FullName, FilePathInPowerApps);
            var listOfWebResources = new List<Models.WebResource> { wr };

            try
            {
                ActionName action;
                if (UpdateIfExists)
                {
                    action = ActionName.Update;
                    await wr.CreateOrUpdate(ServiceClient, SolutionName);
                }
                else
                {
                    action = ActionName.Create;
                    await wr.Create(ServiceClient, SolutionName);
                }

                await AddToSolution(listOfWebResources, SolutionName, ServiceClient);

                return JsonConvert.SerializeObject(
                    new WebResoureceSyncerResponse
                    {
                        Action =
                        new WebResouceUploadAction
                        {
                            WebResourceName = wr.Name,
                            ActionName = action,
                            Successful = true,
                        }
                    }
                    , JsonSerializerSettings);

            }
            catch (Exception ex)
            {
                return JsonConvert.SerializeObject(
                    new WebResoureceSyncerResponse
                    {
                        Action =
                        new WebResouceUploadAction
                        {
                            WebResourceName = wr.Name,
                            Successful = false,
                            ErrorMessage = ex.Message,
                        }
                    }
                    , JsonSerializerSettings);
            }
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
