using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using WebResource.Syncer.Enum;
using WebResource.Syncer.Helper;

namespace WebResource.Syncer.Models
{
    public class WebResource
    {
        public static readonly ColumnSet Columns = new ColumnSet(
            "languagecode", "createdon", "name", "dependencyxml", "modifiedby",
            "webresourcetype", "displayname", "modifiedon", "createdby",
            "webresourceid", "description", "content");
        private Entity record;
        public string StringContent { get; private set; }
        public string Name
        {
            get => record?.GetAttributeValue<string>("name");
            set
            {
                record["name"] = value;
                State = WebResourceState.Saved;
            }
        }

        public Guid Id => record?.Id ?? Guid.Empty;
        /// <summary>
        /// Represents the PATH of the WebResource in PowerApps. For example: /one/two/test.js
        /// </summary>
        private string filePath;
        public WebResourceState State;
        public WebResource(Entity record)
        {
            this.record = record;
            StringContent = GetPlainText();

            State = WebResourceState.None;
        }

        public WebResource(string filePath, string fileName)
        {
            var fi = new FileInfo(filePath);

            record = new Entity("webresource")
            {
                ["webresourcetype"] = new OptionSetValue((int)GetTypeFromExtension(fi.Extension.Remove(0, 1))),
                ["content"] = Convert.ToBase64String(File.ReadAllBytes(filePath))
            };

            StringContent = GetPlainText();

            var map = WebResourceMapper.Instance.Items.FirstOrDefault(i => i.Extension.ToLower() == Path.GetExtension(filePath).ToLower().Remove(0, 1));
            if (map != null)
            {
                record.FormattedValues["webresourcetype"] = map.Label;
            }

            State = WebResourceState.None;
            this.filePath = fileName;
        }

        public async Task Create(ServiceClient service, string solutionUniqueName, string webResourceName = null)
        {
            if (string.IsNullOrEmpty(solutionUniqueName)) throw new ArgumentNullException(nameof(solutionUniqueName));

            if (webResourceName == null)
            {
                var prefix = await GetSolutionPublisherPrefixAsync(service, solutionUniqueName);
                webResourceName = $"{prefix}_/{filePath}";
            }

            webResourceName = webResourceName.Replace("//", "/");

            record["name"] = webResourceName;
            record["displayname"] = webResourceName;
            record.Id = await service.CreateAsync(record);

            State = WebResourceState.None;
        }

        public static WebResourceType GetTypeFromExtension(string extension)
        {
            switch (extension.ToLower())
            {
                case "html":
                case "htm":
                    return WebResourceType.WebPage;

                case "css":
                    return WebResourceType.Css;

                case "js":
                    return WebResourceType.Script;

                case "json":
                case "xml":
                    return WebResourceType.Data;

                case "png":
                    return WebResourceType.Png;

                case "jpg":
                case "jpeg":
                    return WebResourceType.Jpg;

                case "gif":
                    return WebResourceType.Gif;

                case "xap":
                    return WebResourceType.Silverlight;

                case "xsl":
                case "xslt":
                    return WebResourceType.Xsl;

                case "ico":
                    return WebResourceType.Ico;

                case "svg":
                    return WebResourceType.Vector;

                case "resx":
                    return WebResourceType.Resx;
            }

            throw new Exception($@"File extension '{extension}' cannot be mapped to a webresource type!");
        }
        public async Task CreateOrUpdate(ServiceClient service, string solutionUniqueName, bool resync = true)
        {
            if (string.IsNullOrEmpty(solutionUniqueName)) throw new ArgumentNullException(nameof(solutionUniqueName));

            var prefix = await GetSolutionPublisherPrefixAsync(service, solutionUniqueName);
            var name = $"{prefix}_/{filePath}";

            name = name.Replace("//", "/");

            var remoteRecord = await RetreiveWebResource(name, service);
            if (remoteRecord == null)
            {
                await Create(service, solutionUniqueName, name);
                return;
            }
            else
            {
                record.Id = remoteRecord.Id;
                if (resync)
                {
                    await service.UpdateAsync(record);
                }
            }

            State = WebResourceState.None;
        }
        public async Task<Entity> RetreiveWebResource(string name, ServiceClient service)
        {
            try
            {
                var qba = new QueryByAttribute("webresource");
                qba.Attributes.Add("name");
                qba.Values.Add(name);
                qba.ColumnSet = WebResource.Columns;

                EntityCollection collection = await service.RetrieveMultipleAsync(qba);

                if (collection.Entities.Count > 1)
                {
                    throw new Exception($"there are more than one web resource with name '{name}'");
                }

                return collection.Entities.FirstOrDefault();
            }
            catch (Exception error)
            {
                throw new Exception($"An error occured while retrieving a webresource with name {name}: {error.Message}");
            }
        }


        public string GetPlainText()
        {
            if (!record.Contains("content"))
            {
                return string.Empty;
            }

            byte[] binary = Convert.FromBase64String(record.GetAttributeValue<string>("content"));
            string resourceContent = Encoding.UTF8.GetString(binary);
            string byteOrderMarkUtf8 = Encoding.UTF8.GetString(Encoding.UTF8.GetPreamble());
            if (resourceContent.StartsWith("\""))
            {
                resourceContent = resourceContent.Remove(0, byteOrderMarkUtf8.Length);
            }

            return resourceContent;
        }

        private async Task<string> GetSolutionPublisherPrefixAsync(ServiceClient serviceClient, string solutionUniqueName)
        {
            var fetchXml = new FetchExpression($@"
                <fetch top='1'>
                    <entity name='solution'>
                        <attribute name='solutionid' />
                        <link-entity name='publisher' from='publisherid' to='publisherid' alias='pub'>
                            <attribute name='customizationprefix' />
                        </link-entity>
                        <filter>
                            <condition attribute='uniquename' operator='eq' value='{solutionUniqueName}' />
                        </filter>
                    </entity>
                </fetch>");
            var response = await serviceClient.RetrieveMultipleAsync(fetchXml);
            var solution = response.Entities.FirstOrDefault();
            var prefix = solution?.GetAttributeValue<AliasedValue>("pub.customizationprefix")?.Value as string;
            return prefix ?? throw new Exception($"Unable to determine publisher for solution {solutionUniqueName}.");
        }
    }

}
