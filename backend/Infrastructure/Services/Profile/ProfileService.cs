using Application.Common;
using Application.DTOs.Profile;
using Application.Helper;
using Application.Interfaces.Profile;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Application.Localization;
using AutoMapper;
using Domain.Entites.Audits;
using Domain.Entites.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Org.BouncyCastle.Ocsp;

namespace Infrastructure.Services.Profile
{
    public class ProfileService : IProfileService
    {
        private readonly IAuditLogRepository _auditLogRepository;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<ProfileService> _logger;
        private readonly ICacheService _cache;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly IFileSecurityService _fileSecurityService;
        private readonly IFileStorageService _fileStorageService;


        public ProfileService(UserManager<ApplicationUser> userManager, ILogger<ProfileService> logger, ICacheService cache,
        IMapper mapper, IConfiguration configuration, IFileSecurityService fileSecurityService, IFileStorageService fileStorageService,
        IAuditLogRepository auditLogRepository)
        {
            _userManager = userManager;
            _logger = logger;
            _cache = cache;
            _mapper = mapper;
            _configuration = configuration;
            _fileSecurityService = fileSecurityService;
            _fileStorageService = fileStorageService;
            _auditLogRepository = auditLogRepository;
        }

        public async Task<Result<ProfileResponse>> GetProfileAsync(string userId)
        {
            var cacheKey = CacheKeys.Profile(userId);
            var cache = await _cache.GetAsync<ProfileResponse>(cacheKey);
            if(cache.Item2 != null)
            {
                return Result<ProfileResponse>.Success(_mapper.Map<ProfileResponse>(cache.Item2));
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return Result<ProfileResponse>.Unauthorized(MessageKeys.Common.Profile_UserNotFound);

            var result = _mapper.Map<ProfileResponse>(user);
            await _cache.SetAsync<ProfileResponse>(cacheKey, result, TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:ProfileExpirationMinutes")));
            return Result<ProfileResponse>.Success(result);
        }

        public async Task<Result<IEnumerable<ProfileResponse>>> GetAllProfilesAsync(QueryParameters parameters)
        {
            var users = _userManager.Users.AsQueryable();
            if(!string.IsNullOrEmpty(parameters.WordForSearch) || 
            !parameters.WordForSearch!.Equals("%all%", StringComparison.OrdinalIgnoreCase))
            {
                var searchTerm = $"%{parameters.WordForSearch.Trim().ToLower()}%";
                users = users.Where(x => EF.Functions.Like(x.Email!.ToLower(), searchTerm) || 
                EF.Functions.Like(x.UserName!.ToLower(), searchTerm));
            }
            int skip = (parameters.PageNumber - 1) * parameters.PageSize;
            users = users.Skip(skip).Take(parameters.PageSize);
        
            if (users == null || !users.Any())
                return Result<IEnumerable<ProfileResponse>>.NotFound(MessageKeys.Common.Profile_UsersNotFound);

            var result = _mapper.Map<IEnumerable<ProfileResponse>>(users);
            return Result<IEnumerable<ProfileResponse>>.Success(result);
        }

        public async Task<Result<ProfileResponse>> UpdateProfile(string userId, UpdateProfileRequset request)
        {
            var cacheKey = CacheKeys.Profile(userId);

            var cachedUser = (await _cache.GetAsync<ApplicationUser>(cacheKey)).Item2;

            var user = cachedUser ?? await _userManager.FindByIdAsync(userId);

            if (user is null)
            {
                _logger.LogWarning("User {UserId} not found while updating profile", userId);
                return Result<ProfileResponse>.Unauthorized(MessageKeys.Common.Profile_UserNotFound);
            }

            return await ExecuteProfileUpdateAsync(user, request, cacheKey);
        }

        private async Task<Result<ProfileResponse>> ExecuteProfileUpdateAsync(ApplicationUser user, UpdateProfileRequset request, string cacheKey)
        {
            _logger.LogInformation("Updating profile for user {UserId}", user.Id);

            var oldValues = Serializer.Serialize(_mapper.Map<ProfileResponse>(user));

            ApplyChanges(user, request);

            var oldImage = user.ImageUrl;
            string? newImage = null;
            if (request.ImageUrl is not null)
            {
                _logger.LogInformation("Uploading profile image for user {UserId}", user.Id);


                await _fileSecurityService.ValidateImageAsync(request.ImageUrl);
                await _fileSecurityService.ScanAsync(request.ImageUrl);

                var imageFolder = Path.Combine("Profiles", user.Id, "Images");

                newImage = await _fileStorageService.UploadAsync(request.ImageUrl, imageFolder);
                user.ImageUrl = newImage;
            }

            var updateResult = await _userManager.UpdateAsync(user);

            if (!updateResult.Succeeded)
            {
                var errors = string.Join(" | ", updateResult.Errors.Select(x => x.Description));

                _logger.LogWarning("Failed to update profile for user {UserId}. Errors: {Errors}", user.Id, errors);
                if (newImage is not null)
                {
                    try
                    {
                        await _fileStorageService.DeleteAsync(newImage);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to delete uploaded image {Image} after update failure for user {UserId}", newImage, user.Id);
                    }
                }

                user.ImageUrl = oldImage;

                return Result<ProfileResponse>.Failure(errors);
            }
            
            if (newImage is not null && !string.IsNullOrEmpty(oldImage))
            {
                try
                {
                    await _fileStorageService.DeleteAsync(oldImage);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to delete old profile image {Image} for user {UserId}", oldImage, user.Id);
                }
            }

            var response = _mapper.Map<ProfileResponse>(user);

            await _cache.SetAsync(cacheKey, response, TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:ProfileExpirationMinutes")));

            try
            {
                await _auditLogRepository.LogAsync(new AuditLog
                {
                    UserId = user.Id,
                    Action = "Update",
                    EntityName = nameof(ApplicationUser),
                    EntityId = Guid.Parse(user.Id),
                    OldValues = oldValues,
                    NewValues = Serializer.Serialize(user),
                    IpAddress = await IpAddressHelper.GetRealPublicIpAsync()
                });

                await _auditLogRepository.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to storage Audit for user {UserId}. Errors: {ex.Message}", user.Id, ex.Message);
            }

            _logger.LogInformation("Profile updated successfully for user {UserId}", user.Id);

            return Result<ProfileResponse>.Success(response);
        }

        private void ApplyChanges(ApplicationUser user, UpdateProfileRequset request)
        {
            if (!string.IsNullOrWhiteSpace(request.FirstName))
                user.FirstName = request.FirstName;

            if (!string.IsNullOrWhiteSpace(request.LastName))
                user.LastName = request.LastName;

            if (!string.IsNullOrWhiteSpace(request.UserName))
                user.UserName = request.UserName;
        }
    }
}