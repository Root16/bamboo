using System.IO;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Webresource.Syncer.Interface;
using CommandLine;
using Webresource.Syncer.Upload;

namespace Webresource.Syncer
{
    class Program
    {
        static void Main(string[] args)
        {
            Parser.Default.ParseArguments<CommandLineOptions>(args).WithParsed(options =>
            {
                var serviceCollection = new ServiceCollection();

                ConfigureServices(serviceCollection);

                serviceCollection.AddSingleton(options);

                var serviceProvider = serviceCollection.BuildServiceProvider();

                serviceProvider.GetService<IUploader>().UploadFile();
            });
        }

        private static void ConfigureServices(IServiceCollection serviceCollection)
        {
            serviceCollection.AddLogging();

            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetParent(System.AppContext.BaseDirectory).FullName)
                .AddJsonFile("appsettings.Development.json", false)
                .AddJsonFile("appsettings.json", false)
                .Build();

            serviceCollection.AddSingleton<IConfiguration>(configuration);
            serviceCollection.AddSingleton<IUploader, Uploader>();
            serviceCollection.AddLogging(configure => configure.AddConsole(options =>
            {
            }));
        }
    }
}
