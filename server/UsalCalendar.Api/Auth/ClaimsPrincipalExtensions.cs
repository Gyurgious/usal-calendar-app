using System.Globalization;
using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace UsalCalendar.Api.Auth;

/// <summary>Helpers to read our JWT claims from the signed-in user (`User` in a controller).</summary>
public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
    {
        var sub = user.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        return int.TryParse(sub, NumberStyles.Integer, CultureInfo.InvariantCulture, out var id)
            ? id
            : throw new InvalidOperationException("Token has no valid 'sub' claim.");
    }

    public static bool IsApprover(this ClaimsPrincipal user) => user.IsInRole(Roles.Approver);
}
