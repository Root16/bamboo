#nullable enable
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Extensions.Configuration;
using Microsoft.PowerPlatform.Dataverse.Client;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Collections.Generic;
using System.Threading.Tasks;
using WebResource.Syncer.Models;
using System.IO;

namespace WebResource.Syncer.SyncLogic
{
    class Publisher
    {
        private readonly ServiceClient ServiceClient;
        private readonly FileInfo File;
        private readonly JsonSerializerSettings JsonSerializerSettings = new()
        {
            ContractResolver = new DefaultContractResolver
            {
                NamingStrategy = new CamelCaseNamingStrategy(),
            },
        };

        public Publisher(IConfiguration configuration, FileInfo file, string? connectionString)
        {
            ServiceClient = string.IsNullOrEmpty(connectionString) ?
                                new ServiceClient(configuration["ConnectionString"]) :
                                new ServiceClient(connectionString);
            File = file;
        }
        public async Task<string> PublishFileAsync()
        {
            var responseObject = new WebResoureceSyncerResponse();
            var wr = new Models.WebResource(@$"{File.FullName}");

            var listOfWebResources = new List<Models.WebResource> { wr };

            await Publish(listOfWebResources, ServiceClient);
            responseObject.ActionList.Add(new WebResouceUploadAction
            {
                WebResourceName = wr.Name,
                ActionName = ActionName.Publish,
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
    }
}
