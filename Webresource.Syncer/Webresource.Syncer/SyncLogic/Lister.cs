﻿using Microsoft.Extensions.Configuration;
using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Organization;
using Microsoft.Xrm.Sdk.Query;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WebResource.Syncer.Models;

namespace WebResource.Syncer.SyncLogic
{
    internal class Lister
    {
        private readonly CommandLineOptions CommandLineOptions;
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


        public Lister(IConfiguration configuration,
                        CommandLineOptions options)
        {
            CommandLineOptions = options;
            ServiceClient = string.IsNullOrEmpty(CommandLineOptions.ConnectionString) ?
                                new ServiceClient(configuration["ConnectionString"]) :
                                new ServiceClient(options.ConnectionString);
        }

        public async Task ListFilesInSolutionAsync()
        {
            var responseObject = new WebResoureceSyncerResponse();

            var targetSolution = await RetreiveSolution(CommandLineOptions.Solution);

            var resources = await RetrieveWebresourcesAsync(ServiceClient, targetSolution.Id, new List<int>(), filterByLcid: false);

            responseObject.ActionList.Add(new ListWebResourcesInSolutionAction
            {
                ActionName = ActionName.ListWebResourcesInSolution,
                WebResources = resources.ToList(),
                Successful = true,
            });

            var s = JsonConvert.SerializeObject(responseObject, JsonSerializerSettings);

            Console.WriteLine(s);
        }
        public async Task<Entity> RetreiveSolution(string solutionName)
        {

            QueryExpression querySampleSolution = new QueryExpression
            {
                EntityName = "solution",
                ColumnSet = new ColumnSet(new string[] { "publisherid", "installedon", "version", "versionnumber", "friendlyname" }),
                Criteria = new FilterExpression()
            };

            querySampleSolution.Criteria.AddCondition("uniquename", ConditionOperator.Equal, solutionName);

            return (await ServiceClient.RetrieveMultipleAsync(querySampleSolution)).Entities.FirstOrDefault();
        }
        public static async Task<IEnumerable<Models.WebResource>> RetrieveWebresourcesAsync(ServiceClient service, Guid solutionId, List<int> types, bool filterByLcid = false, params int[] lcids)
        {
            try
            {
                var qba = new QueryByAttribute("solutioncomponent") { ColumnSet = new ColumnSet("objectid") };
                qba.Attributes.AddRange("solutionid", "componenttype");
                qba.Values.AddRange(solutionId, 61);

                var components = service.RetrieveMultiple(qba).Entities;

                var list =
                    components.Select(component => component.GetAttributeValue<Guid>("objectid").ToString("B"))
                        .ToList();

                if (list.Count > 0)
                {
                    var qe = new QueryExpression("webresource")
                    {
                        ColumnSet = new ColumnSet(
            "languagecode", "createdon", "name", "dependencyxml", "modifiedby",
            "webresourcetype", "displayname", "modifiedon", "createdby",
            "webresourceid", "description", "content"),
                        Criteria = new FilterExpression
                        {
                            Filters =
                            {
                                new FilterExpression
                                {
                                    FilterOperator = LogicalOperator.And,
                                    Conditions =
                                    {
                                        new ConditionExpression("ishidden", ConditionOperator.Equal, false),
                                        new ConditionExpression("webresourceid", ConditionOperator.In, list.ToArray()),
                                    }
                                },
                                new FilterExpression
                                {
                                    FilterOperator = LogicalOperator.Or,
                                     Conditions =
                                    {
                                        new ConditionExpression("ismanaged", ConditionOperator.Equal, false),
                                        new ConditionExpression("iscustomizable", ConditionOperator.Equal, true),
                                    }
                                }
                            }
                        },
                        Orders = { new OrderExpression("name", OrderType.Ascending) }
                    };

                    if (types.Count != 0)
                    {
                        qe.Criteria.Filters.First().Conditions.Add(new ConditionExpression("webresourcetype", ConditionOperator.In, types.ToArray()));
                    }

                    if (filterByLcid && lcids.Length != 0)
                    {
                        var lcidFilter = qe.Criteria.Filters.First().AddFilter(LogicalOperator.Or);
                        lcidFilter.AddCondition("languagecode", ConditionOperator.In, lcids.Select(l => (object)l).ToArray());
                        lcidFilter.AddCondition("languagecode", ConditionOperator.Null);
                    }

                    return (await service.RetrieveMultipleAsync(qe)).Entities.Select(e => new Models.WebResource(e));
                }

                return new List<Models.WebResource>();
            }
            catch (Exception error)
            {
                throw new Exception($"An exception occured while retrieving webresources: {error.Message}");
            }
        }

    }
}