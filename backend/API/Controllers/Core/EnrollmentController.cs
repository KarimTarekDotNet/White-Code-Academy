using API.Attributes;
using API.Controllers.Common;
using Application.Features.Enrollments.Commands.CreateEnrollment;
using Application.Features.Enrollments.Commands.DeleteEnrollment;
using Application.Features.Enrollments.Queries.GetEnrollmentsByCourse;
using Application.Features.Enrollments.Queries.GetEnrollmentsByStudent;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace API.Controllers.Core
{
    [Route("api/[controller]")]
    [EnableRateLimiting("ReadPolicy")]
    public class EnrollmentController : BaseController
    {
        private readonly IMediator _mediator;

        public EnrollmentController(IMediator mediator)
        {
            _mediator = mediator;
        }

        // GET /api/enrollment/by-course/{courseId}
        [HttpGet("by-course/{courseId:guid}")]
        [Authorize(Roles = "Admin,Instructor")]
        public async Task<IActionResult> GetEnrollmentsByCourse(Guid courseId)
        {
            var result = await _mediator.Send(new GetEnrollmentsByCourseQuery(courseId));
            if (result.IsSuccess)
                return Ok(result.Value);

            return Failure(result);
        }

        // GET /api/enrollment/by-student/{studentId}
        [HttpGet("by-student/{studentId:guid}")]
        [Authorize]
        public async Task<IActionResult> GetEnrollmentsByStudent(Guid studentId)
        {
            var result = await _mediator.Send(new GetEnrollmentsByStudentQuery(studentId));
            if (result.IsSuccess)
                return Ok(result.Value);

            return Failure(result);
        }

        // POST /api/enrollment
        // Only CourseId comes from the body — StudentId is resolved from the JWT inside the handler
        [HttpPost("{courseId:guid}")]
        [Authorize(Roles = "User")]
        [EnableRateLimiting("HeavyPolicy")]
        [Idempotent]
        public async Task<IActionResult> Enroll([FromQuery] Guid courseId)
        {
            var command = new CreateEnrollmentCommand
            {
                CurrentUserId = GetCurrentUserId(),
                CourseId = courseId
            };

            var result = await _mediator.Send(command);
            if (result.IsSuccess)
                return CreatedAtAction(nameof(Enroll), result.Value);

            return Failure(result);
        }

        // DELETE /api/enrollment?studentId=&courseId=
        // Admin-only — can unenroll any student from any course
        [HttpDelete]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("HeavyPolicy")]
        public async Task<IActionResult> Unenroll([FromQuery] Guid studentId, [FromQuery] Guid courseId)
        {
            var result = await _mediator.Send(new DeleteEnrollmentCommand(studentId, courseId));
            if (result.IsSuccess)
                return NoContent();

            return Failure(result);
        }
    }
}