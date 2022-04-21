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
    //[JsonConverter(typeof(StringEnumConverter))] 
    internal enum ActionName
    {
        //[EnumMember(Value = "create")] 
        Create,
        //[EnumMember(Value = "update")] 
        Update,
        //[EnumMember(Value = "addedToSolution")] 
        AddedToSolution,
        //[EnumMember(Value = "publish")] 
        Publish,
        //[EnumMember(Value = "listWebResourcesInSolution")] 
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
    internal class ListWebResourcesInSolution : Action
    {
        public List<string> WebResources { get; set; }
    }

    internal class WebResoureceSyncerResponse
    {
        public bool DryRun { get; set; }
        public List<Action> ActionList { get; set; } = new List<Action>();
    }
}
