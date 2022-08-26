#nullable enable
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Extensions.Configuration;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using WebResource.Syncer.Models;

namespace WebResource.Syncer.SyncLogic
{
    internal class AuthenticationTester
    {
        private readonly ServiceClient ServiceClient;
        private readonly JsonSerializerSettings JsonSerializerSettings = new()
        {
            ContractResolver = new IgnorePropertiesResolver(new[] { "stringContent", "state" })
            {
                NamingStrategy = new CamelCaseNamingStrategy
                {
                    ProcessDictionaryKeys = true,
                    OverrideSpecifiedNames = true
                }
            }
        };


        public AuthenticationTester(IConfiguration configuration, string connectionString)
        {
            connectionString = connectionString.Replace("'", "");
            ServiceClient = string.IsNullOrEmpty(connectionString) ?
                                new ServiceClient(configuration["ConnectionString"]) :
                                new ServiceClient(connectionString);
        }

        public async Task<string> Authenticate()
        {
            try
            {
                var whoAmIResponse = await ServiceClient.ExecuteAsync(new WhoAmIRequest());

                return JsonConvert.SerializeObject(
                    new WebResoureceSyncerResponse
                    {
                        Action =
                        new AuthenticationTestAction
                        {
                            ActionName = ActionName.AuthenticationTest,
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
                        new AuthenticationTestAction
                        {
                            Successful = false,
                            ErrorMessage = ex.Message,
                        }
                    }
                    , JsonSerializerSettings);
            }
        }
    }
}
