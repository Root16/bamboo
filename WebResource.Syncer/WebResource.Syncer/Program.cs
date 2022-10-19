#nullable enable
using System.IO;
using Microsoft.Extensions.Configuration;
using WebResource.Syncer.SyncLogic;
using System.CommandLine;
using System;

IConfiguration config = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json", false)
        .Build();

var rootCommand = GenerateCommandLineArguments(config);

return rootCommand.InvokeAsync(args).Result;

static RootCommand GenerateCommandLineArguments(IConfiguration config)
{
    var fileOption = new Option<FileInfo>(
        name: "--file",
        description: "The file path on disk for the given action")
    {
        IsRequired = true,
    };

    var filePathInPowerAppsOption = new Option<string>(
        name: "--file-name-in-pa",
        description: "The file path for the webresource once it's uploaded to PowerApps")
    {
        IsRequired = true,
    };

    var solutionOption = new Option<string>(
        name: "--solution",
        description: "Logical name of solution for the given action")
    {
        IsRequired = true,
    };

    var updateIfExistsOption = new Option<bool>(
        name: "--update-if-exists",
        getDefaultValue: () => false,
        description: "If the file already exists in the solution, update it's content");

    var connStringOption = new Option<string>(
        name: "--conn-string",
        description: "Connection string to authenticate with Power Apps")
    {
        IsRequired = true,
    };

    var authenticateCommand = new Command("authenticate", "Test authentication method")
    {
        connStringOption,
    };

    var uploadCommand = new Command("upload", "Upload the file to PowerApps")
    {
        fileOption,
        filePathInPowerAppsOption,
        solutionOption,
        updateIfExistsOption,
        connStringOption,
    };

    var listCommand = new Command("list", "List the WebResources in a given solution")
    {
        solutionOption,
        connStringOption,
    };

    var publishCommand = new Command("publish", "Publish WebResource in PowerApps")
    {
        fileOption,
        solutionOption,
        filePathInPowerAppsOption,
        connStringOption,
    };

    authenticateCommand.SetHandler(async (string connectionString) =>
    {
        var syncer = new AuthenticationTester(config, connectionString);
        Console.WriteLine(await syncer.Authenticate());
    }, connStringOption);

    uploadCommand.SetHandler(async (FileInfo fileInfo,
                                    string filePathInPowerApps,
                                    string solutionName,
                                    bool updateIfExists,
                                    string connectionString) =>
    {
        var uploader = new Uploader(config, fileInfo, filePathInPowerApps, solutionName, updateIfExists, connectionString);
        Console.WriteLine(await uploader.UploadFileAsync());
    }, fileOption, filePathInPowerAppsOption, solutionOption, updateIfExistsOption, connStringOption);

    listCommand.SetHandler(async (string solutionName, string connectionString) =>
    {
        var lister = new Lister(config, solutionName, connectionString);
        Console.WriteLine(await lister.ListFilesInSolutionAsync());
    }, solutionOption, connStringOption);


    publishCommand.SetHandler(async (string solutionName, FileInfo file, string filePathInPowerApps, string connectionString) =>
    {
        var publisher = new Publisher(config, solutionName, file, filePathInPowerApps, connectionString);
        Console.WriteLine(await publisher.PublishFileAsync());
    }, solutionOption, fileOption, filePathInPowerAppsOption, connStringOption);

    var rootCommand = new RootCommand("WebResource.Syncer");

    rootCommand.AddCommand(uploadCommand);
    rootCommand.AddCommand(listCommand);
    rootCommand.AddCommand(publishCommand);
    rootCommand.AddCommand(authenticateCommand);

    return rootCommand;
}
