namespace UsalCalendar.Api;

public sealed class SchoolTimeProvider(TimeZoneInfo schoolTimeZone) : TimeProvider
{
    public override TimeZoneInfo LocalTimeZone => schoolTimeZone;

    /// <summary>Reads the time zone id, e.g. "America/Chicago". Falls back to the server's time zone if not set.</summary>
    public static SchoolTimeProvider FromConfiguration(IConfiguration configuration)
    {
        var timeZoneId = configuration["School:TimeZone"];
        return new SchoolTimeProvider(string.IsNullOrWhiteSpace(timeZoneId)
            ? TimeZoneInfo.Local
            : TimeZoneInfo.FindSystemTimeZoneById(timeZoneId));
    }
}