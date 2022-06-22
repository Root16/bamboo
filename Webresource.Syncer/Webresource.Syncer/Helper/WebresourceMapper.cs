using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Webresource.Syncer.Enum;

namespace Webresource.Syncer.Helper
{
    class WebResourceMapper
    {
        private static WebResourceMapper instance;

        private WebResourceMapper()
        {
            Items.Add(new Map("htm", WebResourceType.WebPage, 1, "Webpage"));
            Items.Add(new Map("html", WebResourceType.WebPage, 1, "Webpage"));
            Items.Add(new Map("css", WebResourceType.Css, 2, "Style"));
            Items.Add(new Map("js", WebResourceType.Script, 3, "Script"));
            Items.Add(new Map("ts", WebResourceType.Script, 3, "Script"));
            Items.Add(new Map("map", WebResourceType.Script, 3, "Script"));
            Items.Add(new Map("xml", WebResourceType.Data, 4, "Data"));
            Items.Add(new Map("png", WebResourceType.Png, 5, "PNG"));
            Items.Add(new Map("jpg", WebResourceType.Jpg, 6, "JPG"));
            Items.Add(new Map("jpeg", WebResourceType.Jpg, 6, "JPG"));
            Items.Add(new Map("gif", WebResourceType.Gif, 7, "GIF"));
            Items.Add(new Map("xap", WebResourceType.Silverlight, 8, "Silverlight"));
            Items.Add(new Map("xsl", WebResourceType.Xsl, 9, "XSL"));
            Items.Add(new Map("xslt", WebResourceType.Xsl, 9, "XSL"));
            Items.Add(new Map("ico", WebResourceType.Ico, 10, "ICO"));
            Items.Add(new Map("svg", WebResourceType.Vector, 11, "Vector"));
            Items.Add(new Map("resx", WebResourceType.Resx, 12, "Resource"));
        }

        public static WebResourceMapper Instance
        {
            get
            {
                if (instance == null)
                {
                    instance = new WebResourceMapper();
                }

                return instance;
            }
        }

        public List<Map> Items { get; } = new List<Map>();
    }
}
