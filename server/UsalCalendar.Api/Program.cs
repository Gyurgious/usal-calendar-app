using UsalCalendar.Api.Auth;
using UsalCalendar.Api.ErrorHandling;
using UsalCalendar.Infrastructure;
using UsalCalendar.Core;
using UsalCalendar.Infrastructure.Data;
using UsalCalendar.Api;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container (everything the app can use).

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddSingleton<TimeProvider>(SchoolTimeProvider.FromConfiguration(builder.Configuration));
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddCore(); 
builder.Services.AddInfrastructure(
    
    builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is missing."));

var app = builder.Build(); // build pipleline (steps every HTTP request passes through)

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous(); // desc of API's shape
    await app.Services.MigrateAndSeedAsync();
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();
