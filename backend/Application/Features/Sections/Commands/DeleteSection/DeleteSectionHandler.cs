using Application.Localization;
using Application.Common;
using Application.Helper;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Domain.Entites.Audits;
using Domain.Entites.Core;
using MediatR;
using Microsoft.Extensions.Logging;
using FFMpegCore;
using Microsoft.AspNetCore.Hosting;

namespace Application.Features.Sections.Commands.DeleteSection
{
    public class DeleteSectionHandler : IRequestHandler<DeleteSectionCommand, Result<bool>>
    {
        private readonly ICacheService _cache;
        private readonly IWebHostEnvironment _environment;
        private readonly ILogger<DeleteSectionHandler> _logger;
        private readonly ISectionRepository _sectionRepository;
        private readonly IInstructorRepository _instructorRepository;
        private readonly IFileStorageService _fileStorageService;
        private readonly IAuditLogRepository _auditLogRepository;

        public DeleteSectionHandler(
            ISectionRepository sectionRepository,
            IInstructorRepository instructorRepository,
            IFileStorageService fileStorageService,
            IAuditLogRepository auditLogRepository,
            ILogger<DeleteSectionHandler> logger,
            ICacheService cache,
            IWebHostEnvironment environment)
        {
            _sectionRepository = sectionRepository;
            _instructorRepository = instructorRepository;
            _fileStorageService = fileStorageService;
            _auditLogRepository = auditLogRepository;
            _logger = logger;
            _cache = cache;
            _environment = environment;
        }

        public async Task<Result<bool>> Handle(DeleteSectionCommand request, CancellationToken cancellationToken)
        {
            var section = await _sectionRepository.GetByIdWithNavigationPropertiesAsync(request.Id, cancellationToken);
            if (section == null)
            {
                _logger.LogWarning("Section {SectionId} was not found.", request.Id);
                return Result<bool>.NotFound(MessageKeys.Common.Section_NotFound);
            }

            if (request.IsInstructor)
            {
                var instructor = await _instructorRepository.GetByUserIdAsync(request.CurrentUserId, cancellationToken);
                if (instructor == null)
                {
                    _logger.LogWarning("Instructor profile for user {UserId} was not found.", request.CurrentUserId);
                    return Result<bool>.NotFound(MessageKeys.Common.Course_InstructorNotFound);
                }

                if (section.Course.InstructorId != instructor.Id)
                {
                    _logger.LogWarning("User {UserId} attempted to delete section {SectionId} without ownership.",
                        request.CurrentUserId, request.Id);
                    return Result<bool>.Forbidden(MessageKeys.Common.Section_AccessDenied);
                }
            }

            if (!string.IsNullOrEmpty(section.VideoUrl))
            {
                var physicalVideoPath = Path.Combine(_environment.WebRootPath, section.VideoUrl);
                var mediaInfo = await FFProbe.AnalyseAsync(physicalVideoPath, cancellationToken: cancellationToken);
                section.Course.TotalDurationInSeconds -= (long)mediaInfo.Duration.TotalSeconds;
                await _fileStorageService.DeleteAsync(section.VideoUrl);
            }

            if (!string.IsNullOrEmpty(section.PdfUrl))
                await _fileStorageService.DeleteAsync(section.PdfUrl);
                
            section.Course.TotalSections -= 1;

            _sectionRepository.Delete(section);
            await _sectionRepository.SaveChangesAsync(cancellationToken);

            await _cache.RemoveAsync(CacheKeys.Section(section.Id), cancellationToken);
            await _cache.RemoveByPrefixAsync(CacheKeys.SectionsByCoursePrefix(section.CourseId), cancellationToken);
            await _cache.RemoveAsync(CacheKeys.Course(section.CourseId), cancellationToken);
            await _cache.RemoveByPrefixAsync(CacheKeys.CoursesPrefix(), cancellationToken);

            await _auditLogRepository.LogAsync(new AuditLog
            {
                UserId = request.CurrentUserId,
                Action = "Delete",
                EntityName = nameof(Section),
                EntityId = section.Id,
                OldValues = null,
                NewValues = null,
                IpAddress = await IpAddressHelper.GetRealPublicIpAsync()
            }, cancellationToken);

            _logger.LogInformation("Section {SectionId} deleted successfully by user {UserId}.", request.Id, request.CurrentUserId);

            return Result<bool>.Success(true);
        }
    }
}
