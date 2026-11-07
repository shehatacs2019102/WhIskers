using Microsoft.EntityFrameworkCore;
using Whiskers.Api.Data;
using Whiskers.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

builder.Services.AddDbContext<WhiskersDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=whiskers.db"));

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<AvailabilityService>();

var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>()
                     ?? ["http://localhost:4200"];
builder.Services.AddCors(options =>
    options.AddPolicy("client", policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    // Create or update the local SQLite database on startup.
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<WhiskersDbContext>().Database.Migrate();
}
else
{
    app.UseExceptionHandler();
}

app.UseCors("client");
app.UseAuthorization();
app.MapControllers();

app.Run();

// Lets the integration tests start the app.
public partial class Program;
