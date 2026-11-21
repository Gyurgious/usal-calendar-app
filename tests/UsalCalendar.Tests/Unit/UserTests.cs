using UsalCalendar.Tests.Fakes;

namespace UsalCalendar.Tests.Unit;

public class UserTests
{
    [Fact]
    public void DisplayName_WithMiddleName_IsLastFirstMiddle()
    {
        var user = TestUsers.Create(middleName: "Michael");

        Assert.Equal("Smith, John Michael", user.DisplayName);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void DisplayName_WithoutMiddleName_IsLastFirst(string? middleName)
    {
        var user = TestUsers.Create(middleName: middleName);

        Assert.Equal("Smith, John", user.DisplayName);
    }
}
