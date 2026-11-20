using Microsoft.Extensions.DependencyInjection;
using UsalCalendar.Core.Services;

namespace UsalCalendar.Core;

public static class DependencyInjection
{
    public static IServiceCollection AddCore(this IServiceCollection services)
    {
        services.AddScoped<AuthService>();
        return services;
    }
}
