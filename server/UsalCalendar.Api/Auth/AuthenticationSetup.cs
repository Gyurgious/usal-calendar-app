using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using System.Globalization;
using System.Security.Claims;
using UsalCalendar.Core.Interfaces;

namespace UsalCalendar.Api.Auth;

public static class Policies
{
    public const string Approver = nameof(Approver);
}

public static class Roles
{
    public const string Approver = nameof(Approver);
}

// short claim names used inside our tokens
public static class AuthClaims
{
    public const string Role = "role";
}

public static class AuthenticationSetup
{
    public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
    {
        var jwt = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
                  ?? throw new InvalidOperationException("Missing 'Jwt' configuration section.");
        services.AddSingleton(jwt);
        services.AddSingleton<TokenService>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                // Keep claim names exactly as written in the token ("sub", "name", "role").
                options.MapInboundClaims = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                    ValidateLifetime = true,
                    NameClaimType = JwtRegisteredClaimNames.Name,
                    RoleClaimType = AuthClaims.Role,
                };
                // check DB on every request to check if user has access to perform their actions
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var identity = (ClaimsIdentity)context.Principal!.Identity!;
                        var sub = identity.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
                        if (!int.TryParse(sub, NumberStyles.Integer, CultureInfo.InvariantCulture, out var userId))
                        {
                            context.Fail("Invalid subject.");
                            return;
                        }

                        var users = context.HttpContext.RequestServices.GetRequiredService<IUserRepository>();
                        var user = await users.GetByIdAsync(userId, context.HttpContext.RequestAborted);
                        if (user is not { IsActive: true })
                        {
                            context.Fail("User was deleted or deactivated."); // → 401, client signs out
                            return;
                        }

                        // Use the role from the database, not the one in the token.
                        var roleClaim = identity.FindFirst(AuthClaims.Role);
                        if (roleClaim is not null && !user.IsApprover)
                        {
                            identity.RemoveClaim(roleClaim); // demoted → approver endpoints return 403
                        }
                        else if (roleClaim is null && user.IsApprover)
                        {
                            identity.AddClaim(new Claim(AuthClaims.Role, Roles.Approver)); // promoted → works without signing in again
                        }
                    },
                };
            });

        services.AddAuthorizationBuilder()
            // Secure by default: every endpoint needs a signed-in user unless marked [AllowAnonymous].
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(Policies.Approver, policy => policy.RequireRole(Roles.Approver));

        return services;
    }
}
