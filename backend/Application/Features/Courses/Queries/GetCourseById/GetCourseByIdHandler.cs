using Application.Localization;
using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Courses.Queries.GetCourseById
{
    public class GetCourseByIdHandler : IRequestHandler<GetCourseByIdQuery, Result<CourseResponse>>
    {
        private readonly IConfiguration _configuration;
        private readonly ICourseRepository _courseRepository;
        private readonly ICacheService _cache;
        private readonly IMapper _mapper;

        public GetCourseByIdHandler(ICourseRepository courseRepository, IMapper mapper, ICacheService cache, IConfiguration configuration)
        {
            _courseRepository = courseRepository;
            _mapper = mapper;
            _cache = cache;
            _configuration = configuration;
        }

        public async Task<Result<CourseResponse>> Handle(GetCourseByIdQuery request, CancellationToken cancellationToken)
        {
            var redisKey = CacheKeys.Course(request.Id);
            var cached = await _cache.GetAsync<CourseResponse>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<CourseResponse>.Success(cached.Item2);

            var course = await _courseRepository.GetByIdWithNavigationPropertiesAsync(request.Id, cancellationToken);
            if (course == null)
                return Result<CourseResponse>.NotFound(MessageKeys.Common.Course_NotFound);

            var response = _mapper.Map<CourseResponse>(course);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:CourseExpirationMinutes")),
                    cancellationToken);
            }

            return Result<CourseResponse>.Success(response);
        }
    }
}
