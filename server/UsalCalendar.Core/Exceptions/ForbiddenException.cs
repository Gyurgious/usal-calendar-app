namespace UsalCalendar.Core.Exceptions;

/// <summary>Thrown when the user is signed in but not allowed to act on this record. Mapped to HTTP 403.</summary>
public sealed class ForbiddenException(string message) : Exception(message);