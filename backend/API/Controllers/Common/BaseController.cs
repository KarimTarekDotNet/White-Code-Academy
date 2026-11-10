using System.Security.Claims;
using Application.Common;
using Application.Resources;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace API.Controllers.Common
{
    [ApiController]
    public abstract class BaseController : ControllerBase
    {
        private IStringLocalizer<CommonMessages>? _localizer;

        protected IStringLocalizer<CommonMessages> Localizer =>
            _localizer ??= HttpContext.RequestServices
                .GetRequiredService<IStringLocalizer<CommonMessages>>();

        /// <summary>
        /// Resolves a MessageKey to the localized string for the current request culture.
        /// Falls back to the key itself when not found — no silent loss.
        /// </summary>
        protected string ResolveMessage(string? key)
        {
            if (string.IsNullOrWhiteSpace(key))
                return key ?? string.Empty;

            return Localizer[key].Value;
        }

        /// <summary>
        /// Converts a failed Result&lt;T&gt; to an IActionResult with the error message translated.
        /// </summary>
        protected IActionResult Failure<T>(Result<T> result)
            => StatusCode(result.StatusCode, new
            {
                StatusCode = result.StatusCode,
                Message = ResolveMessage(result.Error)
            });

        /// <summary>
        /// Returns the authenticated user's Identity ID from the JWT NameIdentifier claim.
        /// Throws UnauthorizedAccessException if the claim is missing.
        /// </summary>
        protected string GetCurrentUserId()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(userId))
                throw new UnauthorizedAccessException("User identity claim not found.");

            return userId;
        }
    }
}
