using Microsoft.EntityFrameworkCore;
using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Interfaces;

namespace UsalCalendar.Infrastructure.Data;

/// <summary>
/// Fills an empty database with demo users and events.
/// Safe to run on every startup: it does nothing if users already exist.
/// </summary>
internal static class DbSeeder
{
    public static async Task SeedAsync(
        AppDbContext db, IPasswordHasher passwordHasher, TimeProvider clock, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(ct))
        {
            return;
        }

        // ── Users: 2 approvers, 3 normal users ─────────────────────────────
        User NewUser(string first, string? middle, string last, string logon, string password, bool isApprover) => new()
        {
            FirstName = first,
            MiddleName = middle,
            LastName = last,
            LoginName = logon,
            PasswordHash = passwordHasher.Hash(password),
            IsApprover = isApprover,
        };

        var admin    = NewUser("Margaret", "A", "Thompson", "admin",     "Admin123!", isApprover: true);
        var approver = NewUser("Robert",   "J", "Garcia",   "approver2", "Pass123!",  isApprover: true);
        var jsmith   = NewUser("John",     "Michael", "Smith", "jsmith", "Pass123!",  isApprover: false);
        var mjones   = NewUser("Maria",    null, "Jones",   "mjones",    "Pass123!",  isApprover: false);
        var ssquarepants  = NewUser("Spongebob",    null, "Squarepants",  "ssquarepants",   "Pass123!",  isApprover: false);
        db.Users.AddRange(admin, approver, jsmith, mjones, ssquarepants);

        // ── Events: dates are relative to today so the demo always looks current ─
        var nowUtc = clock.GetUtcNow().UtcDateTime;
        var today = DateOnly.FromDateTime(clock.GetLocalNow().DateTime);
        var monthStart = new DateOnly(today.Year, today.Month, 1);

        CalendarEvent Approved(int dayOffset, int hour, int minute, string title, string? location, string description,
                               User creator, User approvedBy) => new()
        {
            Title = title,
            Location = location,
            Description = description,
            Date = monthStart.AddDays(dayOffset),
            Time = new TimeOnly(hour, minute),
            Creator = creator,
            Approver = approvedBy,
            CreatedAtUtc = nowUtc.AddDays(-14),
            ApprovedAtUtc = nowUtc.AddDays(-13),
        };

        CalendarEvent Pending(int dayOffset, int hour, int minute, string title, string? location, string description,
                              User creator) => new()
        {
            Title = title,
            Location = location,
            Description = description,
            Date = monthStart.AddDays(dayOffset),
            Time = new TimeOnly(hour, minute),
            Creator = creator,
            CreatedAtUtc = nowUtc.AddDays(-1),
        };

        // Approved events across this month and next (several days have multiple events, to show time sorting)
        db.Events.AddRange(
            Approved(2, 18, 30, "PTA Meeting", "Library", "Monthly parent-teacher association meeting.", jsmith, admin),
            Approved(4, 8, 0, "Picture Day", "Gym", "Individual student photos. Wear your school colors!", mjones, admin),
            Approved(4, 15, 30, "Chess Club", "Room 101", "Weekly chess club practice. All levels welcome.", ssquarepants, approver),
            Approved(4, 12, 0, "Faculty Lunch", "Cafeteria", "Staff appreciation lunch.", admin, admin),
            Approved(8, 19, 0, "Football vs Central", "Football Field", "Home game against Central High. Go Eagles!", jsmith, admin),
            Approved(11, 9, 0, "Science Fair", "Gym", "Student science projects on display. Judging at 11am.", mjones, approver),
            Approved(11, 13, 0, "Science Fair Awards", "Auditorium", "Awards ceremony for science fair winners.", mjones, approver),
            Approved(15, 18, 0, "Winter Concert", "Auditorium", "Band and choir winter performance.", ssquarepants, admin),
            Approved(18, 7, 45, "Early Dismissal", null, "School dismisses at 12:30pm for teacher training.", admin, admin),
            Approved(22, 17, 0, "Basketball vs North", "Gym", "Varsity basketball home opener.", jsmith, approver),
            Approved(35, 10, 0, "Book Fair", "Library", "Annual book fair. Proceeds support the library.", mjones, admin),
            Approved(40, 14, 0, "Graduation Rehearsal", "Auditorium", "Mandatory rehearsal for all graduating seniors.", admin, admin));

        // One day with exactly 10 approved events, to demo the "max 10 per day" rule
        for (var station = 1; station <= 10; station++)
        {
            db.Events.Add(Approved(25, 7 + station, 0, $"Field Day Station {station}", "Football Field",
                $"Field day activity station {station}.", jsmith, admin));
        }

        // Pending submissions from normal users (waiting for approval)
        db.Events.AddRange(
            Pending(6, 15, 0, "Robotics Club Demo", "Room 101", "Robotics club shows off this year's robot.", ssquarepants),
            Pending(13, 18, 0, "Drama Club Auditions", "Auditorium", "Auditions for the spring play.", mjones),
            Pending(20, 16, 0, "Bake Sale", "Cafeteria", "Fundraiser for the senior class trip.", jsmith),
            Pending(25, 18, 0, "Movie Night", "Gym", "Family movie night (this day is already full!).", ssquarepants),
            Pending(33, 9, 30, "Career Day", "Gym", "Local professionals talk about their careers.", mjones));

        await db.SaveChangesAsync(ct);
    }
}
