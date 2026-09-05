using Application.Localization;
using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Sections.Queries.GetSectionsByCourse
{
    public class GetSectionsByCourseHandler : IRequestHandler<GetSectionsByCourseQuery, Result<IEnumerable<SectionResponse>>>
    {
        private readonly IConfiguration _configuration;
        private readonly ISectionRepository _sectionRepository;
        private readonly ICourseRepository _courseRepository;
        private readonly ICacheService _cache;
        private readonly IMapper _mapper;

        public GetSectionsByCourseHandler(ISectionRepository sectionRepository, ICourseRepository courseRepository,
            IMapper mapper, ICacheService cache, IConfiguration configuration)
        {
            _sectionRepository = sectionRepository;
            _courseRepository = courseRepository;
            _mapper = mapper;
            _cache = cache;
            _configuration = configuration;
        }

        public async Task<Result<IEnumerable<SectionResponse>>> Handle(GetSectionsByCourseQuery request, CancellationToken cancellationToken)
        {
            var redisKey = $"{CacheKeys.SectionsByCoursePrefix(request.CourseId)}:all";
            var cached = await _cache.GetAsync<IEnumerable<SectionResponse>>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<IEnumerable<SectionResponse>>.Success(cached.Item2);

            var course = await _courseRepository.GetByIdAsync(request.CourseId, cancellationToken);
            if (course == null)
                return Result<IEnumerable<SectionResponse>>.NotFound(MessageKeys.Common.Course_NotFound);

            var sections = await _sectionRepository.GetByCourseIdAsync(request.CourseId, cancellationToken);
            var response = _mapper.Map<IEnumerable<SectionResponse>>(sections);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:SectionsExpirationMinutes")),
                    cancellationToken);
            }

            return Result<IEnumerable<SectionResponse>>.Success(response);
        }
    }
}
