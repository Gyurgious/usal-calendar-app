using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using UsalCalendar.Api.Dtos;

namespace UsalCalendar.Tests.Integration;

/// <summary>
/// Starts the real API in memory (no network port) with its own throwaway SQLite file,
/// so integration tests never touch development database.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath = Path.Combine(Path.GetTempPath(), $"usal-test-{Guid.NewGuid():N}.db");

    /// <summary>An HttpClient already signed in as one of the seeded demo users.</summary>
    public async Task<HttpClient> CreateClientAsAsync(string logonName, string password)
    {
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { logonName, password });
        response.EnsureSuccessStatusCode();
        var login = await response.Content.ReadFromJsonAsync<LoginResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.Token);
        return client;
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development"); // runs migrations + seeding on startup
        builder.UseSetting("ConnectionStrings:Default", $"Data Source={_databasePath};Pooling=False");
        // Tests must not depend on anyone's user secrets.
        builder.UseSetting("Jwt:SigningKey", "test-signing-key-that-is-at-least-32-characters-long");
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        File.Delete(_databasePath);
    }
}
