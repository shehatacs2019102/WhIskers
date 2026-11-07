namespace Whiskers.Api.Models;

/// <summary>A bookable service, such as a check-up or a groom.</summary>
public class Service
{
    public int Id { get; set; }
    public required string Name { get; set; }

    /// <summary>Short line shown under the name on the booking page.</summary>
    public required string Detail { get; set; }

    public int DurationMinutes { get; set; }
}
