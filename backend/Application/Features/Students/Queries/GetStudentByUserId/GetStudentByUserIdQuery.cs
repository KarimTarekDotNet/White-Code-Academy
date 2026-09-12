using Application.Common;
using Application.DTOs.Core;
using MediatR;

namespace Application.Features.Students.Queries.GetStudentByUserId
{
    public record GetStudentByUserIdQuery(string UserId) : IRequest<Result<StudentResponse>?>;
}