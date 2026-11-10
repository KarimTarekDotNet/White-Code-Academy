using Application.Localization;
using System.Net;
using Application.Common;
using Application.DTOs.Authentication;
using Application.Interfaces.Authentecation;
using Application.Interfaces.BackgroundJobs;
using Application.Interfaces.Services;
using Domain.Entites.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Authentecation
{
    public class EmailVerificationService : IEmailVerificationService
    {
        private readonly IConfiguration _config;
        private readonly IEmailSender _emailSender;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IApplicationBackgroundJobClient _backgroundJobClient;
        private readonly ICacheService _cache;

        public EmailVerificationService(UserManager<ApplicationUser> userManager, IEmailSender emailSender,
            IConfiguration config, ICacheService cache, IApplicationBackgroundJobClient backgroundJobClient)
        {
            _userManager = userManager;
            _emailSender = emailSender;
            _config = config;
            _cache = cache;
            _backgroundJobClient = backgroundJobClient;
        }

        public async Task<AuthResponse> SendEmailConfirmationAsync(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return new AuthResponse { Id = userId, IsAuthenticated = false, Message = MessageKeys.Common.Auth_UserNotFound };

            if (string.IsNullOrWhiteSpace(user.Email))
                return new AuthResponse { Id = user.Id, UserName = user.UserName, PhoneNumber = user.PhoneNumber, IsAuthenticated = false, Message = MessageKeys.Common.Auth_EmailNotConfigured };

            if (user.EmailConfirmed)
            {
                return new AuthResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    UserName = user.UserName,
                    PhoneNumber = user.PhoneNumber,
                    IsAuthenticated = true,
                    Message = MessageKeys.Common.Auth_EmailAlreadyConfirmed
                };
            }

            var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var encoded = WebUtility.UrlEncode(token);
            var frontendBaseUrl = _config.GetValue<string>("EmailSettings:FrontendLocalBaseUrl");
            var confirmationLink = $"{frontendBaseUrl}/api/authentication/confirm-email?userId={user.Id}&token={encoded}";
            var cooldownMinutes = _config.GetValue<double>("Redis:EmailVerificationResendCooldownMinutes");

            var subject = "Confirm Your Email Address";
            var path = Path.Combine(AppContext.BaseDirectory, "Templates", "ConfirmEmail.html");
            var body = await File.ReadAllTextAsync(path);

            body = body
                .Replace("{{UserName}}", user.UserName)
                .Replace("{{ConfirmationUrl}}", confirmationLink);

            _backgroundJobClient.Enqueue<IEmailSender>(x => x.SendEmailAsync(user.Email, subject, body));

            var cooldownKey = CacheKeys.EmailVerificationCooldown(user.Id);
            await _cache.SetAsync<bool>(cooldownKey, true, TimeSpan.FromMinutes(cooldownMinutes));

            return new AuthResponse
            {
                Id = user.Id,
                Email = user.Email,
                UserName = user.UserName,
                PhoneNumber = user.PhoneNumber,
                IsAuthenticated = false,
                Message = MessageKeys.Common.Auth_EmailSent
            };
        }

        public async Task<AuthResponse> ConfirmEmailAsync(string userId, string token)
        {
            var user = await _userManager.FindByIdAsync(userId);

            if (user == null)
                return new AuthResponse { Id = userId, IsAuthenticated = false, Message = MessageKeys.Common.Auth_UserNotFound };

            if (string.IsNullOrWhiteSpace(token))
                return new AuthResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    UserName = user.UserName,
                    PhoneNumber = user.PhoneNumber,
                    IsAuthenticated = false,
                    Message = MessageKeys.Common.Auth_InvalidConfirmationToken
                };

            if (user.EmailConfirmed)
            {
                return new AuthResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    UserName = user.UserName,
                    PhoneNumber = user.PhoneNumber,
                    IsAuthenticated = true,
                    Message = MessageKeys.Common.Auth_EmailAlreadyConfirmed
                };
            }

            var result = await _userManager.ConfirmEmailAsync(user, token);

            if (!result.Succeeded)
            {
                return new AuthResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    UserName = user.UserName,
                    PhoneNumber = user.PhoneNumber,
                    IsAuthenticated = false,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description))
                };
            }

            await _cache.RemoveAsync(CacheKeys.EmailVerificationCooldown(user.Id));

            return new AuthResponse
            {
                Id = user.Id,
                Email = user.Email,
                UserName = user.UserName,
                PhoneNumber = user.PhoneNumber,
                IsAuthenticated = true,
                Message = MessageKeys.Common.Auth_EmailConfirmed
            };
        }

        public async Task<AuthResponse> ResendEmailConfirmationAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return new AuthResponse
                {
                    Email = email,
                    IsAuthenticated = false,
                    Message = MessageKeys.Common.Auth_EmailRequired
                };
            }

            var user = await _userManager.FindByEmailAsync(email);

            if (user == null)
            {
                return new AuthResponse
                {
                    Email = email,
                    IsAuthenticated = false,
                    Message = MessageKeys.Common.Auth_EmailNotFoundPrivacy
                };
            }

            if (user.EmailConfirmed)
            {
                return new AuthResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    UserName = user.UserName,
                    PhoneNumber = user.PhoneNumber,
                    IsAuthenticated = true,
                    Message = MessageKeys.Common.Auth_EmailAlreadyConfirmed
                };
            }

            var cooldownKey = CacheKeys.EmailVerificationCooldown(user.Id);
            var cooldownActive = await _cache.GetAsync<bool?>(cooldownKey);

            if (cooldownActive.Item2 is true)
            {
                return new AuthResponse
                {
                    Id = user.Id,
                    Email = user.Email,
                    UserName = user.UserName,
                    PhoneNumber = user.PhoneNumber,
                    IsAuthenticated = false,
                    Message = MessageKeys.Common.Auth_EmailAlreadySent
                };
            }

            return await SendEmailConfirmationAsync(user.Id);
        }
    }
}
