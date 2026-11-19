namespace UsalCalendar.Core.Exceptions;

/// <summary>Thrown when a business rule is broken (e.g. a day already has 10 approved events). Mapped to HTTP 409.</summary>
public sealed class BusinessRuleException(string message) : Exception(message);
