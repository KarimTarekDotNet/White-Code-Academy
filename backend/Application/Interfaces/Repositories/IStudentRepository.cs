using Application.Common;
using Domain.Entites.Users;

namespace Application.Interfaces.Repositories
{
    public interface IStudentRepository : IRepository<Student>
    {
        Task<Student?> GetByIdWithNavigationPropertiesAsync(Guid id, CancellationToken cancellationToken = default);
        Task<Student?> GetByUserIdAsync(string userId, CancellationToken cancellationToken = default);
        Task<IEnumerable<Student>> SearchAsync(QueryParameters query, CancellationToken cancellationToken = default);
        void Update(Student student);
        void Delete(Student student);
    }
}