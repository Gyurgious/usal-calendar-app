using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UsalCalendar.Infrastructure.Data;

namespace UsalCalendar.Infrastructure;

public static class DependencyInjection
{
    // Each layer registers its own services, so `Program.cs` stays short and doesn't need to know implementation details.
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));
        // services.AddScoped<IEventRepository, EventRepository>();   ← add as each slice gets built
        // services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        return services;
    }
}