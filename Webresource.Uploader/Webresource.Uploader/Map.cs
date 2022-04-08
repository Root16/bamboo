using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Query;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Webresource.Uploader.Enum;

namespace Webresource.Uploader
{
    class Map
    {
        public Map(string extension, WebresourceType type, int crmValue, string label)
        {
            Extension = extension;
            Type = type;
            CrmValue = crmValue;
            Label = label;
        }

        public string Extension { get; }
        public WebresourceType Type { get; }
        public int CrmValue { get; }
        public string Label { get; }
    }

}

