using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using TotalFit.API.Data;
using TotalFit.API.Models;

namespace TotalFit.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AlunosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AlunosController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize]
        public async Task<ActionResult<IEnumerable<AlunoDto>>> GetAlunos()
        {
            var alunos = await _context.Alunos
                .Include(a => a.Usuario)
                .Select(a => new AlunoDto
                {
                    Id = a.Id,
                    UsuarioId = a.UsuarioId,
                    Nome = a.Usuario != null ? a.Usuario.Nome : string.Empty,
                    Email = a.Usuario != null ? a.Usuario.Email : string.Empty,
                    Telefone = a.Telefone,
                    Objetivo = a.Objetivo,
                    Restricoes = a.Observacoes
                })
                .ToListAsync();

            return Ok(alunos);
        }

        [HttpGet("{id}")]
        [Authorize]
        public async Task<ActionResult<AlunoDto>> GetAluno(int id)
        {
            var aluno = await _context.Alunos
                .Include(a => a.Usuario)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (aluno == null) return NotFound("Aluno não encontrado.");

            return Ok(new AlunoDto
            {
                Id = aluno.Id,
                UsuarioId = aluno.UsuarioId,
                Nome = aluno.Usuario?.Nome ?? string.Empty,
                Email = aluno.Usuario?.Email ?? string.Empty,
                Telefone = aluno.Telefone,
                Objetivo = aluno.Objetivo,
                Restricoes = aluno.Observacoes
            });
        }

        [HttpPut("{id}/anamnese")]
        [Authorize]
        public async Task<IActionResult> UpdateAnamnese(int id, [FromBody] AnamneseDto dto)
        {
            var aluno = await _context.Alunos.FindAsync(id);
            if (aluno == null) return NotFound("Aluno não encontrado.");

            aluno.Objetivo = dto.Objetivo;
            aluno.Observacoes = dto.Restricoes;

            _context.Entry(aluno).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateAluno(int id, [FromBody] AlunoDto dto)
        {
            var aluno = await _context.Alunos
                .Include(a => a.Usuario)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (aluno == null) return NotFound("Aluno não encontrado.");

            aluno.Telefone = dto.Telefone ?? string.Empty;
            aluno.Objetivo = dto.Objetivo ?? string.Empty;
            aluno.Observacoes = dto.Restricoes ?? string.Empty;

            if (aluno.Usuario != null)
            {
                aluno.Usuario.Nome = dto.Nome;
                aluno.Usuario.Email = dto.Email;
            }

            _context.Entry(aluno).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost]
        [Authorize]
        public async Task<ActionResult<AlunoDto>> CreateAluno([FromBody] AlunoDto dto)
        {
            int usuarioIdParaUsar = dto.UsuarioId;

            if (usuarioIdParaUsar == 0 && !string.IsNullOrEmpty(dto.Email))
            {
                var usuarioExistente = await _context.Usuarios.FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());
                if (usuarioExistente != null)
                {
                    usuarioIdParaUsar = usuarioExistente.Id;
                }
            }

            if (usuarioIdParaUsar == 0)
            {
                return BadRequest(new { mensagem = "É necessário associar o aluno a um utilizador válido." });
            }

            var alunoExistente = await _context.Alunos.FirstOrDefaultAsync(a => a.UsuarioId == usuarioIdParaUsar);
            if (alunoExistente != null)
            {
                return Ok(new AlunoDto
                {
                    Id = alunoExistente.Id,
                    UsuarioId = alunoExistente.UsuarioId,
                    Telefone = alunoExistente.Telefone,
                    Objetivo = alunoExistente.Objetivo,
                    Restricoes = alunoExistente.Observacoes
                });
            }

            var novoAluno = new Aluno
            {
                UsuarioId = usuarioIdParaUsar,
                Telefone = dto.Telefone ?? string.Empty,
                Objetivo = dto.Objetivo ?? string.Empty,
                Observacoes = dto.Restricoes ?? string.Empty
            };

            _context.Alunos.Add(novoAluno);
            await _context.SaveChangesAsync();

            dto.Id = novoAluno.Id;
            dto.UsuarioId = usuarioIdParaUsar;

            return CreatedAtAction(nameof(GetAluno), new { id = dto.Id }, dto);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Treinador,Admin")]
        public async Task<IActionResult> DeleteAluno(int id)
        {
            var aluno = await _context.Alunos.FindAsync(id);
            if (aluno == null) return NotFound("Aluno não encontrado.");

            _context.Alunos.Remove(aluno);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    public class AlunoDto
    {
        public int Id { get; set; }
        public int UsuarioId { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Telefone { get; set; }
        public string? Objetivo { get; set; }
        public string? Restricoes { get; set; }
    }

    public class AnamneseDto
    {
        public int Id { get; set; }
        public string Objetivo { get; set; } = string.Empty;
        public string Restricoes { get; set; } = string.Empty;
    }
}