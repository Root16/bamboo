#nullable enable
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Extensions.Configuration;
using Microsoft.PowerPlatform.Dataverse.Client;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Collections.Generic;
using System.Threading.Tasks;
using Webresource.Syncer.Models;
using System.IO;
using System;

namespace Webresource.Syncer.SyncLogic
{
    class Publisher
    {
        private readonly ServiceClient ServiceClient;
        private readonly FileInfo File;
        private readonly string FilePathInPowerApps;
        private readonly JsonSerializerSettings JsonSerializerSettings = new()
        {
            ContractResolver = new DefaultContractResolver
            {
                NamingStrategy = new CamelCaseNamingStrategy(),
            },
        };

        public Publisher(IConfiguration configuration, FileInfo file, string filePathInPowerApps, string? connectionString)
        {
            ServiceClient = string.IsNullOrEmpty(connectionString) ?
                                new ServiceClient(configuration["ConnectionString"]) :
                                new ServiceClient(connectionString);
            File = file;
            FilePathInPowerApps = filePathInPowerApps;
        }
        public async Task<string> PublishFileAsync()
        {
            var wr = new Models.WebResource(File.FullName, FilePathInPowerApps);
            var listOfWebResources = new List<Models.WebResource> { wr };

            try
            {
                await Publish(listOfWebResources, ServiceClient);
                return JsonConvert.SerializeObject(
                    new WebResoureceSyncerResponse
                    {
                        Action =
                        new WebResouceUploadAction
                        {
                            WebResourceName = wr.Name,
                            ActionName = ActionName.Publish,
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
                        new WebResoucePublishAction
                        {
                            WebResourceName = wr.Name,
                            Successful = false,
                            ErrorMessage = ex.Message,
                        }
                    }
                    , JsonSerializerSettings);
            }
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
    }
}
