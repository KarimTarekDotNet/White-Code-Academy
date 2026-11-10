using Application.Interfaces.Repositories;
using Domain.Entites.Audits;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class AuditLogRepository : IAuditLogRepository
    {
        private readonly ApplicationDbContext _context;

        public AuditLogRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task LogAsync(AuditLog auditLog, CancellationToken cancellationToken = default)
        {
            auditLog.Id = Guid.NewGuid();
            auditLog.CreatedAt = DateTimeOffset.UtcNow;

            await _context.AuditLogs.AddAsync(auditLog, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<IEnumerable<AuditLog>> GetByEntityAsync(string entityName, Guid entityId)
            => await _context.AuditLogs
                .Where(a => a.EntityName == entityName && a.EntityId == entityId)
                .OrderByDescending(a => a.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

        public async Task<IEnumerable<AuditLog>> GetByUserAsync(string userId)
            => await _context.AuditLogs
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }

        public async Task<int> DeleteExpiredAsync(int retentionDays)
        {
            var cutoff = DateTimeOffset.UtcNow.AddDays(retentionDays);
            return await _context.AuditLogs
                .Where(x => x.CreatedAt < cutoff)
                .ExecuteDeleteAsync();
        }
    }
}