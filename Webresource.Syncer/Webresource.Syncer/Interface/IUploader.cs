using System.Threading.Tasks;

namespace Webresource.Syncer.Interface
{
    public interface IUploader
    {
        Task UploadFileAsync();
    }
}
