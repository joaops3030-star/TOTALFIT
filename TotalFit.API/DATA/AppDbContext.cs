using Microsoft.EntityFrameworkCore;
using TotalFit.API.Models;

namespace TotalFit.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Aluno> Alunos { get; set; }
        public DbSet<Exercicio> Exercicios { get; set; }
        public DbSet<Treino> Treinos { get; set; }
        public DbSet<TreinoExercicio> TreinoExercicios { get; set; }
        public DbSet<AvaliacaoFisica> AvaliacoesFisicas { get; set; }
        public DbSet<Anamnese> Anamneses { get; set; }
        public DbSet<CheckIn> CheckIns { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configuração explícita dos tipos decimal para evitar avisos do EF Core
            modelBuilder.Entity<TreinoExercicio>()
                .Property(te => te.Carga)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<AvaliacaoFisica>()
                .Property(af => af.Peso)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<AvaliacaoFisica>()
                .Property(af => af.Altura)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<AvaliacaoFisica>()
                .Property(af => af.PercentualGordura)
                .HasColumnType("decimal(18,2)");
        }
    }
}