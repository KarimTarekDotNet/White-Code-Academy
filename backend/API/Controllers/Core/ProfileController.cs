using API.Controllers.Common;
using Application.DTOs.Profile;
using Application.Interfaces.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controllers.Core
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfileController : BaseController
    {
        private readonly IProfileService _profileService;

        public ProfileController(IProfileService profileService)
        {
            _profileService = profileService;
        }

        [HttpGet]
        [EnableRateLimiting("ReadPolicy")]
        public async Task<IActionResult> GetProfile()
        {
            var userId =  GetCurrentUserId();
            var result = await _profileService.GetProfileAsync(userId);
            if (result.IsSuccess)
                return Ok(result.Value);

            return NotFound(result);
        }

        [HttpPatch]
        [EnableRateLimiting("HeavyPolicy")]
        public async Task<IActionResult> UpdateProfile([FromForm] UpdateProfileRequset requset)
        {
            var userId =  GetCurrentUserId();
            var result = await _profileService.UpdateProfile(userId, requset);
            if (result.IsSuccess)
                return Ok(result.Value);

            return Failure(result);
        }
    }
}