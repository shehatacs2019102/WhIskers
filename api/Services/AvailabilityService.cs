using Microsoft.EntityFrameworkCore;
using Whiskers.Api.Data;
using Whiskers.Api.Dtos;

namespace Whiskers.Api.Services;

/// <summary>Opening hours: Monday to Saturday, 9:00 to 12:00 and 13:00 to 18:00, in 30-minute slots.</summary>
public static class ClinicSchedule
{
    public const int MaxDaysAhead = 90;

    private static readonly TimeOnly MorningEnd = new(12, 0);
    private static readonly TimeOnly AfternoonEnd = new(18, 0);

    public static IReadOnlyList<TimeOnly> SlotStarts { get; } = BuildSlots();

    public static bool IsOpen(DateOnly date) => date.DayOfWeek != DayOfWeek.Sunday;

    /// <summary>The time the session containing this start time ends (lunch and closing).</summary>
    public static TimeOnly SessionEnd(TimeOnly start) => start < MorningEnd ? MorningEnd : AfternoonEnd;

    private static List<TimeOnly> BuildSlots()
    {
        var slots = new List<TimeOnly>();
        for (var t = new TimeOnly(9, 0); t < MorningEnd; t = t.AddMinutes(30)) slots.Add(t);
        for (var t = new TimeOnly(13, 0); t < AfternoonEnd; t = t.AddMinutes(30)) slots.Add(t);
        return slots;
    }
}

public class AvailabilityService(WhiskersDbContext db, TimeProvider clock)
{
    public async Task<IReadOnlyList<SlotDto>> GetSlotsAsync(
        DateOnly date, int durationMinutes, CancellationToken ct = default)
    {
        if (!ClinicSchedule.IsOpen(date)) return [];

        var booked = await LoadBookedAsync(date, ct);
        var now = clock.GetLocalNow().DateTime;

        return ClinicSchedule.SlotStarts
            .Select(t => new SlotDto(t.ToString("HH:mm"), IsFree(date, t, durationMinutes, booked, now)))
            .ToList();
    }

    public async Task<bool> IsAvailableAsync(DateTime startsAt, int durationMinutes, CancellationToken ct = default)
    {
        var date = DateOnly.FromDateTime(startsAt);
        var time = TimeOnly.FromDateTime(startsAt);

        if (!ClinicSchedule.IsOpen(date) || !ClinicSchedule.SlotStarts.Contains(time)) return false;

        var booked = await LoadBookedAsync(date, ct);
        return IsFree(date, time, durationMinutes, booked, clock.GetLocalNow().DateTime);
    }

    private async Task<List<(DateTime Start, DateTime End)>> LoadBookedAsync(DateOnly date, CancellationToken ct)
    {
        var dayStart = date.ToDateTime(TimeOnly.MinValue);
        var dayEnd = dayStart.AddDays(1);

        var rows = await db.Appointments
            .AsNoTracking()
            .Where(a => a.StartsAt >= dayStart && a.StartsAt < dayEnd)
            .Select(a => new { a.StartsAt, a.Service!.DurationMinutes })
            .ToListAsync(ct);

        return rows.Select(r => (r.StartsAt, r.StartsAt.AddMinutes(r.DurationMinutes))).ToList();
    }

    private static bool IsFree(
        DateOnly date, TimeOnly time, int durationMinutes,
        List<(DateTime Start, DateTime End)> booked, DateTime now)
    {
        var start = date.ToDateTime(time);
        var end = start.AddMinutes(durationMinutes);

        if (start <= now) return false;
        if (date.ToDateTime(ClinicSchedule.SessionEnd(time)) < end) return false;

        return !booked.Any(b => start < b.End && end > b.Start);
    }
}
