namespace UsalCalendar.Core.Rules;

public static class ValidationRules
{
    public const string LoginRegex = "^[A-Za-z0-9]{4,16}$";
    public const string PasswordRegex = @"^[\x21-\x7E]{4,16}$";
    public const string PrintableRegex = @"^[\x20-\x7E]*$"; 
    public const int NameMaxLength = 25;
    public const int LocationMaxLength = 50;
    public const int TitleMaxLength = 25;
    public const int DescriptionMaxLength = 255;
    public const int LogonNameMaxLength = 16;

    public const int MaxApprovedEventsPerDay = 10;
}