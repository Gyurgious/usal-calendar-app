using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UsalCalendar.Api.Auth;
using UsalCalendar.Api.Dtos;
using UsalCalendar.Core.Services;

namespace UsalCalendar.Api.Controllers;

/// <summary>User management. Every action is approvers only (the policy is on the whole controller).</summary>
[ApiController]
[Route("api/users")]
[Authorize(Policy = Policies.Approver)]
public sealed class UsersController(UserService userService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserDto>>> GetAll(CancellationToken ct)
    {
        var users = await userService.GetAllAsync(ct);
        return users.Select(UserDto.FromEntity).ToList();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserDto>> GetById(int id, CancellationToken ct)
    {
        var user = await userService.GetByIdAsync(id, ct);
        return UserDto.FromEntity(user);
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> Create(UserRequest request, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(request.Password))
        {
            ModelState.AddModelError(nameof(UserRequest.Password), "Password is required.");
            return ValidationProblem();
        }

        var created = await userService.CreateAsync(request.ToDetails(), request.Password, ct);
        return Created(new Uri($"/api/users/{created.Id}", UriKind.Relative), UserDto.FromEntity(created));
    }

    /// <summary>Edits a user. Empty password = keep it. 409 for a taken login name or removing your own approver role.</summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, UserRequest request, CancellationToken ct)
    {
        var updated = await userService.UpdateAsync(id, request.ToDetails(), request.Password, User.GetUserId(), ct);
        return UserDto.FromEntity(updated);
    }

    /// <summary>Deletes a user. 409 if it's your own account or the user has events.</summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await userService.DeleteAsync(id, User.GetUserId(), ct);
        return NoContent();
    }
}