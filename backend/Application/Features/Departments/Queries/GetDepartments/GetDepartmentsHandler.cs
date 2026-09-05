using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Departments.Queries.GetDepartments
{
    public class GetDepartmentsHandler : IRequestHandler<GetDepartmentsQuery, Result<IEnumerable<DepartmentResponse>>>
    {
        private readonly IConfiguration _configuration;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly ICacheService _cache;
        private readonly IMapper _mapper;

        public GetDepartmentsHandler(IDepartmentRepository departmentRepository, IMapper mapper,
            ICacheService cache, IConfiguration configuration)
        {
            _departmentRepository = departmentRepository;
            _mapper = mapper;
            _cache = cache;
            _configuration = configuration;
        }

        public async Task<Result<IEnumerable<DepartmentResponse>>> Handle(GetDepartmentsQuery request, CancellationToken cancellationToken)
        {
            var redisKey = CacheKeys.SearchDepartments(request.Parameters);
            var cached = await _cache.GetAsync<IEnumerable<DepartmentResponse>>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<IEnumerable<DepartmentResponse>>.Success(cached.Item2);

            var departments = await _departmentRepository.SearchAsync(request.Parameters, cancellationToken);
            var response = _mapper.Map<IEnumerable<DepartmentResponse>>(departments);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:DepartmentsExpirationMinutes")),
                    cancellationToken);
            }

            return Result<IEnumerable<DepartmentResponse>>.Success(response);
        }
    }
}
