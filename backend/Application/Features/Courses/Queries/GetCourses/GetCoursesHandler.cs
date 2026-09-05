using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Courses.Queries.GetCourses
{
    public class GetCoursesHandler : IRequestHandler<GetCoursesQuery, Result<IEnumerable<CourseResponse>>>
    {
        private readonly IConfiguration _configuration;
        private readonly ICourseRepository _courseRepository;
        private readonly ICacheService _cache;
        private readonly IMapper _mapper;

        public GetCoursesHandler(ICourseRepository courseRepository, IMapper mapper, ICacheService cache, IConfiguration configuration)
        {
            _courseRepository = courseRepository;
            _mapper = mapper;
            _cache = cache;
            _configuration = configuration;
        }

        public async Task<Result<IEnumerable<CourseResponse>>> Handle(GetCoursesQuery request, CancellationToken cancellationToken)
        {
            var redisKey = CacheKeys.SearchCourses(request.Parameters);
            var cached = await _cache.GetAsync<IEnumerable<CourseResponse>>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<IEnumerable<CourseResponse>>.Success(cached.Item2);

            var courses = await _courseRepository.SearchAsync(request.Parameters, cancellationToken);
            var response = _mapper.Map<IEnumerable<CourseResponse>>(courses);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:CoursesExpirationMinutes")),
                    cancellationToken);
            }

            return Result<IEnumerable<CourseResponse>>.Success(response);
        }
    }
}
