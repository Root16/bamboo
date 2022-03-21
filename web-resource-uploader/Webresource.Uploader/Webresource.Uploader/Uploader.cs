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
        public Uploader(IConfiguration configuration)
        {
            connectionString = configuration["ConnectionString"];
        }
        public void UploadFile()
        {
            var myGuy = new Webresource(@"C:\Users\JohnYenter-Briars\source\repos\vscodeextention-test\WebResources\cref1_opportunity.js");
            var sonnString = "AuthType=OAuth;Url=https://root16dev.crm.dynamics.com;Username=jyenterbriars@root16.com;ClientId={51f81489-12ee-4a9e-aaae-a2591f45987d};LoginPrompt=Auto;RedirectUri=http://localhost;TokenCacheStorePath=./oauth-cache.txt;";

            var service = new ServiceClient(sonnString);

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
