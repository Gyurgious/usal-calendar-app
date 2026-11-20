using Microsoft.EntityFrameworkCore;
using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Interfaces;
using UsalCalendar.Infrastructure.Data;

namespace UsalCalendar.Infrastructure.Repositories;

internal sealed class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(int id, CancellationToken ct = default) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    // LogonName uses NOCASE collation (UserConfiguration), so "Admin" finds "admin".
    public Task<User?> GetByLogonNameAsync(string logonName, CancellationToken ct = default) =>
        db.Users.FirstOrDefaultAsync(u => u.LoginName == logonName, ct);
}
