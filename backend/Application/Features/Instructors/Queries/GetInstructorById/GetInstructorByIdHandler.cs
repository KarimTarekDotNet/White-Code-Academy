using Application.Localization;
using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Instructors.Queries.GetInstructorById
{
    public class GetInstructorByIdHandler : IRequestHandler<GetInstructorByIdQuery, Result<InstructorResponse>>
    {
        private readonly IConfiguration _configuration;
        private readonly IInstructorRepository _instructorRepository;
        private readonly ICacheService _cache;
        private readonly IMapper _mapper;

        public GetInstructorByIdHandler(IInstructorRepository instructorRepository, IMapper mapper,
            ICacheService cache, IConfiguration configuration)
        {
            _instructorRepository = instructorRepository;
            _mapper = mapper;
            _cache = cache;
            _configuration = configuration;
        }

        public async Task<Result<InstructorResponse>> Handle(GetInstructorByIdQuery request, CancellationToken cancellationToken)
        {
            var redisKey = CacheKeys.Instructor(request.Id);
            var cached = await _cache.GetAsync<InstructorResponse>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<InstructorResponse>.Success(cached.Item2);

            var instructor = await _instructorRepository.GetByIdWithNavigationPropertiesAsync(request.Id, cancellationToken);
            if (instructor == null)
                return Result<InstructorResponse>.NotFound(MessageKeys.Common.Instructor_NotFound);

            var response = _mapper.Map<InstructorResponse>(instructor);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:InstructorExpirationMinutes")),
                    cancellationToken);
            }

            return Result<InstructorResponse>.Success(response);
        }
    }
}
