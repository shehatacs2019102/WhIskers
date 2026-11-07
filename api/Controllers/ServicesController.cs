using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Whiskers.Api.Data;
using Whiskers.Api.Dtos;

namespace Whiskers.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController(WhiskersDbContext db) : ControllerBase
{
    /// <summary>Lists the services people can book.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ServiceDto>>> GetAll(CancellationToken ct)
    {
        var services = await db.Services
            .AsNoTracking()
            .OrderBy(s => s.Id)
            .Select(s => new ServiceDto(s.Id, s.Name, s.Detail, s.DurationMinutes))
            .ToListAsync(ct);

        return services;
    }
}
