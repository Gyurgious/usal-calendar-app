using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

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
            });

        services.AddAuthorizationBuilder()
            // Secure by default: every endpoint needs a signed-in user unless marked [AllowAnonymous].
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(Policies.Approver, policy => policy.RequireRole(Roles.Approver));

        return services;
    }
}
