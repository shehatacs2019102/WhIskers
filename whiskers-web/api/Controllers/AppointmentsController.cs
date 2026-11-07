using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Whiskers.Api.Data;
using Whiskers.Api.Dtos;
using Whiskers.Api.Models;
using Whiskers.Api.Services;

namespace Whiskers.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController(
    WhiskersDbContext db,
    AvailabilityService availability,
    TimeProvider clock) : ControllerBase
{
    /// <summary>Returns every 30-minute slot for a day and whether it is free for the chosen service.</summary>
    [HttpGet("availability")]
    public async Task<ActionResult<AvailabilityDto>> GetAvailability(
        [FromQuery] DateOnly date, [FromQuery] int serviceId, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(clock.GetLocalNow().DateTime);
        if (date > today.AddDays(ClinicSchedule.MaxDaysAhead))
            return Problem($"Bookings open up to {ClinicSchedule.MaxDaysAhead} days ahead.", statusCode: 400);

        var service = await db.Services.AsNoTracking().FirstOrDefaultAsync(s => s.Id == serviceId, ct);
        if (service is null) return Problem("That service does not exist.", statusCode: 404);

        var slots = await availability.GetSlotsAsync(date, service.DurationMinutes, ct);
        return new AvailabilityDto(date, slots);
    }

    /// <summary>Books an appointment. Returns 409 if the time was taken in the meantime.</summary>
    [HttpPost]
    public async Task<ActionResult<AppointmentConfirmationDto>> Create(
        CreateAppointmentRequest request, CancellationToken ct)
    {
        var service = await db.Services.FirstOrDefaultAsync(s => s.Id == request.ServiceId, ct);
        if (service is null) return Problem("That service does not exist.", statusCode: 400);

        // Times are clinic-local and have no offset; ignore any kind the client's JSON implied.
        var startsAt = DateTime.SpecifyKind(request.StartsAt, DateTimeKind.Unspecified);

        if (!await availability.IsAvailableAsync(startsAt, service.DurationMinutes, ct))
            return Problem("That time is no longer available. Please pick another.", statusCode: 409);

        var appointment = new Appointment
        {
            ServiceId = service.Id,
            StartsAt = startsAt,
            OwnerName = request.OwnerName.Trim(),
            CatName = request.CatName.Trim(),
            Email = request.Email.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            CreatedAt = clock.GetUtcNow().UtcDateTime,
        };

        db.Appointments.Add(appointment);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // The unique index on StartsAt caught a booking that raced ours.
            return Problem("That time was just taken. Please pick another.", statusCode: 409);
        }

        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, ToDto(appointment, service));
    }

    /// <summary>Looks up one appointment by id, for the confirmation page.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<AppointmentConfirmationDto>> GetById(int id, CancellationToken ct)
    {
        var appointment = await db.Appointments
            .AsNoTracking()
            .Include(a => a.Service)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

        return appointment is null ? NotFound() : ToDto(appointment, appointment.Service!);
    }

    private static AppointmentConfirmationDto ToDto(Appointment a, Service s) =>
        new(a.Id, s.Name, a.StartsAt, a.OwnerName, a.CatName, a.Email);
}
