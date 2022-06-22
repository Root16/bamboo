using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Webresource.Syncer.Interface
{
    public interface IUploader
    {
        Task UploadFileAsync();
    }
}
