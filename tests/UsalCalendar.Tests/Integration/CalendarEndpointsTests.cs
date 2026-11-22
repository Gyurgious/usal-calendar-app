using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using UsalCalendar.Api.Dtos;

namespace UsalCalendar.Tests.Integration;

/// <summary>GET /api/events against the seeded demo data (see DbSeeder).</summary>
public class CalendarEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    // The seeder places events relative to the first day of the current month.
    private static readonly DateOnly MonthStart = new(DateTime.Now.Year, DateTime.Now.Month, 1);
    private const int SeededApprovedCount = 22;

    private static async Task<List<CalendarEventDto>> GetCalendarAsync(HttpClient client, DateOnly from, DateOnly to)
    {
        var response = await client.GetAsync(Url(from, to));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<List<CalendarEventDto>>())!;
    }

    private static Uri Url(DateOnly from, DateOnly to) => new(
        $"/api/events?from={from.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}" +
        $"&to={to.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)}",
        UriKind.Relative);

    // Covers every seeded event (day offsets 2..40) in one allowed range.
    private static readonly DateOnly RangeEnd = MonthStart.AddDays(61);

    [Fact]
    public async Task Approver_SeesAllApprovedAndAllPendingEvents()
    {
        var client = await factory.CreateClientAsAsync("admin", "Admin123!");

        var events = await GetCalendarAsync(client, MonthStart, RangeEnd);

        Assert.Equal(SeededApprovedCount, events.Count(e => e.IsApproved));
        Assert.Equal(5, events.Count(e => !e.IsApproved));
    }

    [Fact]
    public async Task NormalUser_SeesApprovedEventsAndOnlyTheirOwnPendingEvents()
    {
        var client = await factory.CreateClientAsAsync("jsmith", "Pass123!");

        var events = await GetCalendarAsync(client, MonthStart, RangeEnd);

        Assert.Equal(SeededApprovedCount, events.Count(e => e.IsApproved));
        var pending = Assert.Single(events, e => !e.IsApproved);
        Assert.Equal("Bake Sale", pending.Title);
        Assert.Equal("Smith, John Michael", pending.CreatorName);
    }

    [Fact]
    public async Task Events_AreSortedByDateThenTime()
    {
        var client = await factory.CreateClientAsAsync("admin", "Admin123!");

        var events = await GetCalendarAsync(client, MonthStart, RangeEnd);

        var expected = events.OrderBy(e => e.Date).ThenBy(e => e.Time).Select(e => e.Id);
        Assert.Equal(expected, events.Select(e => e.Id));
    }

    [Fact]
    public async Task SingleDay_ReturnsOnlyThatDay_InTimeOrder_WithCreatorDisplayName()
    {
        // Day offset 4 was seeded out of order: 08:00 Picture Day, 15:30 Chess Club, 12:00 Faculty Lunch.
        var day = MonthStart.AddDays(4);
        var client = await factory.CreateClientAsAsync("jsmith", "Pass123!");

        var events = await GetCalendarAsync(client, day, day);

        Assert.All(events, e => Assert.Equal(day, e.Date));
        Assert.Equal(["Picture Day", "Faculty Lunch", "Chess Club"], events.Select(e => e.Title));
        Assert.Equal("Jones, Maria", events[0].CreatorName);
    }

    [Fact]
    public async Task WithoutToken_Returns401()
    {
        var response = await factory.CreateClient().GetAsync(Url(MonthStart, MonthStart));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/events")]                                    // missing from/to
    [InlineData("/api/events?from=2026-11-10&to=2026-11-01")]      // to before from
    [InlineData("/api/events?from=2026-01-01&to=2026-12-31")]      // longer than 62 days
    [InlineData("/api/events?from=not-a-date&to=2026-11-01")]      // not a date
    public async Task InvalidRange_Returns400(string url)
    {
        var client = await factory.CreateClientAsAsync("jsmith", "Pass123!");

        var response = await client.GetAsync(new Uri(url, UriKind.Relative));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
