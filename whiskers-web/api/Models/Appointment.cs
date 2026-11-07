namespace Whiskers.Api.Models;

public class Appointment
{
    public int Id { get; set; }

    public int ServiceId { get; set; }
    public Service? Service { get; set; }

    /// <summary>Start time in the clinic's local time (no time zone offset).</summary>
    public DateTime StartsAt { get; set; }

    public required string OwnerName { get; set; }
    public required string CatName { get; set; }
    public required string Email { get; set; }
    public string? Phone { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
}
