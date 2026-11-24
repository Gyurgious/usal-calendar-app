namespace UsalCalendar.Tests.Fakes;

/// <summary>A clock that always returns the same moment, so timestamps can be asserted exactly.</summary>
internal sealed class FixedTimeProvider(DateTimeOffset now, TimeZoneInfo? timeZone = null) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;

    public override TimeZoneInfo LocalTimeZone => timeZone ?? TimeZoneInfo.Utc;
}