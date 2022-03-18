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
    public enum WebresourceState
    {
        New,
        Draft,
        Saved,
        None
    }

    public enum WebresourceType
    {
        WebPage = 1,
        Css = 2,
        Script = 3,
        Data = 4,
        Png = 5,
        Jpg = 6,
        Gif = 7,
        Silverlight = 8,
        Xsl = 9,
        Ico = 10,
        Vector = 11,
        Resx = 12,
        Auto = 99
    }
    class WebresourceMapper
    {
        private static WebresourceMapper instance;

        private WebresourceMapper()
        {
            Items.Add(new Map("htm", WebresourceType.WebPage, 1, "Webpage"));
            Items.Add(new Map("html", WebresourceType.WebPage, 1, "Webpage"));
            Items.Add(new Map("css", WebresourceType.Css, 2, "Style"));
            Items.Add(new Map("js", WebresourceType.Script, 3, "Script"));
            Items.Add(new Map("ts", WebresourceType.Script, 3, "Script"));
            Items.Add(new Map("map", WebresourceType.Script, 3, "Script"));
            Items.Add(new Map("xml", WebresourceType.Data, 4, "Data"));
            Items.Add(new Map("png", WebresourceType.Png, 5, "PNG"));
            Items.Add(new Map("jpg", WebresourceType.Jpg, 6, "JPG"));
            Items.Add(new Map("jpeg", WebresourceType.Jpg, 6, "JPG"));
            Items.Add(new Map("gif", WebresourceType.Gif, 7, "GIF"));
            Items.Add(new Map("xap", WebresourceType.Silverlight, 8, "Silverlight"));
            Items.Add(new Map("xsl", WebresourceType.Xsl, 9, "XSL"));
            Items.Add(new Map("xslt", WebresourceType.Xsl, 9, "XSL"));
            Items.Add(new Map("ico", WebresourceType.Ico, 10, "ICO"));
            Items.Add(new Map("svg", WebresourceType.Vector, 11, "Vector"));
            Items.Add(new Map("resx", WebresourceType.Resx, 12, "Resource"));
        }

        public static WebresourceMapper Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = new WebresourceMapper();
                }

                return instance;
            }
        }

        public List<Map> Items { get; } = new List<Map>();
    }




    class Webresource
    {
        public static readonly ColumnSet Columns = new ColumnSet(
            "languagecode", "createdon", "name", "dependencyxml", "modifiedby",
            "webresourcetype", "displayname", "modifiedon", "createdby",
            "webresourceid", "description", "content");
        private Entity record;
        public string StringContent { get; private set; }

        public Guid Id => record?.Id ?? Guid.Empty;

        private string filePath;
        public WebresourceState State;

        public Webresource(string filePath)
        {
            var fi = new FileInfo(filePath);

            var resourceName = string.Empty;
            var parts = fi.FullName.Split('\\');
            for (var i = parts.Length - 1; i >= 0; i--)
            {
                resourceName = resourceName == string.Empty ? parts[i] : $"{parts[i]}/{resourceName}";

                if (parts[i].EndsWith("_")) break;
            }

            // If the same, then we did not find any root folder
            // similar to a customization prefix and the file does
            // not come from a locally saved web resources list
            if (resourceName.Replace("/", "\\") == fi.FullName)
            {
                resourceName = fi.Name;
            }

            record = new Entity("webresource")
            {
                ["name"] = resourceName,
                ["displayname"] = resourceName,
                ["webresourcetype"] = new OptionSetValue((int)GetTypeFromExtension(fi.Extension.Remove(0, 1))),
                ["content"] = Convert.ToBase64String(File.ReadAllBytes(filePath))
            };

            StringContent = GetPlainText();

            var map = WebresourceMapper.Instance.Items.FirstOrDefault(i => i.Extension.ToLower() == Path.GetExtension(filePath).ToLower().Remove(0, 1));
            if (map != null)
            {
                record.FormattedValues["webresourcetype"] = map.Label;
            }

            State = WebresourceState.None;
            this.filePath = filePath;

            if (string.IsNullOrEmpty(this.filePath) && !string.IsNullOrEmpty("figure it out"))
            {
                string expectedFilePath = Path.Combine("i'm sad", resourceName.Replace("/", "\\") ?? "");
                if (File.Exists(expectedFilePath))
                {
                    this.filePath = expectedFilePath;
                }
            }

        }
        public void Create(IOrganizationService service)
        {
            record.Id = service.Create(record);

            State = WebresourceState.None;
        }

        public static WebresourceType GetTypeFromExtension(string extension)
        {
            switch (extension.ToLower())
            {
                case "html":
                case "htm":
                    return WebresourceType.WebPage;

                case "css":
                    return WebresourceType.Css;

                case "js":
                    return WebresourceType.Script;

                case "json":
                case "xml":
                    return WebresourceType.Data;

                case "png":
                    return WebresourceType.Png;

                case "jpg":
                case "jpeg":
                    return WebresourceType.Jpg;

                case "gif":
                    return WebresourceType.Gif;

                case "xap":
                    return WebresourceType.Silverlight;

                case "xsl":
                case "xslt":
                    return WebresourceType.Xsl;

                case "ico":
                    return WebresourceType.Ico;

                case "svg":
                    return WebresourceType.Vector;

                case "resx":
                    return WebresourceType.Resx;
            }

            throw new Exception($@"File extension '{extension}' cannot be mapped to a webresource type!");
        }
        public void Update(IOrganizationService service, bool overwrite = false)
        {
            //var name = Name;
            //if (HasExtensionlessMappingFile && settings.SyncMatchingJsFilesAsExtensionless)
            //{
            //    File.WriteAllText(ExtensionlessMappingFilePath, StringContent);
            //    name = NameWithoutExtension;
            //}

            //if (Id == Guid.Empty)
            //{
            //    var remoteRecord = RetrieveWebresource(name, service);
            //    if (remoteRecord == null)
            //    {
            //        Create(service);
            //        State = WebresourceState.None;
            //        return;
            //    }

            //    record.Id = remoteRecord.Id;

            //    if (remoteRecord.Contains("displayname") && string.IsNullOrEmpty(DisplayName))
            //    {
            //        DisplayName = remoteRecord.GetAttributeValue<string>("displayname");
            //    }

            //    if (remoteRecord.Contains("description") && string.IsNullOrEmpty(Description))
            //    {
            //        Description = remoteRecord.GetAttributeValue<string>("description");
            //    }

            //    if (remoteRecord.Contains("dependencyxml") && string.IsNullOrEmpty(DependencyXml))
            //    {
            //        DependencyXml = remoteRecord.GetAttributeValue<string>("dependencyxml");
            //    }

            //    if (remoteRecord.Contains("languagecode") && LanguageCode == 0)
            //    {
            //        LanguageCode = remoteRecord.GetAttributeValue<int>("languagecode");
            //    }
            //}

            // Concurrency Behavior has a bug for webresources
            // Cannot implemen that
            //var request = new UpdateRequest
            //{
            //    Target = record,
            //    ConcurrencyBehavior =
            //        overwrite ? ConcurrencyBehavior.AlwaysOverwrite : ConcurrencyBehavior.IfRowVersionMatches
            //};

            //service.Execute(request);

            //if (!settings.ForceResourceUpdate)
            //{
            //    if (overwrite == false)
            //    {
            //        var existingRecord = service.Retrieve("webresource", record.Id, new ColumnSet(false));
            //        if (!string.IsNullOrEmpty(existingRecord.RowVersion) && !string.IsNullOrEmpty(record.RowVersion) && long.Parse(existingRecord.RowVersion) > long.Parse(record.RowVersion))
            //        {
            //            throw new MoreRecentRecordExistsException();
            //        }
            //    }
            //}

            service.Update(record);

            //GetLatestVersion(true);

            //Synced = true;
            State = WebresourceState.None;
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

            //byte[] b = Convert.FromBase64String(record.GetAttributeValue<string>("content"));
            //return Encoding.Default.GetString(b);
        }
    }
    class Uploader : IUploader
    {
        private string connectionString;
        public Uploader(IConfiguration configuration)
        {
            connectionString = configuration["ConnectionString"];
        }
        public void DoSomeRealWork()
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

    interface IUploader
    {
        void DoSomeRealWork();

    }
    class Program
    {
        static void Main(string[] args)
        {
            //setup our DI
            var serviceCollection = new ServiceCollection()
                .AddLogging()
                .AddSingleton<IUploader, Uploader>();

            ConfigureServices(serviceCollection);

            var serviceProvider = serviceCollection.BuildServiceProvider();

            var logger = serviceProvider.GetService<ILoggerFactory>()
                .CreateLogger<Program>();
            logger.LogDebug("Starting application");

            //do the actual work here
            var bar = serviceProvider.GetService<IUploader>();
            bar.DoSomeRealWork();

            logger.LogDebug("All done!");
            Console.WriteLine("Hello World!");

        }

        private static void ConfigureServices(IServiceCollection serviceCollection)
        {
            serviceCollection.AddLogging();

            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetParent(System.AppContext.BaseDirectory).FullName)
                .AddJsonFile("appsettings.Development.json", false)
                .Build();

            serviceCollection.AddSingleton<IConfiguration>(configuration);
        }

    }
}
