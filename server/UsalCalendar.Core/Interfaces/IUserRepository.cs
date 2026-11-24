using UsalCalendar.Core.Entities;

namespace UsalCalendar.Core.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<User?> GetByLogonNameAsync(string logonName, CancellationToken ct = default);

    /// <summary>All active (not deleted) users, sorted by last name, then first name.</summary>
    Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default);

    /// <summary>How many events (approved or pending) this user created or approved.</summary>
    Task<int> CountEventsAsync(int userId, CancellationToken ct = default);

    void Add(User user);
    void Remove(User user);
    Task SaveChangesAsync(CancellationToken ct = default);
}