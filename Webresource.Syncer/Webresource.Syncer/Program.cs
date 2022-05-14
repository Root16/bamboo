using System.IO;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using WebResource.Syncer.Interface;
using CommandLine;
using WebResource.Syncer.SyncLogic;
using Microsoft.Extensions.Logging.Console;
using WebResource.Syncer;
using System.Linq;
using System.CommandLine;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

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

var rootCommand = new RootCommand("Webresource.Syncer");

var uploadCommand = new Command("upload", "Upload the file to PowerApps")
            {
                fileOption,
                solutionOption,
                updateIfExistsOption,
            };

var listCommand = new Command("list", "List the Webresources in a given solution")
{
    solutionOption,
};

var publishCommand = new Command("publish", "Publish Webresource in PowerApps")
{
    fileOption,
};

uploadCommand.SetHandler(async (FileInfo fileInfo, string solutionName, bool updateIfExists) =>
{
    Console.WriteLine(fileInfo);
    Console.WriteLine(solutionName);
    Console.WriteLine(updateIfExists);
}, fileOption, solutionOption, updateIfExistsOption);

listCommand.SetHandler(async (string solutionName) =>
{
    Console.WriteLine(solutionName);
}, solutionOption);


publishCommand.SetHandler(async (FileInfo fileInfo) =>
{
    Console.WriteLine(fileInfo);
}, fileOption);

rootCommand.AddCommand(uploadCommand);
rootCommand.AddCommand(listCommand);
rootCommand.AddCommand(publishCommand);

return rootCommand.InvokeAsync(args).Result;

