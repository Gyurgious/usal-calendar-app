using System.ComponentModel.DataAnnotations;
using UsalCalendar.Core.Entities;

namespace UsalCalendar.Api.Dtos;

// (DTO) Data Transfer Object: simple object used strictly to carry data between different layers of an app
public sealed record LoginRequest([Required] string LogonName, [Required] string Password);

public sealed record CurrentUserDto(int Id, string DisplayName, bool IsApprover)
{
    public static CurrentUserDto FromUser(User user) => new(user.Id, user.DisplayName, user.IsApprover);
}

public sealed record LoginResponse(string Token, CurrentUserDto User);
