using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using UsalCalendar.Api.Dtos;

namespace UsalCalendar.Tests.Integration;

/// <summary>Users CRUD (approvers only), field validation V1–V3, and the safeguards.</summary>
public class UsersEndpointsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static Uri Url(string path) => new(path, UriKind.Relative);

    private Task<HttpClient> AdminAsync() => factory.CreateClientAsAsync("admin", "Admin123!");

    /// <summary>A valid user body. Pass `changes` to override fields, e.g. ("firstName", "").</summary>
    private static Dictionary<string, object?> Body(string loginName, params (string Field, object? Value)[] changes)
    {
        var body = new Dictionary<string, object?>
        {
            ["firstName"] = "Pat",
            ["middleName"] = null,
            ["lastName"] = "Lee",
            ["loginName"] = loginName,
            ["password"] = "Pass123!",
            ["isApprover"] = false,
        };
        foreach (var (field, value) in changes)
        {
            body[field] = value;
        }
        return body;
    }

    private static async Task<UserDto> CreateAsync(HttpClient admin, string loginName)
    {
        var response = await admin.PostAsJsonAsync("/api/users", Body(loginName));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<UserDto>())!;
    }

    private async Task<HttpStatusCode> LoginStatusAsync(string loginName, string password)
    {
        var response = await factory.CreateClient().PostAsJsonAsync("/api/auth/login", new { logonName = loginName, password });
        return response.StatusCode;
    }

    [Fact]
    public async Task List_AsApprover_ReturnsSeededUsers_SortedByLastName_WithoutPasswords()
    {
        var response = await (await AdminAsync()).GetAsync(Url("/api/users"));
        var json = await response.Content.ReadAsStringAsync();
        var users = (await response.Content.ReadFromJsonAsync<List<UserDto>>())!;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(users, u => u.LoginName == "admin" && u.IsApprover && u.DisplayName == "Thompson, Margaret A");
        Assert.Contains(users, u => u.LoginName == "mjones" && u.MiddleName is null);
        Assert.Equal(users.OrderBy(u => u.LastName).ThenBy(u => u.FirstName).Select(u => u.Id), users.Select(u => u.Id));
        Assert.DoesNotContain("password", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task NormalUser_CannotManageUsers_Returns403()
    {
        var jsmith = await factory.CreateClientAsAsync("jsmith", "Pass123!");

        Assert.Equal(HttpStatusCode.Forbidden, (await jsmith.GetAsync(Url("/api/users"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await jsmith.PostAsJsonAsync("/api/users", Body("sneaky1"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await jsmith.DeleteAsync(Url("/api/users/1"))).StatusCode);
    }

    [Fact]
    public async Task Create_Returns201_AndTheNewUserCanSignIn()
    {
        var admin = await AdminAsync();

        var response = await admin.PostAsJsonAsync("/api/users", Body("plee", ("middleName", "Q")));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = (await response.Content.ReadFromJsonAsync<UserDto>())!;
        Assert.Equal("Lee, Pat Q", created.DisplayName);
        Assert.Equal($"/api/users/{created.Id}", response.Headers.Location?.ToString());
        Assert.Equal(HttpStatusCode.OK, await LoginStatusAsync("plee", "Pass123!"));
    }

    [Theory]
    [InlineData("jsmith")]
    [InlineData("JSMITH")] // login names ignore case
    public async Task Create_WithTakenLoginName_Returns409(string loginName)
    {
        var response = await (await AdminAsync()).PostAsJsonAsync("/api/users", Body(loginName));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.Contains("already taken", problem!.Detail, StringComparison.Ordinal);
    }

    // V1–V3: each row breaks exactly one rule.
    [Theory]
    [InlineData("firstName", "")]                              // first name required
    [InlineData("firstName", "   ")]                           // whitespace only = empty
    [InlineData("firstName", "ABCDEFGHIJKLMNOPQRSTUVWXYZ")]    // 26 characters
    [InlineData("firstName", "Jos\u00e9")]                     // é is not a printable ASCII character
    [InlineData("middleName", "ABCDEFGHIJKLMNOPQRSTUVWXYZ")]   // 26 characters
    [InlineData("middleName", "Tab\there")]                    // control character
    [InlineData("lastName", "")]                               // last name required
    [InlineData("lastName", "ABCDEFGHIJKLMNOPQRSTUVWXYZ")]     // 26 characters
    [InlineData("loginName", "abc")]                           // V1: at least 4
    [InlineData("loginName", "abcdefghijklmnopq")]             // V1: at most 16
    [InlineData("loginName", "p.lee")]                         // V1: letters and numbers only
    [InlineData("password", "abc")]                            // V2: at least 4
    [InlineData("password", "pass word")]                      // V2: no spaces
    [InlineData("password", "")]                               // required when creating
    [InlineData("password", null)]
    public async Task Create_WithInvalidField_Returns400(string field, string? value)
    {
        var response = await (await AdminAsync()).PostAsJsonAsync("/api/users", Body("valid1", (field, value)));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>();
        Assert.Contains(problem!.Errors.Keys, key => key.Equals(field, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Create_WithLongestAllowedNames_AndNoMiddleName_Succeeds()
    {
        const string name25 = "ABCDEFGHIJKLMNOPQRSTUVWXY"; // exactly 25
        var response = await (await AdminAsync()).PostAsJsonAsync("/api/users",
            Body("long25", ("firstName", name25), ("lastName", name25), ("middleName", "")));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Update_ChangesFields_AndBlankPasswordKeepsTheOldOne()
    {
        var admin = await AdminAsync();
        var user = await CreateAsync(admin, "keeppw");

        var response = await admin.PutAsJsonAsync($"/api/users/{user.Id}",
            Body("keeppw", ("firstName", "Patricia"), ("isApprover", true), ("password", "")));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = (await response.Content.ReadFromJsonAsync<UserDto>())!;
        Assert.Equal("Lee, Patricia", updated.DisplayName);
        Assert.True(updated.IsApprover);
        Assert.Equal(HttpStatusCode.OK, await LoginStatusAsync("keeppw", "Pass123!"));
    }

    [Fact]
    public async Task Update_WithNewPassword_ReplacesTheOldOne()
    {
        var admin = await AdminAsync();
        var user = await CreateAsync(admin, "newpw");

        var response = await admin.PutAsJsonAsync($"/api/users/{user.Id}", Body("newpw", ("password", "Changed9!")));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(HttpStatusCode.OK, await LoginStatusAsync("newpw", "Changed9!"));
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginStatusAsync("newpw", "Pass123!"));
    }

    [Fact]
    public async Task Update_RemovingYourOwnApproverRole_Returns409()
    {
        var admin = await AdminAsync();
        var me = (await admin.GetFromJsonAsync<List<UserDto>>(Url("/api/users")))!.Single(u => u.LoginName == "admin");

        var response = await admin.PutAsJsonAsync($"/api/users/{me.Id}",
            Body("admin", ("firstName", me.FirstName), ("lastName", me.LastName), ("isApprover", false), ("password", null)));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Delete_UserWithoutEvents_Returns204_AndTheyCanNoLongerSignIn()
    {
        var admin = await AdminAsync();
        var user = await CreateAsync(admin, "leaving");

        var response = await admin.DeleteAsync(Url($"/api/users/{user.Id}"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginStatusAsync("leaving", "Pass123!"));
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync(Url($"/api/users/{user.Id}"))).StatusCode);
    }

        [Fact]
    public async Task Delete_UserWithEvents_Deactivates_AndAllTheirEventsStayMarked()
    {
        // Seeded: ssquarepants created "Chess Club" (approved) and "Robotics Club Demo" (pending).
        var admin = await AdminAsync();
        var user = (await admin.GetFromJsonAsync<List<UserDto>>(Url("/api/users")))!.Single(u => u.LoginName == "ssquarepants");

        var response = await admin.DeleteAsync(Url($"/api/users/{user.Id}"));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var events = (await admin.GetFromJsonAsync<List<ManagedEventDto>>(Url("/api/events/all")))!;
        Assert.Contains(events, e => e.Title == "Chess Club" && e.CreatorName == "Squarepants, Spongebob (deactivated)");
        var pending = (await admin.GetFromJsonAsync<List<PendingEventDto>>(Url("/api/events/pending")))!;
        Assert.Contains(pending, p => p.Title == "Robotics Club Demo" && p.CreatorName == "Squarepants, Spongebob (deactivated)");
        Assert.DoesNotContain(await admin.GetFromJsonAsync<List<UserDto>>(Url("/api/users")) ?? [], u => u.Id == user.Id);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync(Url($"/api/users/{user.Id}"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, await LoginStatusAsync("ssquarepants", "Pass123!"));

        var reuse = await admin.PostAsJsonAsync("/api/users", Body("ssquarepants"));
        Assert.Equal(HttpStatusCode.Conflict, reuse.StatusCode); // the login name stays with the deleted user
    }

    [Fact]
    public async Task Delete_AnotherApprover_Returns409_ButWorksAfterRemovingTheirRole()
    {
        var admin = await AdminAsync();
        var response = await admin.PostAsJsonAsync("/api/users", Body("approver9", ("isApprover", true)));
        var approver = (await response.Content.ReadFromJsonAsync<UserDto>())!;

        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync(Url($"/api/users/{approver.Id}"))).StatusCode);

        (await admin.PutAsJsonAsync($"/api/users/{approver.Id}", Body("approver9", ("isApprover", false), ("password", null))))
            .EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync(Url($"/api/users/{approver.Id}"))).StatusCode);
    }

    [Fact]
    public async Task DeactivatedUser_IsSignedOutOnNextPageLoad()
    {
        var admin = await AdminAsync();
        var user = await CreateAsync(admin, "soongone");
        var userClient = await factory.CreateClientAsAsync("soongone", "Pass123!");
        var created = await userClient.PostAsJsonAsync("/api/events",
            new { title = "Farewell Party", date = "2030-01-15", time = "15:00" });
        var eventId = (await created.Content.ReadFromJsonAsync<CalendarEventDto>())!.Id;
        (await admin.PostAsync(Url($"/api/events/{eventId}/approve"), null)).EnsureSuccessStatusCode();

        (await admin.DeleteAsync(Url($"/api/users/{user.Id}"))).EnsureSuccessStatusCode(); // deactivated (has an event)

        Assert.Equal(HttpStatusCode.Unauthorized, (await userClient.GetAsync(Url("/api/auth/me"))).StatusCode);
    }

    [Fact]
    public async Task Delete_YourOwnAccount_Returns409()
    {
        var admin = await AdminAsync();
        var me = (await admin.GetFromJsonAsync<List<UserDto>>(Url("/api/users")))!.Single(u => u.LoginName == "admin");

        var response = await admin.DeleteAsync(Url($"/api/users/{me.Id}"));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task UnknownUser_Returns404()
    {
        var admin = await AdminAsync();

        Assert.Equal(HttpStatusCode.NotFound, (await admin.GetAsync(Url("/api/users/99999"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.PutAsJsonAsync("/api/users/99999", Body("ghost1"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await admin.DeleteAsync(Url("/api/users/99999"))).StatusCode);
    }

    [Fact]
    public async Task DeletedUser_WithStillValidToken_Gets401OnNextRequest()
    {
        var admin = await AdminAsync();
        var user = await CreateAsync(admin, "goneuser");
        var userClient = await factory.CreateClientAsAsync("goneuser", "Pass123!");

        (await admin.DeleteAsync(Url($"/api/users/{user.Id}"))).EnsureSuccessStatusCode();

        var response = await userClient.GetAsync(Url("/api/events?from=2026-01-01&to=2026-01-31"));
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task DemotedApprover_WithOldToken_LosesApproverAccess_ButStaysSignedIn()
    {
        var admin = await AdminAsync();
        var created = await admin.PostAsJsonAsync("/api/users", Body("demoteme", ("isApprover", true)));
        var user = (await created.Content.ReadFromJsonAsync<UserDto>())!;
        var userClient = await factory.CreateClientAsAsync("demoteme", "Pass123!"); // token says Approver

        var demote = await admin.PutAsJsonAsync($"/api/users/{user.Id}", Body("demoteme", ("password", "")));
        demote.EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Forbidden, (await userClient.GetAsync(Url("/api/events/pending"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await userClient.GetAsync(Url("/api/events?from=2026-01-01&to=2026-01-31"))).StatusCode);
    }
}