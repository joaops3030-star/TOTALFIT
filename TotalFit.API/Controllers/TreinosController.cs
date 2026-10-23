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
    public class TreinosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TreinosController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var query = _context.Treinos
                .Include(t => t.Aluno)
                    .ThenInclude(a => a.Usuario)
                .Include(t => t.TreinoExercicios)
                    .ThenInclude(te => te.Exercicio)
                .AsQueryable();

            if (role == "Aluno" && int.TryParse(userIdString, out int usuarioId))
            {
                var aluno = await _context.Alunos.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
                if (aluno != null)
                {
                    query = query.Where(t => t.AlunoId == aluno.Id);
                }
                else
                {
                    query = query.Where(t => t.Id == 0);
                }
            }

            // Carrega os dados para a memória primeiro para evitar falhas de tradução no EF Core
            var treinosDoBanco = await query.ToListAsync();

            var treinos = treinosDoBanco.Select(t => new
            {
                t.Id,
                t.Nome,
                t.Descricao,
                t.DiaSemana,
                AlunoId = t.AlunoId,
                AlunoNome = t.Aluno?.Usuario?.Nome ?? "Desconhecido",
                Exercicios = t.TreinoExercicios.Select(te => new
                {
                    te.ExercicioId,
                    NomeExercicio = te.Exercicio?.Nome ?? "Exercício",
                    GrupoMuscular = te.Exercicio?.GrupoMuscular ?? "",
                    te.Series,
                    te.Repeticoes,
                    Carga = (double)te.Carga
                })
            }).ToList();

            return Ok(treinos);
        }

        [HttpPost]
        [Authorize(Roles = "Treinador,Admin")]
        public async Task<IActionResult> Create([FromBody] TreinoCreateDTO dto)
        {
            if (dto == null) return BadRequest("Dados inválidos.");

            var treino = new Treino
            {
                Nome = dto.Nome,
                AlunoId = dto.AlunoId,
                Descricao = dto.Descricao ?? "",
                DiaSemana = string.IsNullOrEmpty(dto.DiaSemana) ? "Segunda" : dto.DiaSemana
            };

            _context.Treinos.Add(treino);
            await _context.SaveChangesAsync();

            if (dto.Exercicios != null && dto.Exercicios.Any())
            {
                foreach (var ex in dto.Exercicios)
                {
                    var te = new TreinoExercicio
                    {
                        TreinoId = treino.Id,
                        ExercicioId = ex.ExercicioId,
                        Series = ex.Series,
                        Repeticoes = ex.Repeticoes,
                        Carga = (decimal)ex.Carga
                    };
                    _context.TreinoExercicios.Add(te);
                }
                await _context.SaveChangesAsync();
            }

            return Ok(new { mensagem = "Treino cadastrado com sucesso!", id = treino.Id });
        }

        [HttpPost("{treinoId}/exercicios")]
        [Authorize(Roles = "Treinador,Admin")]
        public async Task<IActionResult> AdicionarExercicio(int treinoId, [FromBody] TreinoExercicioDTO dto)
        {
            if (dto == null) return BadRequest("Dados inválidos.");

            var treino = await _context.Treinos.FindAsync(treinoId);
            if (treino == null) return NotFound("Treino não encontrado.");

            var exercicioExiste = await _context.Exercicios.AnyAsync(e => e.Id == dto.ExercicioId);
            if (!exercicioExiste) return NotFound("Exercício não encontrado.");

            var treinoExercicio = new TreinoExercicio
            {
                TreinoId = treinoId,
                ExercicioId = dto.ExercicioId,
                Series = dto.Series,
                Repeticoes = dto.Repeticoes,
                Carga = (decimal)dto.Carga
            };

            _context.TreinoExercicios.Add(treinoExercicio);
            await _context.SaveChangesAsync();

            return Ok(new { mensagem = "Exercício vinculado com sucesso!", id = treinoExercicio.Id });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Treinador,Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var treino = await _context.Treinos.FindAsync(id);
            if (treino == null) return NotFound("Treino não encontrado.");

            _context.Treinos.Remove(treino);
            await _context.SaveChangesAsync();
            return Ok(new { mensagem = "Treino excluído com sucesso!" });
        }
    }

    public class TreinoCreateDTO
    {
        public string Nome { get; set; } = string.Empty;
        public int AlunoId { get; set; }
        public string Descricao { get; set; } = string.Empty;
        public string DiaSemana { get; set; } = string.Empty;
        public List<TreinoExercicioDTO> Exercicios { get; set; } = new();
    }

    public class TreinoExercicioDTO
    {
        public int ExercicioId { get; set; }
        public int Series { get; set; }
        public int Repeticoes { get; set; }
        public double Carga { get; set; }
    }
}