using System;
using System.Collections.Generic;

namespace TotalFit.API.Models
{
    public class Aluno
    {
        public int Id { get; set; }

        public int UsuarioId { get; set; }

        public DateTime? DataNascimento { get; set; }

        public string Telefone { get; set; } = string.Empty;

        public string Objetivo { get; set; } = string.Empty;

        public string Observacoes { get; set; } = string.Empty;

        public Usuario Usuario { get; set; } = null!;

        public ICollection<Anamnese> Anamneses { get; set; }
            = new List<Anamnese>();

        public ICollection<AvaliacaoFisica> AvaliacoesFisicas { get; set; }
            = new List<AvaliacaoFisica>();

        public ICollection<Treino> Treinos { get; set; }
            = new List<Treino>();
    }
}