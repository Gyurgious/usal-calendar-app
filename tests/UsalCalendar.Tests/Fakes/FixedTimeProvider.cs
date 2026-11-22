namespace UsalCalendar.Tests.Fakes;

/// <summary>A clock that always returns the same moment, so timestamps can be asserted exactly.</summary>
internal sealed class FixedTimeProvider(DateTimeOffset now) : TimeProvider
{
    public override DateTimeOffset GetUtcNow() => now;
}