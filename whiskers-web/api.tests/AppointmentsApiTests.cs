using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Whiskers.Api.Dtos;
using Whiskers.Api.Tests.Support;

namespace Whiskers.Api.Tests;

public sealed class AppointmentsApiTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public AppointmentsApiTests(ApiFactory factory) => _client = factory.CreateClient();

    // Each test uses its own day so the shared database does not make tests depend on each other.
    private static object Booking(string startsAt, int serviceId = 1, object? phone = null) => new
    {
        serviceId,
        startsAt,
        ownerName = "Sara Ahmed",
        catName = "Biscuit",
        email = "sara@example.com",
        phone,
    };

    [Fact]
    public async Task Lists_the_four_services()
    {
        var services = await _client.GetFromJsonAsync<List<ServiceDto>>("/api/services");

        Assert.NotNull(services);
        Assert.Equal(["Wellness check-up", "Full groom", "Nail trim", "Boarding"], services.Select(s => s.Name));
    }

    [Fact]
    public async Task Booking_returns_201_with_a_location_and_can_be_read_back()
    {
        var response = await _client.PostAsJsonAsync("/api/appointments", Booking("2026-11-10T10:30:00"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<AppointmentConfirmationDto>();
        Assert.Equal("Wellness check-up", created!.ServiceName);
        Assert.Equal(new DateTime(2026, 11, 10, 10, 30, 0), created.StartsAt);
        Assert.EndsWith($"/api/Appointments/{created.Id}", response.Headers.Location!.ToString());

        var fetched = await _client.GetFromJsonAsync<AppointmentConfirmationDto>($"/api/appointments/{created.Id}");
        Assert.Equal("Biscuit", fetched!.CatName);
    }

    [Fact]
    public async Task Booking_the_same_time_twice_returns_409()
    {
        var first = await _client.PostAsJsonAsync("/api/appointments", Booking("2026-11-11T14:00:00"));
        var second = await _client.PostAsJsonAsync("/api/appointments", Booking("2026-11-11T14:00:00", serviceId: 3));

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task A_booked_slot_shows_as_taken_in_availability()
    {
        await _client.PostAsJsonAsync("/api/appointments", Booking("2026-11-12T09:30:00"));

        var day = await _client.GetFromJsonAsync<AvailabilityDto>("/api/appointments/availability?date=2026-11-12&serviceId=1");

        Assert.False(day!.Slots.Single(s => s.Time == "09:30").Available);
        Assert.True(day.Slots.Single(s => s.Time == "10:00").Available);
    }

    [Theory]
    [InlineData("2026-11-15T10:00:00")] // Sunday
    [InlineData("2026-11-13T10:15:00")] // not on the half-hour grid
    [InlineData("2026-11-13T12:00:00")] // lunch
    [InlineData("2026-11-04T10:00:00")] // in the past
    public async Task Impossible_times_are_rejected_with_409(string startsAt)
    {
        var response = await _client.PostAsJsonAsync("/api/appointments", Booking(startsAt));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task A_long_service_that_would_overrun_lunch_is_rejected()
    {
        var response = await _client.PostAsJsonAsync("/api/appointments", Booking("2026-11-16T11:00:00", serviceId: 2));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Invalid_details_return_400_with_field_errors()
    {
        var body = new { serviceId = 1, startsAt = "2026-11-17T10:00:00", ownerName = "A", catName = "", email = "nope" };

        var response = await _client.PostAsJsonAsync("/api/appointments", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var errors = json.RootElement.GetProperty("errors");
        Assert.True(errors.TryGetProperty("Email", out _));
        Assert.True(errors.TryGetProperty("CatName", out _));
        Assert.True(errors.TryGetProperty("OwnerName", out _));
    }

    [Fact]
    public async Task Unknown_service_is_rejected()
    {
        var response = await _client.PostAsJsonAsync("/api/appointments", Booking("2026-11-17T11:00:00", serviceId: 99));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Missing_appointment_returns_404()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/appointments/9999")).StatusCode);
    }

    [Fact]
    public async Task Availability_is_limited_to_the_booking_window()
    {
        var response = await _client.GetAsync("/api/appointments/availability?date=2027-06-01&serviceId=1");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
