#nullable enable
using System.IO;
using Microsoft.Extensions.Configuration;
using WebResource.Syncer.SyncLogic;
using System.CommandLine;
using System;
using System.Threading.Tasks;

IConfiguration config = new ConfigurationBuilder()
        .AddJsonFile("appsettings.json", false)
        .AddJsonFile("appsettings.Development.json", true)
        .Build();

var uploadFunc = async (FileInfo file, string solutionName, bool updateIfExists, string? connectionString) => 
    await (new Uploader(config, file, solutionName, updateIfExists, connectionString)).UploadFileAsync();

var listFunc = async (string solutionName, string? connectionString) => 
    await (new Lister(config, solutionName, connectionString)).ListFilesInSolutionAsync();

var publishFunc = async (FileInfo file, string? connectionString) => 
    await (new Publisher(config, file, connectionString)).PublishFileAsync();

var rootCommand = GenerateCommandLineArguments(uploadFunc, listFunc, publishFunc);

return rootCommand.InvokeAsync(args).Result;

static RootCommand GenerateCommandLineArguments(
    Func<FileInfo, string, bool, string?, Task<string>> uploadFuncAsync,
    Func<string, string?, Task<string>> listFuncAsync,
    Func<FileInfo, string?, Task<string>> publishFuncAsync
    )
{
    var connStringOption = new Option<string?>(
        name: "--conn-string",
        description: "Connection string to authenticate with Power Apps")
    {
    };

    var fileOption = new Option<FileInfo?>(
        name: "--file",
        description: "The file path for the given action")
    {
        IsRequired = true,
    };

    var solutionOption = new Option<string?>(
        name: "--solution",
        description: "Logical name of solution for the given action")
    {
        IsRequired = true,
    };

    var updateIfExistsOption = new Option<bool>(
        name: "--update-if-exists",
        getDefaultValue: () => false,
        description: "If the file already exists in the solution, update it's content");


    var uploadCommand = new Command("upload", "Upload the file to PowerApps")
    {
        fileOption,
        solutionOption,
        updateIfExistsOption,
        connStringOption,
    };

    var listCommand = new Command("list", "List the Webresources in a given solution")
    {
        solutionOption,
        connStringOption,
    };

    var publishCommand = new Command("publish", "Publish Webresource in PowerApps")
    {
        fileOption,
        connStringOption,
    };

    uploadCommand.SetHandler(async (FileInfo fileInfo, string solutionName, bool updateIfExists, string connectionString) =>
    {
        Console.WriteLine(await uploadFuncAsync(fileInfo, solutionName, updateIfExists, connectionString));
    }, fileOption, solutionOption, updateIfExistsOption, connStringOption);

    listCommand.SetHandler(async (string solutionName, string connectionString) =>
    {
        Console.WriteLine(await listFuncAsync(solutionName, connectionString));
    }, solutionOption, connStringOption);


    publishCommand.SetHandler(async (FileInfo fileInfo, string connectionString) =>
    {
        Console.WriteLine(await publishFuncAsync(fileInfo, connectionString));
    }, fileOption, connStringOption);

    var rootCommand = new RootCommand("Webresource.Syncer");

    rootCommand.AddCommand(uploadCommand);
    rootCommand.AddCommand(listCommand);
    rootCommand.AddCommand(publishCommand);

    return rootCommand;
}

