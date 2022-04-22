using System;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebResource.Syncer.Interface;
using WebResource.Syncer.Models;

namespace WebResource.Syncer.SyncLogic
{
    class Uploader : IUploader
    {
        private readonly CommandLineOptions CommandLineOptions;
        private readonly ServiceClient ServiceClient;
        private readonly JsonSerializerSettings JsonSerializerSettings = new()
        {
            ContractResolver = new DefaultContractResolver
            {
                NamingStrategy = new CamelCaseNamingStrategy(),
            },
        };

        public Uploader(IConfiguration configuration,
                        CommandLineOptions options)
        {
            CommandLineOptions = options;
            ServiceClient = string.IsNullOrEmpty(CommandLineOptions.ConnectionString) ?
                                new ServiceClient(configuration["ConnectionString"]) :
                                new ServiceClient(options.ConnectionString);
        }
        public async Task UploadFileAsync()
        {
            var responseObject = new WebResoureceSyncerResponse();
            if (CommandLineOptions.DryRun)
            {
                responseObject.DryRun = true;
            }
            else
            {
                var wr = new Models.WebResource(@$"{CommandLineOptions.WebResourceFilePath}");

                var listOfWebResources = new List<Models.WebResource> { wr };

                if (CommandLineOptions.UpdateIfExists)
                {
                    await wr.CreateOrUpdate(ServiceClient);
                    responseObject.ActionList.Add(new WebResouceUploadAction
                    {
                        WebResourceName = wr.Name,
                        ActionName = ActionName.Update,
                        Successful = true,
                    });
                }
                else
                {
                    await wr.Create(ServiceClient);
                    responseObject.ActionList.Add(new WebResouceUploadAction
                    {
                        WebResourceName = wr.Name,
                        ActionName = ActionName.Create,
                        Successful = true,
                    });
                }

                await AddToSolution(listOfWebResources, CommandLineOptions.Solution, ServiceClient);
                responseObject.ActionList.Add(new WebResouceUploadAction
                {
                    WebResourceName = wr.Name,
                    ActionName = ActionName.AddedToSolution,
                    Successful = true,
                });

                if (CommandLineOptions.PublishFile)
                {
                    await Publish(listOfWebResources, ServiceClient);
                    responseObject.ActionList.Add(new WebResouceUploadAction
                    {
                        WebResourceName = wr.Name,
                        ActionName = ActionName.Publish,
                        Successful = true,
                    });
                }
            }

            var s = JsonConvert.SerializeObject(responseObject, JsonSerializerSettings);

            Console.WriteLine(s);
        }
        private static async Task Publish(List<Models.WebResource> webresources, ServiceClient service)
        {
            string idsXml = string.Empty;

            foreach (Models.WebResource webresource in webresources)
            {
                idsXml += $"<webresource>{webresource.Id:B}</webresource>";
            }

            var pxReq1 = new PublishXmlRequest
            {
                ParameterXml = $"<importexportxml><webresources>{idsXml}</webresources></importexportxml>"
            };

            await service.ExecuteAsync(pxReq1);
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
