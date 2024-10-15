using Microsoft.EntityFrameworkCore;

namespace DungeonLairBackend.Models
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Demos> Demos { get; set; }
    }
}
