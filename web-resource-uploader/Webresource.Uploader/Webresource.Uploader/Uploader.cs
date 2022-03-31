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
        private string connectionString;
        private bool shouldUpload;
        private string targetSolution;
        private string targetFilePath;
        public Uploader(IConfiguration configuration, CommandLineOptions options)
        {
            connectionString = configuration["ConnectionString"];
            shouldUpload = options.UploadFile;
            targetSolution = options.Solution;
            targetFilePath = options.WebResourceFilePath;
        }
        public void UploadFile()
        {
            var myGuy = new Webresource(@$"{targetFilePath}");

            var service = new ServiceClient(connectionString);

            myGuy.Create(service);

            AddToSolution(new List<Webresource> { myGuy }, "vscodeextentiontest", service);

            Console.WriteLine("Web resource successfully uploaded!");
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
