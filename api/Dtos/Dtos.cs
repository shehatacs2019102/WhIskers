using System.ComponentModel.DataAnnotations;

namespace Whiskers.Api.Dtos;

public sealed record ServiceDto(int Id, string Name, string Detail, int DurationMinutes);

/// <param name="Time">Start time as "HH:mm" in the clinic's local time.</param>
public sealed record SlotDto(string Time, bool Available);

public sealed record AvailabilityDto(DateOnly Date, IReadOnlyList<SlotDto> Slots);

public sealed record CreateAppointmentRequest(
    [Range(1, int.MaxValue)] int ServiceId,
    DateTime StartsAt,
    [Required, StringLength(80, MinimumLength = 2)] string OwnerName,
    [Required, StringLength(60, MinimumLength = 1)] string CatName,
    [Required, EmailAddress, StringLength(254)] string Email,
    [Phone, StringLength(30)] string? Phone,
    [StringLength(500)] string? Notes);

public sealed record AppointmentConfirmationDto(
    int Id,
    string ServiceName,
    DateTime StartsAt,
    string OwnerName,
    string CatName,
    string Email);
