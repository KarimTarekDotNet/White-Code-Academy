using Application.Common;
using Application.Interfaces.Repositories;
using Domain.Entites.Users;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class StudentRepository : GenericRepository<Student>, IStudentRepository
    {
        private readonly ApplicationDbContext _context;

        public StudentRepository(ApplicationDbContext context) : base(context)
        {
            _context = context;
        }

        public void Delete(Student student)
        {
            student.IsDeleted = true;
            student.DeletedAt = DateTimeOffset.UtcNow;
        }

        public void Update(Student student)
        {
            student.UpdatedAt = DateTimeOffset.UtcNow;
        }

        public async Task<Student?> GetByIdWithNavigationPropertiesAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.Students
                .Include(s => s.User)
                .Include(s => s.Enrollments.Where(e => !e.IsDeleted))
                    .ThenInclude(e => e.Course)
                .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, cancellationToken);
        }

        public async Task<Student?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await _context.Students
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.UserId == userId && !s.IsDeleted, cancellationToken);
        }

        public async Task<IEnumerable<Student>> SearchAsync(QueryParameters query, CancellationToken cancellationToken = default)
        {
            var queryable = _context.Students
                .AsNoTracking()
                .Include(s => s.User)
                .Where(s => !s.IsDeleted)
                .AsQueryable();

            return await ApplyQueryParameters(queryable, query, cancellationToken);
        }

        private async Task<IEnumerable<Student>> ApplyQueryParameters(IQueryable<Student> query, QueryParameters queryParameters, CancellationToken cancellationToken = default)
        {
            if (!string.IsNullOrEmpty(queryParameters.WordForSearch) ||
            !queryParameters.WordForSearch!.Equals("%all%", StringComparison.OrdinalIgnoreCase))
            {
                var searchTerm = $"%{queryParameters.WordForSearch.Trim().ToLower()}%";
                query = query.Where(s =>
                    EF.Functions.Like(s.User.FirstName.ToLower(), searchTerm) ||
                    EF.Functions.Like(s.User.LastName.ToLower(), searchTerm) ||
                    EF.Functions.Like(s.User.Email!.ToLower(), searchTerm));
            }

            int skip = (queryParameters.PageNumber - 1) * queryParameters.PageSize;
            query = query.Skip(skip).Take(queryParameters.PageSize);

            return await query.ToListAsync(cancellationToken);
        }
    }
}
