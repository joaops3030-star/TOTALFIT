using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TotalFit.API.Data;
using TotalFit.API.Models;

namespace TotalFit.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AvaliacoesFisicasController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AvaliacoesFisicasController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var query = _context.AvaliacoesFisicas
                .Include(a => a.Aluno)
                    .ThenInclude(al => al!.Usuario)
                .AsQueryable();

            if (role == "Aluno" && int.TryParse(userIdString, out int usuarioId))
            {
                var aluno = await _context.Alunos.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
                if (aluno != null)
                {
                    query = query.Where(a => a.AlunoId == aluno.Id);
                }
                else
                {
                    query = query.Where(a => a.Id == 0);
                }
            }

            // Ordena da mais recente para a mais antiga utilizando DataAvaliacao
            var avaliacoes = await query
                .OrderByDescending(a => a.DataAvaliacao)
                .Select(a => new
                {
                    a.Id,
                    a.AlunoId,
                    AlunoNome = a.Aluno != null && a.Aluno.Usuario != null ? a.Aluno.Usuario.Nome : "Desconhecido",
                    a.Peso,
                    a.Altura,
                    a.PercentualGordura,
                    Data = a.DataAvaliacao // Mapeia para o front-end continuar a ler como 'data' sem quebrar nada
                })
                .ToListAsync();

            return Ok(avaliacoes);
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Create([FromBody] AvaliacaoFisica dto)
        {
            if (dto == null) return BadRequest("Dados da avaliação inválidos.");

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (role == "Aluno" && int.TryParse(userIdString, out int usuarioId))
            {
                var alunoLogado = await _context.Alunos.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
                if (alunoLogado == null) return NotFound("Perfil de aluno não encontrado para este utilizador.");
                dto.AlunoId = alunoLogado.Id;
            }

            var alunoExiste = await _context.Alunos.AnyAsync(a => a.Id == dto.AlunoId);
            if (!alunoExiste) return NotFound("Aluno não encontrado.");

            if (dto.DataAvaliacao == default)
            {
                dto.DataAvaliacao = DateTime.Now;
            }

            dto.Aluno = null;

            _context.AvaliacoesFisicas.Add(dto);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                dto.Id,
                dto.AlunoId,
                dto.Peso,
                dto.Altura,
                dto.PercentualGordura,
                Data = dto.DataAvaliacao
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Treinador,Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var avaliacao = await _context.AvaliacoesFisicas.FindAsync(id);
            if (avaliacao == null) return NotFound("Avaliação não encontrada.");

            _context.AvaliacoesFisicas.Remove(avaliacao);
            await _context.SaveChangesAsync();
            return Ok(new { mensagem = "Avaliação excluída com sucesso!" });
        }
    }
}