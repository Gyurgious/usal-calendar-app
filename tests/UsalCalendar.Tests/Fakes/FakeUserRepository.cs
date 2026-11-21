using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Interfaces;

namespace UsalCalendar.Tests.Fakes;

/// <summary>In-memory IUserRepository, so unit tests don't need a database.</summary>
internal sealed class FakeUserRepository(params User[] users) : IUserRepository
{
    public Task<User?> GetByIdAsync(int id, CancellationToken ct = default) =>
        Task.FromResult(users.FirstOrDefault(u => u.Id == id));

    public Task<User?> GetByLogonNameAsync(string logonName, CancellationToken ct = default) =>
        Task.FromResult(users.FirstOrDefault(u =>
            string.Equals(u.LoginName, logonName, StringComparison.OrdinalIgnoreCase)));
}
