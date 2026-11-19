namespace UsalCalendar.Core.Entities;

public class CalendarEvent
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public string? Location { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }

    public int CreatorId { get; set; }
    public User Creator { get; set; } = null!;
    public int? ApproverId { get; set; }
    public User? Approver { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public bool IsApproved => ApproverId is not null;

    public void Approve(User approver, DateTime nowUtc)
    {
        if (!approver.IsApprover)
            throw new InvalidOperationException("Only approvers can approve events.");
        ApproverId = approver.Id;
        Approver = approver;
        ApprovedAtUtc = nowUtc;
    }

}