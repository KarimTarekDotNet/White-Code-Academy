using Application.Common;
using Application.Interfaces.Repositories;
using Domain.Entites.Users;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class InstructorRepository : GenericRepository<Instructor>, IInstructorRepository
    {
        private readonly ApplicationDbContext _context;
        public InstructorRepository(ApplicationDbContext context) : base(context)
        {
            _context = context;
        }

        public void Delete(Instructor instructor)
        {
            instructor.IsDeleted = true;
            instructor.DeletedAt = DateTimeOffset.UtcNow;
        }

        public void Update(Instructor instructor)
        {
            instructor.UpdatedAt = DateTimeOffset.UtcNow;
        }

        public async Task<Instructor?> GetByIdWithNavigationPropertiesAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.Instructors
                .Include(i => i.User)
                .Include(i => i.Department)
                .Include(i => i.Courses.Where(c => !c.IsDeleted))
                .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted, cancellationToken);
        }

        public async Task<Instructor?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await _context.Instructors
                .Include(i => i.User)
                .Include(i => i.Department)
                .FirstOrDefaultAsync(i => i.UserId == userId && !i.IsDeleted, cancellationToken);
        }

        public async Task<IEnumerable<Instructor>> SearchAsync(QueryParameters query, CancellationToken cancellationToken = default)
        {
            var queryable = _context.Instructors
                .AsNoTracking()
                .Include(i => i.User)
                .Include(i => i.Department)
                .Where(i => !i.IsDeleted)
                .AsQueryable();

            return await ApplyQueryParameters(queryable, query, cancellationToken);
        }

        private async Task<IEnumerable<Instructor>> ApplyQueryParameters(IQueryable<Instructor> query, QueryParameters queryParameters, CancellationToken cancellationToken = default)
        {
            if (!string.IsNullOrEmpty(queryParameters.WordForSearch) ||
            !queryParameters.WordForSearch!.Equals("%all%", StringComparison.OrdinalIgnoreCase))
            {
                var searchTerm = $"%{queryParameters.WordForSearch.Trim().ToLower()}%";
                query = query.Where(i =>
                    EF.Functions.Like(i.User.FirstName, searchTerm) ||
                    EF.Functions.Like(i.User.LastName, searchTerm) ||
                    EF.Functions.Like(i.Department!.Name, searchTerm));
            }

            switch (queryParameters.SortBy?.ToLower())
            {
                case "firstname":
                    query = query.OrderBy(i => i.User.FirstName);
                    break;
                case "lastname":
                    query = query.OrderBy(i => i.User.LastName);
                    break;
                default:
                    query = query.OrderBy(i => i.User.FirstName);
                    break;
            }

            int skip = (queryParameters.PageNumber - 1) * queryParameters.PageSize;
            query = query.Skip(skip).Take(queryParameters.PageSize);

            return await query.ToListAsync(cancellationToken);
        }
    }
}
