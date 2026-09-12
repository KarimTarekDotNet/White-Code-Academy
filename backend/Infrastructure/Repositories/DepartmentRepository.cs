using Application.Common;
using Application.Interfaces.Repositories;
using Domain.Entites.Core;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class DepartmentRepository : GenericRepository<Department>, IDepartmentRepository
    {
        private readonly ApplicationDbContext _context;

        public DepartmentRepository(ApplicationDbContext context) : base(context)
        {
            _context = context;
        }

        public void Delete(Department department)
        {
            department.IsDeleted = true;
            department.DeletedAt = DateTimeOffset.UtcNow;
        }

        public void Update(Department department)
        {
            department.UpdatedAt = DateTimeOffset.UtcNow;
        }

        public async Task<Department?> GetByIdWithNavigationPropertiesAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.Departments
                .Include(d => d.Courses.Where(c => !c.IsDeleted))
                .Include(d => d.Instructors.Where(i => !i.IsDeleted))
                    .ThenInclude(i => i.User)
                .FirstOrDefaultAsync(d => d.Id == id && !d.IsDeleted, cancellationToken);
        }

        public async Task<IEnumerable<Department>> SearchAsync(QueryParameters query, CancellationToken cancellationToken = default)
        {
            var queryable = _context.Departments
                .AsNoTracking()
                .Where(d => !d.IsDeleted)
                .AsQueryable();

            return await ApplyQueryParameters(queryable, query, cancellationToken);
        }

        public async Task<bool> HasActiveCoursesOrInstructorsAsync(Guid departmentId, CancellationToken cancellationToken = default)
        {
            var hasActiveCourses = await _context.Courses
                .AnyAsync(c => c.DepartmentId == departmentId && !c.IsDeleted, cancellationToken);

            if (hasActiveCourses) return true;

            var hasActiveInstructors = await _context.Instructors
                .AnyAsync(i => i.DepartmentId == departmentId && !i.IsDeleted, cancellationToken);

            return hasActiveInstructors;
        }

        private async Task<IEnumerable<Department>> ApplyQueryParameters(IQueryable<Department> query, QueryParameters queryParameters, CancellationToken cancellationToken = default)
        {
            if (!string.IsNullOrEmpty(queryParameters.WordForSearch) ||
            !queryParameters.WordForSearch!.Equals("%all%", StringComparison.OrdinalIgnoreCase))
            {
                var searchTerm = $"%{queryParameters.WordForSearch.Trim().ToLower()}%";
                query = query.Where(d =>
                    EF.Functions.Like(d.Name, searchTerm) ||
                    EF.Functions.Like(d.Description, searchTerm));
            }

            switch (queryParameters.SortBy?.ToLower())
            {
                case "name":
                    query = query.OrderBy(d => d.Name);
                    break;
                default:
                    query = query.OrderBy(d => d.Name);
                    break;
            }

            int skip = (queryParameters.PageNumber - 1) * queryParameters.PageSize;
            query = query.Skip(skip).Take(queryParameters.PageSize);

            return await query.ToListAsync(cancellationToken);
        }
    }
}
