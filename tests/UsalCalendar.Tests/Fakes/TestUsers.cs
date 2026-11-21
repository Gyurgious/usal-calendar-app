using UsalCalendar.Core.Entities;

namespace UsalCalendar.Tests.Fakes;

// unit test here will pass in fakes for faster testing rather than querying DB data which is slower
internal static class TestUsers
{
    public static User Create(int id = 1, string logonName = "jsmith", string password = "Pass123!",
                              string? middleName = "Michael", bool isApprover = false) => new()
    {
        Id = id,
        FirstName = "John",
        MiddleName = middleName,
        LastName = "Smith",
        LoginName = logonName,
        PasswordHash = new FakePasswordHasher().Hash(password),
        IsApprover = isApprover,
    };
}
