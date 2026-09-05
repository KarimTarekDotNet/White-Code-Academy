using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Enrollments.Queries.GetEnrollmentsByStudent
{
    public class GetEnrollmentsByStudentHandler : IRequestHandler<GetEnrollmentsByStudentQuery, Result<IEnumerable<EnrollmentResponse>>>
    {
        private readonly IConfiguration _configuration;
        private readonly IEnrollmentRepository _enrollmentRepository;
        private readonly IStudentRepository _studentRepository;
        private readonly ICacheService _cache;
        private readonly IMapper _mapper;

        public GetEnrollmentsByStudentHandler(IEnrollmentRepository enrollmentRepository, IStudentRepository studentRepository,
            IMapper mapper, ICacheService cache, IConfiguration configuration)
        {
            _enrollmentRepository = enrollmentRepository;
            _studentRepository = studentRepository;
            _mapper = mapper;
            _cache = cache;
            _configuration = configuration;
        }

        public async Task<Result<IEnumerable<EnrollmentResponse>>> Handle(GetEnrollmentsByStudentQuery request, CancellationToken cancellationToken)
        {
            var redisKey = $"{CacheKeys.EnrollmentsByStudentPrefix(request.StudentId)}:all";
            var cached = await _cache.GetAsync<IEnumerable<EnrollmentResponse>>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<IEnumerable<EnrollmentResponse>>.Success(cached.Item2);

            var student = await _studentRepository.GetByIdAsync(request.StudentId, cancellationToken);
            if (student == null)
                return Result<IEnumerable<EnrollmentResponse>>.NotFound($"Student with ID {request.StudentId} not found.");

            var enrollments = await _enrollmentRepository.GetByStudentIdAsync(request.StudentId, cancellationToken);
            var response = _mapper.Map<IEnumerable<EnrollmentResponse>>(enrollments);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:EnrollmentsExpirationMinutes")),
                    cancellationToken);
            }

            return Result<IEnumerable<EnrollmentResponse>>.Success(response);
        }
    }
}
