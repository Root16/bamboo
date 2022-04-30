using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text;
using System.Threading.Tasks;

namespace WebResource.Syncer.Models
{
    internal enum ActionName
    {
        Create,
        Update,
        AddedToSolution,
        Publish,
        ListWebResourcesInSolution,
    }
    class Action
    {
        [JsonConverter(typeof(StringEnumConverter))]
        public ActionName ActionName { get; set; }
        public bool Successful { get; set; }
        public string ErrorMessage { get; set; }
    }

    internal class WebResouceUploadAction : Action
    {
        public string WebResourceName { get; set; }
    }
    internal class ListWebResourcesInSolutionAction : Action
    {
        public List<WebResource> WebResources { get; set; }
    }

    internal class WebResoureceSyncerResponse
    {
        public bool DryRun { get; set; }
        public List<Action> ActionList { get; set; } = new List<Action>();
    }
}
