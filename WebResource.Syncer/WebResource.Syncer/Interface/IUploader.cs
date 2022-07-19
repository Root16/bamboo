using System.Threading.Tasks;

namespace WebResource.Syncer.Interface
{
    public interface IUploader
    {
        Task UploadFileAsync();
    }
}
