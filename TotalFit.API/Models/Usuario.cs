using System.ComponentModel.DataAnnotations;

namespace TotalFit.API.Models
{
    public class Usuario
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Nome { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string SenhaHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Tipo { get; set; } = "Treinador"; // "Admin", "Treinador", "Aluno"

        public DateTime DataCriacao { get; set; } = DateTime.Now;
    }
}