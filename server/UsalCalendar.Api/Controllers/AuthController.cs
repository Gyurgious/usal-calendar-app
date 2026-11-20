using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using UsalCalendar.Api.Auth;
using UsalCalendar.Api.Dtos;
using UsalCalendar.Core.Interfaces;
using UsalCalendar.Core.Services;

namespace UsalCalendar.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthService authService, TokenService tokenService, IUserRepository users)
    : ControllerBase
{
    /// <summary>Signs in with logon name + password and returns a JWT.</summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var user = await authService.ValidateCredentialsAsync(request.LogonName, request.Password, ct);
        if (user is null)
        {
            return Unauthorized();
        }

        return new LoginResponse(tokenService.CreateToken(user), CurrentUserDto.FromUser(user));
    }

    /// <summary>Returns the signed-in user (used to restore a session on page reload).</summary>
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserDto>> Me(CancellationToken ct)
    {
        var sub = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (!int.TryParse(sub, NumberStyles.Integer, CultureInfo.InvariantCulture, out var userId))
        {
            return Unauthorized();
        }

        var user = await users.GetByIdAsync(userId, ct);
        return user is null ? Unauthorized() : CurrentUserDto.FromUser(user);
    }
}
