using Application.Common;
using Application.Interfaces.Repositories;
using Domain.Entites.Core;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class CourseRepository : GenericRepository<Course>, ICourseRepository
    {
        private readonly ApplicationDbContext _context;

        public CourseRepository(ApplicationDbContext context) : base(context)
        {
            _context = context;
        }
        public void Delete(Course course)
        {
            course.IsDeleted = true;
            course.DeletedAt = DateTimeOffset.UtcNow;
        }

        public async Task<bool> HasActiveEnrollmentsAsync(Guid courseId, CancellationToken cancellationToken = default)
        {
            return await _context.Enrollments
                .AnyAsync(e => e.CourseId == courseId && !e.IsDeleted, cancellationToken);
        }

        public async Task<Course?> GetByIdWithNavigationPropertiesAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.Courses
                .Include(c => c.Instructor)
                    .ThenInclude(i => i.User)
                .Include(c => c.Department)
                .Include(c => c.Enrollments.Where(e => !e.IsDeleted))
                .Include(c => c.Sections!.Where(s => !s.IsDeleted))
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted, cancellationToken);
        }

        public async Task<IEnumerable<Course>> SearchAsync(QueryParameters query, CancellationToken cancellationToken = default)
        {
            var queryable = _context.Courses
                .AsNoTracking()
                .Include(c => c.Instructor)
                    .ThenInclude(i => i.User)
                .Include(c => c.Department)
                .AsQueryable();

            return await ApplyQueryParameters(queryable, query, cancellationToken);
        }

        private async Task<IEnumerable<Course>> ApplyQueryParameters(IQueryable<Course> query, QueryParameters queryParameters, CancellationToken cancellationToken = default)
        {
            // Apply search filter
            if (!string.IsNullOrEmpty(queryParameters.WordForSearch) ||
            !queryParameters.WordForSearch!.Equals("%all%", StringComparison.OrdinalIgnoreCase))
            {
                var searchTerm = $"%{queryParameters.WordForSearch.Trim().ToLower()}%";
                query =
                query.Where(c => EF.Functions.Like(c.Name, searchTerm) ||
                EF.Functions.Like(c.Description, searchTerm) ||
                EF.Functions.Like(c.Instructor.User.FirstName, searchTerm) ||
                EF.Functions.Like(c.Instructor.User.LastName, searchTerm) ||
                EF.Functions.Like(c.Department.Name, searchTerm));
            }

            // Apply sorting
            switch (queryParameters.SortBy?.ToLower())
            {
                case "name":
                    query = query.OrderBy(c => c.Name);
                    break;
                case "totaldurationinseconds_asc":
                    query = query.OrderBy(c => c.TotalDurationInSeconds);
                    break;
                case "totaldurationinseconds_desc":
                    query = query.OrderByDescending(c => c.TotalDurationInSeconds);
                    break;
                case "totalsections_asc":
                    query = query.OrderBy(c => c.TotalSections);
                    break;
                case "totalsections_desc":
                    query = query.OrderByDescending(c => c.TotalSections);
                    break;
                default:
                    query = query.OrderBy(c => c.Name);
                    break;
            }

            // Apply pagination
            int skip = (queryParameters.PageNumber - 1) * queryParameters.PageSize;
            query = query.Skip(skip).Take(queryParameters.PageSize);

            return await query.ToListAsync(cancellationToken);
        }

        public void Update(Course course)
        {
            course.UpdatedAt = DateTimeOffset.UtcNow;
        }
    }
}