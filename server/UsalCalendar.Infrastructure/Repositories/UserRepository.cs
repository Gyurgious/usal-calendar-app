using Microsoft.EntityFrameworkCore;
using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Interfaces;
using UsalCalendar.Infrastructure.Data;

namespace UsalCalendar.Infrastructure.Repositories;

internal sealed class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByLogonNameAsync(string logonName, CancellationToken ct = default) =>
        db.Users.FirstOrDefaultAsync(u => u.LoginName == logonName, ct);

    public async Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default) =>
        await db.Users
            .AsNoTracking()
            .Where(u => u.DeactivatedAtUtc == null)
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            .ToListAsync(ct);

    public Task<int> CountEventsAsync(int userId, CancellationToken ct = default) =>
        db.Events.CountAsync(e => e.CreatorId == userId || e.ApproverId == userId, ct);

    public void Add(User user) => db.Users.Add(user);

    public void Remove(User user) => db.Users.Remove(user);

    public Task SaveChangesAsync(CancellationToken ct = default) => db.SaveChangesAsync(ct);
}