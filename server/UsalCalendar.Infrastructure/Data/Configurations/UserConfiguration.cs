using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Rules;

namespace UsalCalendar.Infrastructure.Data.Configuration;

internal sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    // ORM: configure describes DB table
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.FirstName).HasMaxLength(ValidationRules.NameMaxLength);
        builder.Property(u => u.MiddleName).HasMaxLength(ValidationRules.NameMaxLength);
        builder.Property(u => u.LastName).HasMaxLength(ValidationRules.NameMaxLength);
        builder.Property(u => u.LoginName)
               .HasMaxLength(ValidationRules.LogonNameMaxLength)
               .UseCollation("NOCASE");                 
        builder.HasIndex(u => u.LoginName).IsUnique();
    }

}