using UsalCalendar.Api.Auth;
using UsalCalendar.Api.ErrorHandling;
using UsalCalendar.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container (everything the app can use).

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddJwtAuthentication(builder.Configuration);
// builder.Services.AddCore(); 
builder.Services.AddInfrastructure(
    builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Connection string 'Default' is missing."));

var app = builder.Build(); // build pipleline (steps every HTTP request passes through)

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // await app.Services.MigrateAndSeedAsync();   ← once DbSeeder exists
}

app.UseExceptionHandler();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await app.RunAsync();
