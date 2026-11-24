using UsalCalendar.Core.Entities;
using UsalCalendar.Core.Exceptions;
using UsalCalendar.Core.Models;
using UsalCalendar.Core.Services;
using UsalCalendar.Tests.Fakes;

namespace UsalCalendar.Tests.Unit;

/// <summary>User management rules: unique login names, passwords, and the self/last-approver safeguards.</summary>
public class UserServiceTests
{
    private readonly User _admin = TestUsers.Create(id: 1, logonName: "admin", isApprover: true);
    private readonly User _jsmith = TestUsers.Create(id: 2, logonName: "jsmith", isApprover: false);
    private readonly FakeUserRepository _users;
    private readonly FakePasswordHasher _hasher = new();
    private readonly UserService _service;
    private static readonly DateTimeOffset Now = new(2026, 11, 20, 15, 0, 0, TimeSpan.Zero);

    public UserServiceTests()
    {
        _users = new FakeUserRepository(_admin, _jsmith);
        _service = new UserService(_users, _hasher, new FixedTimeProvider(Now));
    }

    private static UserDetails Details(string loginName = "mjones", bool isApprover = false, string? middleName = null) =>
        new("  Maria ", middleName, " Jones  ", loginName, isApprover);

    [Fact]
    public async Task Create_TrimsNames_HashesPassword_AndSaves()
    {
        var created = await _service.CreateAsync(Details(middleName: "   "), "Pass123!");

        Assert.Equal("Maria", created.FirstName);
        Assert.Null(created.MiddleName); // blank middle name → none
        Assert.Equal("Jones", created.LastName);
        Assert.Equal("Jones, Maria", created.DisplayName);
        Assert.Equal(_hasher.Hash("Pass123!"), created.PasswordHash); // never stored as plain text
        Assert.Contains(created, _users.Users);
        Assert.Equal(1, _users.SaveCount);
    }

    [Theory]
    [InlineData("jsmith")]
    [InlineData("JSmith")] // login names ignore case
    public async Task Create_WithTakenLoginName_Throws(string loginName)
    {
        var error = await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(Details(loginName), "Pass123!"));

        Assert.Contains("already taken", error.Message, StringComparison.Ordinal);
        Assert.Equal(0, _users.SaveCount);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public async Task Update_WithoutPassword_KeepsCurrentPassword(string? newPassword)
    {
        var oldHash = _jsmith.PasswordHash;

        await _service.UpdateAsync(_jsmith.Id, Details("jsmith"), newPassword, currentUserId: _admin.Id);

        Assert.Equal(oldHash, _jsmith.PasswordHash);
        Assert.Equal("Jones, Maria", _jsmith.DisplayName);
    }

    [Fact]
    public async Task Update_WithPassword_HashesTheNewOne()
    {
        await _service.UpdateAsync(_jsmith.Id, Details("jsmith"), "NewPass9!", currentUserId: _admin.Id);

        Assert.Equal(_hasher.Hash("NewPass9!"), _jsmith.PasswordHash);
    }

    [Fact]
    public async Task Update_KeepingOwnLoginName_IsAllowed()
    {
        var updated = await _service.UpdateAsync(_jsmith.Id, Details("JSMITH"), null, currentUserId: _admin.Id);

        Assert.Equal("JSMITH", updated.LoginName); // same user, so "taken" doesn't apply
    }

    [Fact]
    public async Task Update_ToSomeoneElsesLoginName_Throws()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.UpdateAsync(_jsmith.Id, Details("admin"), null, currentUserId: _admin.Id));

        Assert.Equal("jsmith", _jsmith.LoginName);
    }

    [Fact]
    public async Task Update_RemovingYourOwnApproverRole_Throws()
    {
        var error = await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.UpdateAsync(_admin.Id, Details("admin", isApprover: false), null, currentUserId: _admin.Id));

        Assert.Contains("your own approver role", error.Message, StringComparison.Ordinal);
        Assert.True(_admin.IsApprover);
    }

    [Fact]
    public async Task Update_CanPromoteAndDemoteOthers()
    {
        await _service.UpdateAsync(_jsmith.Id, Details("jsmith", isApprover: true), null, currentUserId: _admin.Id);
        Assert.True(_jsmith.IsApprover);

        await _service.UpdateAsync(_jsmith.Id, Details("jsmith", isApprover: false), null, currentUserId: _admin.Id);
        Assert.False(_jsmith.IsApprover);
    }

    [Fact]
    public async Task Delete_UserWithoutEvents_RemovesThem()
    {
        await _service.DeleteAsync(_jsmith.Id, currentUserId: _admin.Id);

        Assert.DoesNotContain(_jsmith, _users.Users);
        Assert.Equal(1, _users.SaveCount);
    }

    [Fact]
    public async Task Delete_YourOwnAccount_Throws()
    {
        await Assert.ThrowsAsync<BusinessRuleException>(() => _service.DeleteAsync(_admin.Id, currentUserId: _admin.Id));

        Assert.Contains(_admin, _users.Users);
    }

    [Fact]
    public async Task Delete_AnotherApprover_Throws_UntilTheirRoleIsRemoved()
    {
        var otherApprover = TestUsers.Create(id: 5, logonName: "approver2", isApprover: true);
        _users.Users.Add(otherApprover);

        var error = await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.DeleteAsync(otherApprover.Id, currentUserId: _admin.Id));
        Assert.Contains("Remove their approver role first", error.Message, StringComparison.Ordinal);

        otherApprover.IsApprover = false; // step 1: demote
        await _service.DeleteAsync(otherApprover.Id, currentUserId: _admin.Id); // step 2: delete
        Assert.DoesNotContain(otherApprover, _users.Users);
    }

    [Fact]
    public async Task Delete_UserWithEvents_DeactivatesThem_InsteadOfRemoving()
    {
        _users.EventCounts[_jsmith.Id] = 2; // e.g. one approved, one pending

        await _service.DeleteAsync(_jsmith.Id, currentUserId: _admin.Id);

        Assert.False(_jsmith.IsActive);
        Assert.Equal(Now.UtcDateTime, _jsmith.DeactivatedAtUtc);
        Assert.Contains(_jsmith, _users.Users);                         
        Assert.DoesNotContain(_jsmith, await _service.GetAllAsync());   
    }

    [Fact]
    public async Task DeletedUser_IsNotFound_AndKeepsTheirLoginName()
    {
        _users.EventCounts[_jsmith.Id] = 1;
        await _service.DeleteAsync(_jsmith.Id, currentUserId: _admin.Id);

        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(_jsmith.Id));
        await Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteAsync(_jsmith.Id, _admin.Id));
        var error = await Assert.ThrowsAsync<BusinessRuleException>(() => _service.CreateAsync(Details("jsmith"), "Pass123!"));
        Assert.Contains("already taken by a deleted user", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task UnknownUser_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetByIdAsync(999));
        await Assert.ThrowsAsync<NotFoundException>(() => _service.UpdateAsync(999, Details(), null, _admin.Id));
        await Assert.ThrowsAsync<NotFoundException>(() => _service.DeleteAsync(999, _admin.Id));
    }
}