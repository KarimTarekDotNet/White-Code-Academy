using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Instructors.Queries.GetInstructors
{
    public class GetInstructorsHandler : IRequestHandler<GetInstructorsQuery, Result<IEnumerable<InstructorResponse>>>
    {
        private readonly IConfiguration _configuration;
        private readonly IInstructorRepository _instructorRepository;
        private readonly ICacheService _cache;
        private readonly IMapper _mapper;

        public GetInstructorsHandler(IInstructorRepository instructorRepository, IMapper mapper,
            ICacheService cache, IConfiguration configuration)
        {
            _instructorRepository = instructorRepository;
            _mapper = mapper;
            _cache = cache;
            _configuration = configuration;
        }

        public async Task<Result<IEnumerable<InstructorResponse>>> Handle(GetInstructorsQuery request, CancellationToken cancellationToken)
        {
            var redisKey = CacheKeys.SearchInstructors(request.Parameters);
            var cached = await _cache.GetAsync<IEnumerable<InstructorResponse>>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<IEnumerable<InstructorResponse>>.Success(cached.Item2);

            var instructors = await _instructorRepository.SearchAsync(request.Parameters, cancellationToken);
            var response = _mapper.Map<IEnumerable<InstructorResponse>>(instructors);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:InstructorsExpirationMinutes")),
                    cancellationToken);
            }

            return Result<IEnumerable<InstructorResponse>>.Success(response);
        }
    }
}
