using Application.Common;
using Application.DTOs.Profile;

namespace Application.Interfaces.Profile
{
    public interface IProfileService
    {
        Task<Result<ProfileResponse>> GetProfileAsync(string userId);
        Task<Result<IEnumerable<ProfileResponse>>> GetAllProfilesAsync(QueryParameters parameters);
        Task<Result<ProfileResponse>> UpdateProfile(string usserId, UpdateProfileRequset request);
    }
}