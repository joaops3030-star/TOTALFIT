using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace TotalFit.API.Models
{
    public class AvaliacaoFisica
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AlunoId { get; set; }

        [ForeignKey("AlunoId")]
        public Aluno? Aluno { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Peso { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Altura { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PercentualGordura { get; set; }

        public DateTime DataAvaliacao { get; set; } = DateTime.Now;
    }
}