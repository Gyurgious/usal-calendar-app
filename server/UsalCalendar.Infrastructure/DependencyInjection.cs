using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UsalCalendar.Infrastructure.Data;
using UsalCalendar.Core.Interfaces;
using UsalCalendar.Infrastructure.Repositories;
using UsalCalendar.Infrastructure.Security;

namespace UsalCalendar.Infrastructure;

public static class DependencyInjection
{
    // Each layer registers its own services, so `Program.cs` stays short and doesn't need to know implementation details.
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, string connectionString)
    {
        services.AddDbContext<AppDbContext>(options => options.UseSqlite(connectionString));
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddSingleton<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<IEventRepository, EventRepository>();

        return services;
    }
}