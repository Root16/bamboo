using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System.Collections.Generic;

namespace WebResource.Syncer.Models
{
    internal enum ActionName
    {
        Create,
        Update,
        Publish,
        ListWebResourcesInSolution,
        AuthenticationTest,
    }
    class Action
    {
        [JsonConverter(typeof(StringEnumConverter))]
        public ActionName ActionName { get; set; }
        public bool Successful { get; set; }
        public string ErrorMessage { get; set; }
    }
    internal class WebResoucePublishAction : Action
    {
        public string WebResourceName { get; set; }
    }
    internal class WebResouceUploadAction : Action
    {
        public string WebResourceName { get; set; }
    }
    internal class ListWebResourcesInSolutionAction : Action
    {
        public List<WebResource> WebResources { get; set; }
    }
    internal class AuthenticationTestAction : Action
    {
    }

    internal class WebResoureceSyncerResponse
    {
        public Action Action { get; set; }
    }
}
