using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UsalCalendar.Core.Interfaces;

namespace UsalCalendar.Infrastructure.Data;

public static class DatabaseInitializer
{
    // Applies pending migrations, then seeds demo data if the database is empty.
    public static async Task MigrateAndSeedAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var provider = scope.ServiceProvider;

        var db = provider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync(ct); // anyone that clones runs app -> db is created and filled automatically

        await DbSeeder.SeedAsync(
            db,
            provider.GetRequiredService<IPasswordHasher>(),
            provider.GetRequiredService<TimeProvider>(),
            ct);
    }
}
