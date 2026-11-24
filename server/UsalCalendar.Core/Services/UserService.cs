using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Exceptions;
using UsalCalendar.Core.Interfaces;
using UsalCalendar.Core.Models;

namespace UsalCalendar.Core.Services;

/// <summary>
/// Managing users (approvers only, enforced by the API). Field formats (V1–V3) are checked
/// by the request DTOs; this class enforces the rules that need the database.
/// </summary>
public sealed class UserService(
    IUserRepository users, IPasswordHasher passwordHasher, TimeProvider clock)
{
    public Task<IReadOnlyList<User>> GetAllAsync(CancellationToken ct = default) => users.GetAllAsync(ct);

    public Task<User> GetByIdAsync(int userId, CancellationToken ct = default) => GetExistingAsync(userId, ct);

    public async Task<User> CreateAsync(UserDetails details, string password, CancellationToken ct = default)
    {
        await EnsureLoginNameIsFreeAsync(details.LoginName, userId: null, ct);

        var user = new User
        {
            FirstName = details.FirstName.Trim(),
            MiddleName = TrimToNull(details.MiddleName),
            LastName = details.LastName.Trim(),
            LoginName = details.LoginName.Trim(),
            PasswordHash = passwordHasher.Hash(password),
            IsApprover = details.IsApprover,
        };
        users.Add(user);
        await users.SaveChangesAsync(ct);
        return user;
    }

    /// <summary>Edits a user. Leave `newPassword` empty to keep the current password.</summary>
    public async Task<User> UpdateAsync(
        int userId, UserDetails details, string? newPassword, int currentUserId, CancellationToken ct = default)
    {
        var user = await GetExistingAsync(userId, ct);

        // The person making the change is an approver. If they can't demote or delete themselves,
        // there is always at least one approver left, so nobody gets locked out of approving.
        if (userId == currentUserId && user.IsApprover && !details.IsApprover)
        {
            throw new BusinessRuleException("You can't remove your own approver role. Ask another approver to do it.");
        }
        await EnsureLoginNameIsFreeAsync(details.LoginName, userId, ct);

        user.FirstName = details.FirstName.Trim();
        user.MiddleName = TrimToNull(details.MiddleName);
        user.LastName = details.LastName.Trim();
        user.LoginName = details.LoginName.Trim();
        user.IsApprover = details.IsApprover;
        if (!string.IsNullOrEmpty(newPassword))
        {
            user.PasswordHash = passwordHasher.Hash(newPassword);
        }
        await users.SaveChangesAsync(ct);
        return user;
    }

    // delete user
    public async Task DeleteAsync(int userId, int currentUserId, CancellationToken ct = default)
    {
        var user = await GetExistingAsync(userId, ct);
        if (userId == currentUserId)
        {
            throw new BusinessRuleException("You can't delete your own account.");
        }
        if (user.IsApprover)
        {
            // Deleting an approver takes two deliberate steps: remove the role, then delete.
            throw new BusinessRuleException(
                $"{user.DisplayName} is an approver. Remove their approver role first, then delete them.");
        }

        if (await users.CountEventsAsync(userId, ct) > 0)
        {
            user.DeactivatedAtUtc = clock.GetUtcNow().UtcDateTime;
        }
        else
        {
            users.Remove(user);
        }

        await users.SaveChangesAsync(ct);
    }

    /// <summary>Deleted (deactivated) users count as not found everywhere on the Users page.</summary>
    private async Task<User> GetExistingAsync(int userId, CancellationToken ct)
    {
        var user = await users.GetByIdAsync(userId, ct);
        return user is { IsActive: true } ? user : throw new NotFoundException($"User {userId} was not found.");
    }

    /// <summary>Login names are unique, ignoring case ("JSmith" and "jsmith" are the same).</summary>
    private async Task EnsureLoginNameIsFreeAsync(string loginName, int? userId, CancellationToken ct)
    {
        var existing = await users.GetByLogonNameAsync(loginName.Trim(), ct);
        if (existing is not null && existing.Id != userId)
        {
            // A deleted user keeps their login name, so the names on their old events stay unambiguous.
            throw new BusinessRuleException(existing.IsActive
                ? $"The login name \"{loginName.Trim()}\" is already taken."
                : $"The login name \"{loginName.Trim()}\" is already taken by a deleted user.");
        }
    }

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}