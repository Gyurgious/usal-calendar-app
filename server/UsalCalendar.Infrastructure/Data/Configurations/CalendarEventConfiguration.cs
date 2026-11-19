using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Rules;

namespace UsalCalendar.Infrastructure.Data.Configurations;

internal sealed class CalendarEventConfiguration : IEntityTypeConfiguration<CalendarEvent>
{
     public void Configure(EntityTypeBuilder<CalendarEvent> builder)
    {
        builder.ToTable("Events");
        builder.Property(e => e.Title).HasMaxLength(ValidationRules.TitleMaxLength);
        builder.Property(e => e.Description).HasMaxLength(ValidationRules.DescriptionMaxLength);
        builder.Property(e => e.Location).HasMaxLength(ValidationRules.LocationMaxLength);

        // Two foreign keys to Users: configure both explicitly, and never cascade-delete events.
        builder.HasOne(e => e.Creator).WithMany()
               .HasForeignKey(e => e.CreatorId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(e => e.Approver).WithMany()
               .HasForeignKey(e => e.ApproverId).OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(e => e.Date);   // calendar queries filter by date range
    }

}