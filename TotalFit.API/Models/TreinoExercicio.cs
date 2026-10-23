namespace TotalFit.API.Models
{
    public class TreinoExercicio
    {
        public int Id { get; set; }

        public int TreinoId { get; set; }

        public int ExercicioId { get; set; }

        public int Series { get; set; }

        public int Repeticoes { get; set; }

        public decimal Carga { get; set; }

        public int IntervaloSegundos { get; set; }

        public string Observacoes { get; set; } = string.Empty;

        public int Ordem { get; set; }

        // Relacionamento com Treino
        public Treino Treino { get; set; } = null!;

        // Relacionamento com Exercicio
        public Exercicio Exercicio { get; set; } = null!;
    }
}