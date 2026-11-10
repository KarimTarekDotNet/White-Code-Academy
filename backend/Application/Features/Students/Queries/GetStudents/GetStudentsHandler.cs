using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Application.Localization;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Students.Queries.GetStudents
{
    public class GetStudentsHandler : IRequestHandler<GetStudentsQuery, Result<IEnumerable<StudentResponse>>?>
    {
        private readonly IStudentRepository _studentRepository;
        private readonly IMapper _mapper;
        private readonly ICacheService _cache;
        private readonly IConfiguration _configuration;

        public GetStudentsHandler(IStudentRepository studentRepository, IMapper mapper, 
        ICacheService cache, IConfiguration configuration)
        {
            _studentRepository = studentRepository;
            _mapper = mapper;
            _cache = cache;
            _configuration = configuration;
        }

        public async Task<Result<IEnumerable<StudentResponse>>?> Handle(GetStudentsQuery request, CancellationToken cancellationToken)
        {
            var redisKey = $"{CacheKeys.SearchStudents(request.Parameters)}";
            var cached = await _cache.GetAsync<IEnumerable<StudentResponse>>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<IEnumerable<StudentResponse>>.Success(cached.Item2);

            var student = await _studentRepository.SearchAsync(request.Parameters, cancellationToken);
            if (student == null)
                return Result<IEnumerable<StudentResponse>>.NotFound(MessageKeys.Common.Students_NotFound);

            var response = _mapper.Map<IEnumerable<StudentResponse>>(student);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:StudentsExpirationMinutes")),
                    cancellationToken);
            }

            return Result<IEnumerable<StudentResponse>>.Success(response);
        }
    }
}