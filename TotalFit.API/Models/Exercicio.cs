namespace TotalFit.API.Models
{
    public class Exercicio
    {
        public int Id { get; set; }

        public string Nome { get; set; } = string.Empty;

        public string GrupoMuscular { get; set; } = string.Empty;

        public string Categoria { get; set; } = string.Empty;

        public string Descricao { get; set; } = string.Empty;

        // Treinos em que este exercício está incluído
        public ICollection<TreinoExercicio> TreinoExercicios { get; set; }
            = new List<TreinoExercicio>();
    }
}