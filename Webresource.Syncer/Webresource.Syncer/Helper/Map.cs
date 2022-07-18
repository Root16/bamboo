using WebResource.Syncer.Enum;

namespace WebResource.Syncer.Helper
{
    class Map
    {
        public Map(string extension, WebResourceType type, int crmValue, string label)
        {
            Extension = extension;
            Type = type;
            CrmValue = crmValue;
            Label = label;
        }

        public string Extension { get; }
        public WebResourceType Type { get; }
        public int CrmValue { get; }
        public string Label { get; }
    }

}

