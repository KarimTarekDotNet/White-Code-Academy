using Application.Localization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Application.Common;
using Application.DTOs.Authentication;
using Application.Interfaces.Authentecation;
using Application.Interfaces.Services;
using AutoMapper;
using Domain.Entites.Enums;
using Domain.Entites.Users;
using Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Infrastructure.Authentecation
{
    public class AuthenticationService : IAuthenticationService
    {
        private readonly IConfiguration _configuration;
        private readonly ICacheService _cache;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IMapper mapper;
        private readonly ApplicationDbContext _context;
        private readonly IEmailVerificationService _emailVerificationService;
        private readonly IRefreshTokenService _refreshTokenSerivce;

        public AuthenticationService(IConfiguration configuration, UserManager<ApplicationUser> userManager, IMapper mapper, ApplicationDbContext context, 
        IEmailVerificationService emailVerificationService, IRefreshTokenService refreshTokenSerivce, ICacheService cache)
        {
            _configuration = configuration;
            _userManager = userManager;
            this.mapper = mapper;
            _context = context;
            _emailVerificationService = emailVerificationService;
            _refreshTokenSerivce = refreshTokenSerivce;
            _cache = cache;
        }

        public async Task<AuthResponse> LoginAsync(LoginRequest request, string? ipAddress)
        {
            var user = await _userManager.FindByEmailAsync(request.Identity) ??
                       await _userManager.FindByNameAsync(request.Identity);

            if (user == null)
            {
                return new AuthResponse
                {
                    IsAuthenticated = false,
                    Message = MessageKeys.Common.Auth_InvalidCredentials,
                    Expiration = DateTime.UtcNow,
                    AccessToken = string.Empty
                };
            }

            if (!user.EmailConfirmed)
            {
                return new AuthResponse
                {
                    IsAuthenticated = false,
                    Id = user.Id,
                    Email = user.Email,
                    UserName = user.UserName,
                    PhoneNumber = user.PhoneNumber,
                    Message = MessageKeys.Common.Auth_EmailNotConfirmed,
                    Expiration = DateTime.UtcNow,
                    AccessToken = string.Empty
                };
            }

            var passCheck = await _userManager.CheckPasswordAsync(user, request.Password);
            if(!passCheck)
            {
                return new AuthResponse
                {
                    IsAuthenticated = false,
                    Id = user.Id,
                    Email = user.Email,
                    UserName = user.UserName,
                    PhoneNumber = user.PhoneNumber,
                    Message = MessageKeys.Common.Auth_InvalidCredentials,
                    Expiration = DateTime.UtcNow,
                    AccessToken = string.Empty
                };
            }

            var jwtExpireMinutes = _configuration.GetValue<double>("Jwt:ExpireMinutes");
            var cacheExpireMinutes = _configuration.GetValue<double>("Redis:AuthTokenActiveCacheMinutes");

            var dto = mapper.Map<AuthResponse>(user);
            var refresh = await _refreshTokenSerivce.GenerateAsync(user.Id, ipAddress);

            await _context.SaveChangesAsync();

            var accessToken = await GenerateJwtToken(user);

            // Mark this user as having an active JWT (TTL matches JWT expiry)
            await _cache.SetAsync<bool>(CacheKeys.AuthTokenActive(user.Id), true, TimeSpan.FromMinutes(jwtExpireMinutes));

            // Track the raw refresh token hash so we can detect active refresh sessions
            await _cache.SetAsync<string>(CacheKeys.RefreshTokenActive(user.Id), _refreshTokenSerivce.HashToken(refresh.RawToken), TimeSpan.FromMinutes(cacheExpireMinutes));

            dto.IsAuthenticated = true;
            dto.Message = MessageKeys.Common.Auth_LoginSuccess;
            dto.AccessToken = accessToken;
            dto.Expiration = DateTime.UtcNow.AddMinutes(jwtExpireMinutes);
            dto.RefreshToken = refresh.RawToken;
            return dto;
        }

        public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
        {
            try
            {
                var userExists = await _userManager.FindByEmailAsync(request.Email) ??
                                 await _userManager.FindByNameAsync(request.UserName);

                if (userExists != null)
                {
                    return new AuthResponse
                    {
                        IsAuthenticated = false,
                        Message = MessageKeys.Common.Auth_UserAlreadyExists,
                        Expiration = DateTime.UtcNow,
                        AccessToken = string.Empty
                    };
                }

                var user = mapper.Map<ApplicationUser>(request);
                user.EmailConfirmed = false;

                var result = await _userManager.CreateAsync(user, request.Password);

                if (!result.Succeeded)
                {
                    return new AuthResponse
                    {
                        IsAuthenticated = false,
                        Message = string.Join(" | ", result.Errors.Select(e => e.Description)),
                        Expiration = DateTime.UtcNow,
                        AccessToken = string.Empty
                    };
                }

                var addToRoleResult = await _userManager.AddToRoleAsync(user, Role.User.ToString());

                if (!addToRoleResult.Succeeded)
                {
                    await _userManager.DeleteAsync(user);
                    return new AuthResponse
                    {
                        IsAuthenticated = false,
                        Message = string.Join(" | ", addToRoleResult.Errors.Select(e => e.Description))
                    };
                }

                await _emailVerificationService.SendEmailConfirmationAsync(user.Id);

                return new AuthResponse
                {
                    IsAuthenticated = false,
                    Message = MessageKeys.Common.Auth_AccountCreated,
                    Id = user.Id,
                    Email = user.Email,
                    UserName = user.UserName,
                    PhoneNumber = user.PhoneNumber
                };
            }
            catch (Exception)
            {
                return new AuthResponse
                {
                    IsAuthenticated = false,
                    Message = MessageKeys.Common.Auth_RegistrationError
                };
            }
        }

        public async Task<string> GenerateJwtToken(ApplicationUser user)
        {
            var userClaims = await _userManager.GetClaimsAsync(user);
            var userRoles  = await _userManager.GetRolesAsync(user);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            claims.AddRange(userClaims);
            claims.AddRange(userRoles.Select(role => new Claim(ClaimTypes.Role, role)));

            var securityKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_configuration.GetValue<string>("Jwt:Key")!)
            );

            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken
            (
                issuer:             _configuration.GetValue<string>("Jwt:Issuer"),
                audience:           _configuration.GetValue<string>("Jwt:Audience"),
                claims:             claims,
                expires:            DateTime.UtcNow.AddMinutes(_configuration.GetValue<double>("Jwt:ExpiryMinutes")),
                signingCredentials: credentials
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public async Task<AuthResponse> RefreshAsync(string refreshToken, string? ipAddress)
        {
            try
            {
                var oldToken = await _refreshTokenSerivce.GetByRawTokenAsync(refreshToken);
                if (oldToken == null || !oldToken.IsActive)
                {
                    return new AuthResponse
                    {
                        IsAuthenticated = false,
                        Message = MessageKeys.Common.Auth_InvalidRefreshToken,
                        Expiration = DateTime.UtcNow,
                        AccessToken = string.Empty
                    };
                }

                var token = await _refreshTokenSerivce.RotateAsync(oldToken, oldToken.ApplicationUserId, ipAddress);

                var accessToken      = await GenerateJwtToken(oldToken.ApplicationUser);
                var jwtExpireMinutes = _configuration.GetValue<double>("Jwt:ExpiryMinutes");
                var cacheExpireMinutes = _configuration.GetValue<double>("Redis:AuthTokenActiveCacheMinutes");

                await _context.SaveChangesAsync();

                // Refresh the active-token keys with the new tokens
                await _cache.SetAsync<bool>(
                    CacheKeys.AuthTokenActive(oldToken.ApplicationUserId),
                    true,
                    TimeSpan.FromMinutes(jwtExpireMinutes));

                await _cache.SetAsync<string>(
                    CacheKeys.RefreshTokenActive(oldToken.ApplicationUserId),
                    _refreshTokenSerivce.HashToken(token.RawToken),
                    TimeSpan.FromMinutes(cacheExpireMinutes));

                return new AuthResponse
                {
                    IsAuthenticated = true,
                    Message = MessageKeys.Common.Auth_TokenRefreshed,
                    Id = oldToken.ApplicationUserId,
                    Email = oldToken.ApplicationUser.Email,
                    UserName = oldToken.ApplicationUser.UserName,
                    AccessToken = accessToken,
                    Expiration = DateTime.UtcNow.AddMinutes(jwtExpireMinutes),
                    RefreshToken    = token.RawToken
                };
            }
            catch (Exception ex)
            {
                return new AuthResponse { Message = ex.Message };
            }
        }

        public async Task<bool> LogoutAsync(string refreshToken, string? ipAddress)
        {
            var token = await _refreshTokenSerivce.GetByRawTokenAsync(refreshToken);

            if (token == null || !token.IsActive)
                return false;

            var revoked = await _refreshTokenSerivce.RevokeAsync(token.ApplicationUserId, refreshToken, ipAddress);

            await _context.SaveChangesAsync();

            // Clear both active-token cache keys on logout
            await _cache.RemoveAsync(CacheKeys.AuthTokenActive(token.ApplicationUserId));
            await _cache.RemoveAsync(CacheKeys.RefreshTokenActive(token.ApplicationUserId));

            return revoked;
        }

        public async Task<bool> LogoutAllAsync(string userId, string? ipAddress)
        {
            var tokens = await _refreshTokenSerivce.GetByListTokenUserIdAsync(userId);
            if (!tokens!.Any())
                return false;

            foreach (var item in tokens!)
            {
                item.RevokedAt = DateTimeOffset.UtcNow;
                item.RevokedByIp = ipAddress;
            }

            await _context.SaveChangesAsync();

            // Clear cache for all sessions
            await _cache.RemoveAsync(CacheKeys.AuthTokenActive(userId));
            await _cache.RemoveAsync(CacheKeys.RefreshTokenActive(userId));

            return true;
        }
    }
}
