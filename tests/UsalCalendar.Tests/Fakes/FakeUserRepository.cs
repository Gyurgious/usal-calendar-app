using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Interfaces;

namespace UsalCalendar.Tests.Fakes;

/// <summary>In-memory IUserRepository, so unit tests don't need a database.</summary>
internal sealed class FakeUserRepository(params User[] users) : IUserRepository
{
    private int _nextId = users.Length == 0 ? 1 : users.Max(u => u.Id) + 1;

    public List<User> Users { get; } = [.. users];

    /// <summary>Pretend some users have events: user id → number of events.</summary>
    public Dictionary<int, int> EventCounts { get; } = [];

    public int SaveCount { get; private set; }

    public Task<User?> GetByIdAsync(int id, CancellationToken ct = default) =>
        Task.FromResult(Users.FirstOrDefault(u => u.Id == id));

    public Task<User?> GetByLogonNameAsync(string logonName, CancellationToken ct = default) =>
        Task.FromResult(Users.FirstOrDefault(u =>
            string.Equals(u.LoginName, logonName, StringComparison.OrdinalIgnoreCase)));

    public Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default) =>
        Task.FromResult<IReadOnlyList<User>>(Users
            .Where(u => u.IsActive)
            .OrderBy(u => u.LastName).ThenBy(u => u.FirstName)
            .ToList());

    public Task<int> CountEventsAsync(int userId, CancellationToken ct = default) =>
        Task.FromResult(EventCounts.GetValueOrDefault(userId));

    public void Add(User user)
    {
        user.Id = _nextId++;
        Users.Add(user);
    }

    public void Remove(User user) => Users.Remove(user);

    public Task SaveChangesAsync(CancellationToken ct = default)
    {
        SaveCount++;
        return Task.CompletedTask;
    }
}