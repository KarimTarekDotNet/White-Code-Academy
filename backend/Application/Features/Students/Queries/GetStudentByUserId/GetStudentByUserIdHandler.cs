using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Application.Localization;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Students.Queries.GetStudentByUserId
{
    public class GetStudentByUserIdHandler : IRequestHandler<GetStudentByUserIdQuery, Result<StudentResponse>?>
    {
        private readonly IStudentRepository _studentRepository;
        private readonly IMapper _mapper;
        private readonly ICacheService _cache;
        private readonly IConfiguration _configuration;

        public GetStudentByUserIdHandler(IStudentRepository studentRepository, ICacheService cache,
        IConfiguration configuration, IMapper mapper)
        {
            _studentRepository = studentRepository;
            _cache = cache;
            _configuration = configuration;
            _mapper = mapper;
        }

        public async Task<Result<StudentResponse>?> Handle(GetStudentByUserIdQuery request, CancellationToken cancellationToken)
        {
            var redisKey = $"{CacheKeys.StudentByUserId(request.UserId)}";
            var cached = await _cache.GetAsync<StudentResponse>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<StudentResponse>.Success(cached.Item2);

            var student = await _studentRepository.GetByUserIdAsync(request.UserId, cancellationToken);
            if (student == null)
                return Result<StudentResponse>.NotFound(MessageKeys.Common.Student_NotFound);

            var response = _mapper.Map<StudentResponse>(student);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:StudentExpirationMinutes")),
                    cancellationToken);
            }

            return Result<StudentResponse>.Success(response);
        }
    }
}