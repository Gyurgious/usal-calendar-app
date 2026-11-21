using UsalCalendar.Core.Services;
using UsalCalendar.Tests.Fakes;

namespace UsalCalendar.Tests.Unit;

public class AuthServiceTests
{
    private readonly AuthService _service = new(
        new FakeUserRepository(TestUsers.Create(logonName: "jsmith", password: "Pass123!")),
        new FakePasswordHasher());

    [Fact]
    public async Task ValidateCredentials_WithCorrectPassword_ReturnsUser()
    {
        var user = await _service.ValidateCredentialsAsync("jsmith", "Pass123!");

        Assert.NotNull(user);
        Assert.Equal("jsmith", user.LoginName);
    }

    [Fact]
    public async Task ValidateCredentials_WithWrongPassword_ReturnsNull()
    {
        var user = await _service.ValidateCredentialsAsync("jsmith", "wrong");

        Assert.Null(user);
    }

    [Fact]
    public async Task ValidateCredentials_WithUnknownLogonName_ReturnsNull()
    {
        var user = await _service.ValidateCredentialsAsync("nobody", "Pass123!");

        Assert.Null(user);
    }
}
