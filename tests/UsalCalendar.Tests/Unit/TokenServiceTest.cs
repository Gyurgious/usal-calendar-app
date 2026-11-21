using Microsoft.IdentityModel.JsonWebTokens;
using UsalCalendar.Api.Auth;
using UsalCalendar.Tests.Fakes;

namespace UsalCalendar.Tests.Unit;

public class TokenServiceTests
{
    private static readonly JwtOptions Options = new()
    {
        Issuer = "test-issuer",
        Audience = "test-audience",
        SigningKey = new string('k', 64),
        ExpiryMinutes = 30,
    };

    private static JsonWebToken CreateAndRead(bool isApprover)
    {
        var service = new TokenService(Options, TimeProvider.System);
        var token = service.CreateToken(TestUsers.Create(id: 7, isApprover: isApprover));
        return new JsonWebTokenHandler().ReadJsonWebToken(token);
    }

    [Fact]
    public void CreateToken_ContainsUserIdNameIssuerAndAudience()
    {
        var jwt = CreateAndRead(isApprover: false);

        Assert.Equal("7", jwt.Subject);
        Assert.Equal("Smith, John Michael", jwt.GetClaim(JwtRegisteredClaimNames.Name).Value);
        Assert.Equal("test-issuer", jwt.Issuer);
        Assert.Contains("test-audience", jwt.Audiences);
    }

    [Fact]
    public void CreateToken_ExpiresAfterConfiguredMinutes()
    {
        var jwt = CreateAndRead(isApprover: false);

        Assert.Equal(TimeSpan.FromMinutes(30), jwt.ValidTo - jwt.ValidFrom);
    }

    [Fact]
    public void CreateToken_ForApprover_HasApproverRole()
    {
        var jwt = CreateAndRead(isApprover: true);

        Assert.Equal(Roles.Approver, jwt.GetClaim(AuthClaims.Role).Value);
    }

    [Fact]
    public void CreateToken_ForNormalUser_HasNoRole()
    {
        var jwt = CreateAndRead(isApprover: false);

        Assert.False(jwt.TryGetClaim(AuthClaims.Role, out _));
    }
}
