using System.IO;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using WebResource.Syncer.Interface;
using CommandLine;
using WebResource.Syncer.SyncLogic;
using Microsoft.Extensions.Logging.Console;
using WebResource.Syncer;

await Parser.Default.ParseArguments<CommandLineOptions>(args).WithParsedAsync(async options =>
{
    IConfiguration config = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json", false)
        .AddJsonFile("appsettings.Development.json", false)
        .Build();

    if(options.ListWebResources)
    {
        var lister = new Lister(config, options);

        await lister.ListFilesInSolutionAsync();

        return;
    }

    IUploader uploader = new Uploader(config, options);

    await uploader.UploadFileAsync();

});
