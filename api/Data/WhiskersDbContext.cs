using Microsoft.EntityFrameworkCore;
using Whiskers.Api.Models;

namespace Whiskers.Api.Data;

public class WhiskersDbContext(DbContextOptions<WhiskersDbContext> options) : DbContext(options)
{
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Appointment> Appointments => Set<Appointment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Service>(e =>
        {
            e.Property(s => s.Name).HasMaxLength(80);
            e.Property(s => s.Detail).HasMaxLength(120);
            e.HasData(
                new Service { Id = 1, Name = "Wellness check-up", Detail = "About 30 min", DurationMinutes = 30 },
                new Service { Id = 2, Name = "Full groom", Detail = "About 90 min", DurationMinutes = 90 },
                new Service { Id = 3, Name = "Nail trim", Detail = "About 20 min", DurationMinutes = 20 },
                new Service { Id = 4, Name = "Boarding", Detail = "Overnight stays", DurationMinutes = 30 });
        });

        modelBuilder.Entity<Appointment>(e =>
        {
            e.Property(a => a.OwnerName).HasMaxLength(80);
            e.Property(a => a.CatName).HasMaxLength(60);
            e.Property(a => a.Email).HasMaxLength(254);
            e.Property(a => a.Phone).HasMaxLength(30);
            e.Property(a => a.Notes).HasMaxLength(500);

            // Backstop against two people booking the same start time at once.
            e.HasIndex(a => a.StartsAt).IsUnique();

            e.HasOne(a => a.Service)
                .WithMany()
                .HasForeignKey(a => a.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
