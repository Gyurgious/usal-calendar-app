using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Interfaces;

namespace UsalCalendar.Core.Services;

public sealed class AuthService(IUserRepository users, IPasswordHasher passwordHasher)
{
    // Returns the user if the login name and password match. 
    public async Task<User?> ValidateCredentialsAsync(string logonName, string password, CancellationToken ct = default)
    {
        var user = await users.GetByLogonNameAsync(logonName, ct);
        if (user is null || !passwordHasher.Verify(password, user.PasswordHash))
        {
            return null;
        }
        return user;
    }
}