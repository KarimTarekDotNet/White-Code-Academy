using API.Controllers.Common;
using Application.Common;
using Application.Interfaces.Profile;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controllers.Core
{
    [Route("api/[controller]")]
    public class UserController : BaseController
    {
        private readonly IProfileService _profileService;

        public UserController(IProfileService profileService)
        {
            _profileService = profileService;
        }
        
        [Authorize(Roles="Admin,Instructor")]
        [EnableRateLimiting("ReadPolicy")]
        public async Task<IActionResult> GetUsers([FromQuery]QueryParameters queryParameters)
        {
            var result = await _profileService.GetAllProfilesAsync(queryParameters);
            if(result!.IsSuccess)
                return Ok(result);
            return NotFound(result);
        }
    }
}