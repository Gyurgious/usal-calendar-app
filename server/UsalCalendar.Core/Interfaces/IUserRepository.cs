using UsalCalendar.Core.Entities;

namespace UsalCalendar.Core.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<User?> GetByLogonNameAsync(string logonName, CancellationToken ct = default);
}