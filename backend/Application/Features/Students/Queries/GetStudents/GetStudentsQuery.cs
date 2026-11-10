using Application.Common;
using Application.DTOs.Core;
using MediatR;

namespace Application.Features.Students.Queries.GetStudents
{
    public record GetStudentsQuery(QueryParameters Parameters) : IRequest<Result<IEnumerable<StudentResponse>>>;
}