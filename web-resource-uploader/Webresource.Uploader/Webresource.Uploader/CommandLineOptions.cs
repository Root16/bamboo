using CommandLine;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Webresource.Uploader
{
    public class CommandLineOptions
    {
        [Option(shortName: 'f', longName: "file", Required = true, HelpText = "Path to the web resource file")]
        public string WebResourceFilePath { get; set; }

        [Option(shortName: 'u', longName: "uploadfile", Required = false, HelpText = "Upload the file to the org", Default = true)]
        public bool UploadFile { get; set; }

        [Option(shortName: 's', longName: "solution", Required = false, HelpText = "Solution to add the file to")]
        public string Solution { get; set; }
    }
}
