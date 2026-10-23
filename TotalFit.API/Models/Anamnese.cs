namespace TotalFit.API.Models
{
    public class Anamnese
    {
        public int Id { get; set; }

        public int AlunoId { get; set; }

        public string HistoricoAtividade { get; set; } = string.Empty;

        public string Restricoes { get; set; } = string.Empty;

        public string Objetivo { get; set; } = string.Empty;

        public string Observacoes { get; set; } = string.Empty;

        public DateTime DataCadastro { get; set; } = DateTime.Now;

        public Aluno Aluno { get; set; } = null!;
    }
}