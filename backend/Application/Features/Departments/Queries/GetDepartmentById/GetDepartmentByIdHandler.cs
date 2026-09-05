using Application.Localization;
using Application.Common;
using Application.DTOs.Core;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using AutoMapper;
using MediatR;
using Microsoft.Extensions.Configuration;

namespace Application.Features.Departments.Queries.GetDepartmentById
{
    public class GetDepartmentByIdHandler : IRequestHandler<GetDepartmentByIdQuery, Result<DepartmentResponse>>
    {
        private readonly IConfiguration _configuration;
        private readonly IDepartmentRepository _departmentRepository;
        private readonly ICacheService _cache;
        private readonly IMapper _mapper;

        public GetDepartmentByIdHandler(IDepartmentRepository departmentRepository, IMapper mapper,
            ICacheService cache, IConfiguration configuration)
        {
            _departmentRepository = departmentRepository;
            _mapper = mapper;
            _cache = cache;
            _configuration = configuration;
        }

        public async Task<Result<DepartmentResponse>> Handle(GetDepartmentByIdQuery request, CancellationToken cancellationToken)
        {
            var redisKey = CacheKeys.Department(request.Id);
            var cached = await _cache.GetAsync<DepartmentResponse>(redisKey, cancellationToken);

            if (cached.Success && cached.Item2 is not null)
                return Result<DepartmentResponse>.Success(cached.Item2);

            var department = await _departmentRepository.GetByIdWithNavigationPropertiesAsync(request.Id, cancellationToken);
            if (department == null)
                return Result<DepartmentResponse>.NotFound(MessageKeys.Common.Department_NotFound);

            var response = _mapper.Map<DepartmentResponse>(department);

            if (cached.Success && cached.Item2 is null)
            {
                await _cache.SetAsync(redisKey, response,
                    TimeSpan.FromMinutes(_configuration.GetValue<double>("Redis:DepartmentExpirationMinutes")),
                    cancellationToken);
            }

            return Result<DepartmentResponse>.Success(response);
        }
    }
}
