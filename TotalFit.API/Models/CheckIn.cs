namespace TotalFit.API.Models
{
    public class CheckIn
    {
        public int Id { get; set; }
        public int AlunoId { get; set; }
        public Aluno? Aluno { get; set; }
        public DateTime Data { get; set; }
    }
}