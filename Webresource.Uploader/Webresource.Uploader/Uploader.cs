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
        private CommandLineOptions _commandLineOptions;
        public Uploader(IConfiguration configuration, CommandLineOptions options)
        {
            _commandLineOptions = options;
        }
        public void UploadFile()
        {
            var myGuy = new Webresource(@$"{_commandLineOptions.WebResourceFilePath}");

            var service = new ServiceClient(_commandLineOptions.ConnectionString);

            myGuy.Create(service);

            AddToSolution(new List<Webresource> { myGuy }, _commandLineOptions.Solution, service);

            Console.WriteLine("Web resource successfully uploaded!");

            if (_commandLineOptions.PublishFile)
            {
                Console.WriteLine("Need to publich file");
            }
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
        }
    }
}
