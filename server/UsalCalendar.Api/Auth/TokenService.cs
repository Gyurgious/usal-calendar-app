using System.Globalization;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using UsalCalendar.Core.Entities;

namespace UsalCalendar.Api.Auth;

/// <summary>Creates signed JWTs for users who have signed in.</summary>
public sealed class TokenService(JwtOptions jwt, TimeProvider clock)
{
    private readonly SigningCredentials _credentials = new(
        new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
        SecurityAlgorithms.HmacSha256);

    public string CreateToken(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString(CultureInfo.InvariantCulture)),
            new(JwtRegisteredClaimNames.Name, user.DisplayName),
        };
        if (user.IsApprover)
        {
            claims.Add(new Claim(AuthClaims.Role, Roles.Approver));
        }

        var now = clock.GetUtcNow().UtcDateTime;
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = jwt.Issuer,
            Audience = jwt.Audience,
            IssuedAt = now,
            NotBefore = now,
            Expires = now.AddMinutes(jwt.ExpiryMinutes),
            SigningCredentials = _credentials,
        };

        return new JsonWebTokenHandler().CreateToken(descriptor);
    }
}
