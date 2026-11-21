using UsalCalendar.Core.Interfaces;

namespace UsalCalendar.Tests.Fakes;

/// <summary>Predictable "hash" so tests are fast (real BCrypt is slow on purpose).</summary>
internal sealed class FakePasswordHasher : IPasswordHasher
{
    public string Hash(string password) => $"hashed:{password}";

    public bool Verify(string password, string passwordHash) => passwordHash == Hash(password);
}
