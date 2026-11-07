using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Time.Testing;
using Whiskers.Api.Data;
using Whiskers.Api.Models;
using Whiskers.Api.Services;

namespace Whiskers.Api.Tests;

public sealed class AvailabilityServiceTests : IDisposable
{
    // Thursday 5 November 2026, 08:00 clinic time.
    private static readonly DateTimeOffset Now = new(2026, 11, 5, 8, 0, 0, TimeSpan.Zero);

    private static readonly DateOnly Monday = new(2026, 11, 9);
    private static readonly DateOnly Sunday = new(2026, 11, 8);

    private const int CheckUp = 30;
    private const int Groom = 90;

    private readonly SqliteConnection _connection = new("DataSource=:memory:");
    private readonly FakeTimeProvider _clock = new(Now);
    private readonly WhiskersDbContext _db;
    private readonly AvailabilityService _sut;

    public AvailabilityServiceTests()
    {
        _connection.Open();
        _db = new WhiskersDbContext(new DbContextOptionsBuilder<WhiskersDbContext>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();
        _sut = new AvailabilityService(_db, _clock);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private async Task BookAsync(DateOnly date, TimeOnly time, int serviceId = 1)
    {
        _db.Appointments.Add(new Appointment
        {
            ServiceId = serviceId,
            StartsAt = date.ToDateTime(time),
            OwnerName = "Test Owner",
            CatName = "Milo",
            Email = "test@example.com",
        });
        await _db.SaveChangesAsync();
    }

    private async Task<HashSet<string>> FreeTimesAsync(DateOnly date, int duration) =>
        (await _sut.GetSlotsAsync(date, duration)).Where(s => s.Available).Select(s => s.Time).ToHashSet();

    [Fact]
    public async Task Closed_on_sundays()
    {
        Assert.Empty(await _sut.GetSlotsAsync(Sunday, CheckUp));
    }

    [Fact]
    public async Task Offers_half_hour_slots_with_a_lunch_break()
    {
        var times = (await _sut.GetSlotsAsync(Monday, CheckUp)).Select(s => s.Time).ToList();

        Assert.Equal(16, times.Count); // 6 in the morning (9:00 to 11:30) and 10 after lunch (13:00 to 17:30)
        Assert.Equal("09:00", times.First());
        Assert.Contains("11:30", times);
        Assert.DoesNotContain("12:00", times);
        Assert.DoesNotContain("12:30", times);
        Assert.Equal("13:00", times[6]);
        Assert.Equal("17:30", times.Last());
    }

    [Fact]
    public async Task Everything_is_free_on_an_empty_day()
    {
        Assert.Equal(16, (await FreeTimesAsync(Monday, CheckUp)).Count);
    }

    [Fact]
    public async Task Times_that_have_already_passed_are_not_offered()
    {
        _clock.SetUtcNow(new DateTimeOffset(2026, 11, 9, 10, 15, 0, TimeSpan.Zero));

        var free = await FreeTimesAsync(Monday, CheckUp);

        Assert.DoesNotContain("09:00", free);
        Assert.DoesNotContain("10:00", free);
        Assert.Contains("10:30", free);
    }

    [Fact]
    public async Task Past_days_have_no_free_slots()
    {
        Assert.Empty(await FreeTimesAsync(new DateOnly(2026, 11, 2), CheckUp));
    }

    [Theory]
    [InlineData("09:00", true)]
    [InlineData("10:30", true)]   // ends exactly at lunch (12:00)
    [InlineData("11:00", false)]  // would run into lunch
    [InlineData("11:30", false)]
    [InlineData("16:30", true)]   // ends exactly at closing (18:00)
    [InlineData("17:00", false)]  // would run past closing
    public async Task A_long_service_must_finish_before_lunch_or_closing(string time, bool expected)
    {
        Assert.Equal(expected, (await FreeTimesAsync(Monday, Groom)).Contains(time));
    }

    [Fact]
    public async Task An_existing_booking_blocks_every_slot_it_overlaps()
    {
        await BookAsync(Monday, new TimeOnly(9, 0), serviceId: 2); // 90-minute groom: 9:00 to 10:30

        var free = await FreeTimesAsync(Monday, CheckUp);

        Assert.DoesNotContain("09:00", free);
        Assert.DoesNotContain("09:30", free);
        Assert.DoesNotContain("10:00", free);
        Assert.Contains("10:30", free);
    }

    [Fact]
    public async Task A_new_booking_cannot_run_into_the_next_one()
    {
        await BookAsync(Monday, new TimeOnly(10, 0)); // check-up at 10:00

        var free = await FreeTimesAsync(Monday, Groom);

        Assert.DoesNotContain("09:00", free); // 9:00 to 10:30 would overlap 10:00
        Assert.Contains("10:30", free);
    }

    [Fact]
    public async Task Bookings_on_other_days_do_not_matter()
    {
        await BookAsync(Monday.AddDays(1), new TimeOnly(9, 0));

        Assert.Contains("09:00", await FreeTimesAsync(Monday, CheckUp));
    }

    [Theory]
    [InlineData(10, 30, true)]
    [InlineData(10, 15, false)]  // not on the 30-minute grid
    [InlineData(12, 0, false)]   // lunch
    [InlineData(18, 0, false)]   // closed
    public async Task IsAvailable_only_accepts_real_slots(int hour, int minute, bool expected)
    {
        var start = Monday.ToDateTime(new TimeOnly(hour, minute));
        Assert.Equal(expected, await _sut.IsAvailableAsync(start, CheckUp));
    }

    [Fact]
    public async Task IsAvailable_is_false_on_a_sunday()
    {
        Assert.False(await _sut.IsAvailableAsync(Sunday.ToDateTime(new TimeOnly(10, 0)), CheckUp));
    }
}
