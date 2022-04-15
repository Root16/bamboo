using Microsoft.Crm.Sdk.Messages;
using Microsoft.Extensions.Configuration;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Webresource.Uploader.Interface;

namespace Webresource.Uploader
{
    class Uploader : IUploader
    {
        private readonly CommandLineOptions CommandLineOptions;
        private readonly ServiceClient ServiceClient;
        public Uploader(IConfiguration configuration, CommandLineOptions options)
        {
            CommandLineOptions = options;
            ServiceClient = string.IsNullOrEmpty(CommandLineOptions.ConnectionString) ?
                                new ServiceClient(configuration["ConnectionString"]) :
                                new ServiceClient(options.ConnectionString);
            Console.WriteLine("Authenticated to Power Platform!");
        }
        public void UploadFile()
        {
            var myGuy = new Webresource(@$"{CommandLineOptions.WebResourceFilePath}");

            var listOfWebResources = new List<Webresource> { myGuy };

            if (CommandLineOptions.UpdateIfExists)
            {
                myGuy.CreateOrUpdate(ServiceClient);
            }
            else
            {
                myGuy.Create(ServiceClient);
            }

            AddToSolution(listOfWebResources, CommandLineOptions.Solution, ServiceClient);

            if (CommandLineOptions.PublishFile)
            {
                Publish(listOfWebResources, ServiceClient);
            }
        }
        public static void Publish(List<Webresource> webresources, IOrganizationService service)
        {
            string idsXml = string.Empty;

            foreach (Webresource webresource in webresources)
            {
                idsXml += $"<webresource>{webresource.Id:B}</webresource>";
            }

            var pxReq1 = new PublishXmlRequest
            {
                ParameterXml = $"<importexportxml><webresources>{idsXml}</webresources></importexportxml>"
            };

            service.Execute(pxReq1);
            Console.WriteLine("Successfully published!");
        }

        public static void AddToSolution(List<Webresource> resources, string solutionUniqueName, IOrganizationService service)
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
                    ComponentType = 61, // Webresource
                    SolutionUniqueName = solutionUniqueName
                });
            }

            if (bulkRequest.Requests.Count == 1)
            {
                service.Execute(bulkRequest.Requests.First());
            }
            else
            {
                service.Execute(bulkRequest);
            }
            Console.WriteLine("Web resource successfully added to solution!");
        }
    }
}
