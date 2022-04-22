﻿using CommandLine;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace WebResource.Syncer
{
    public class CommandLineOptions
    {
        [Option(shortName: 'f', longName: "filePath", 
            Group = "Upload",
            Required = true, 
            HelpText = "Path to the web resource file")]
        public string WebResourceFilePath { get; set; }
        [Option(shortName: 'u', longName: "updateIfExists", 
            Group = "Upload",
            Required = false, 
            HelpText = "If the web resource has already been uploaded to D365, update it's contents", 
            Default = false)]
        public bool UpdateIfExists { get; set; }
        [Option(shortName: 'p', longName: "publish", 
            Required = false, 
            HelpText = "Publish the file after uploading", 
            Default = false)]
        public bool PublishFile { get; set; }
        [Option(shortName: 's', longName: "solution", 
            Required = true, 
            HelpText = "Solution to target for the operation. If uploading, the solution to upload to. If reading, the solution to read webresources from")]
        public string Solution { get; set; }
        [Option(shortName: 'c', longName: "connectionString", 
            Required = false, 
            HelpText = "Connection string to the given Power Apps environment. DEV ONLY: It not supplied the program will try to get the connection string from appsettings.Development.json") ]
        public string ConnectionString { get; set; }
        [Option(shortName: 'd', longName: "dryRun", 
            Required = false, 
            HelpText = "Execute as a dry run") ]
        public bool DryRun { get; set; }
        [Option(shortName: 'l', longName: "listWebResources", 
            Group = "Read",
            Required = false, 
            HelpText = "If the web resource has already been uploaded to D365, update it's contents", Default = false)]
        public bool ListWebResources { get; set; }
    }
}
