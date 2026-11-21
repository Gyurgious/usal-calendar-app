using System.Text.RegularExpressions;
using UsalCalendar.Core.Rules;

namespace UsalCalendar.Tests.Unit;

public class ValidationRulesTests
{
    [Theory]
    [InlineData("abcd", true)]               // min length 4
    [InlineData("abcdefghijklmnop", true)]   // max length 16
    [InlineData("jsmith2", true)]
    [InlineData("abc", false)]               
    [InlineData("abcdefghijklmnopq", false)] 
    [InlineData("j smith", false)]           
    [InlineData("j.smith", false)]           
    public void LogonName(string value, bool expected) => // V1
        Assert.Equal(expected, Regex.IsMatch(value, ValidationRules.LoginRegex));

    [Theory]
    [InlineData("Pass123!", true)]
    [InlineData("a!b@", true)]               
    [InlineData("abc", false)]               
    [InlineData("pass word", false)]         
    [InlineData("abcdefghijklmnopq", false)] 
    public void Password(string value, bool expected) => // V2
        Assert.Equal(expected, Regex.IsMatch(value, ValidationRules.PasswordRegex));

    [Theory]
    [InlineData("Room 101 (East Wing)", true)]
    [InlineData("", true)]
    [InlineData("Tab\there", false)]         // control character
    [InlineData("Caf\u00e9", false)]         // non-ASCII (é)
    public void Printable(string value, bool expected) => //V3-V6
        Assert.Equal(expected, Regex.IsMatch(value, ValidationRules.PrintableRegex));
}
