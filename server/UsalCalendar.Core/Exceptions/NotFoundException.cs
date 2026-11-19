namespace UsalCalendar.Core.Exceptions;

/// <summary>Thrown when a requested record does not exist. Mapped to HTTP 404.</summary>
public sealed class NotFoundException(string message) : Exception(message);
