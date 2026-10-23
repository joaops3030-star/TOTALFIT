namespace TotalFit.API.Models
{
    public class Treino
    {
        public int Id { get; set; }

        public int AlunoId { get; set; }

        public string Nome { get; set; } = string.Empty;

        public string Descricao { get; set; } = string.Empty;

        public string DiaSemana { get; set; } = "Segunda"; // 👈 Propriedade adicionada para resolver o erro de compilação

        public DateTime DataCriacao { get; set; } = DateTime.Now;

        public bool Ativo { get; set; } = true;

        // Relacionamento com Aluno
        public Aluno Aluno { get; set; } = null!;

        // Exercícios incluídos no treino
        public ICollection<TreinoExercicio> TreinoExercicios { get; set; }
            = new List<TreinoExercicio>();
    }
}