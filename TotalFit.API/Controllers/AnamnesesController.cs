
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TotalFit.API.Data;
using TotalFit.API.Models;

namespace TotalFit.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AnamnesesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AnamnesesController(AppDbContext context)
        {
            _context = context;
        }

        private int? UsuarioIdAtual
        {
            get
            {
                var id = User.FindFirstValue(
                    ClaimTypes.NameIdentifier);

                return int.TryParse(id, out var usuarioId)
                    ? usuarioId
                    : null;
            }
        }

        private bool EhAdministrador =>
            User.IsInRole("Administrador");

        // GET: api/Anamneses
        // Administradores consultam todas; alunos, apenas as próprias.
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AnamneseResposta>>> Listar()
        {
            var consulta = ConsultaPermitida();

            var resultado = await consulta
                .AsNoTracking()
                .OrderByDescending(a => a.DataCadastro)
                .Select(a => new AnamneseResposta
                {
                    Id = a.Id,
                    AlunoId = a.AlunoId,
                    HistoricoAtividade = a.HistoricoAtividade,
                    Restricoes = a.Restricoes,
                    Objetivo = a.Objetivo,
                    Observacoes = a.Observacoes,
                    DataCadastro = a.DataCadastro
                })
                .ToListAsync();

            return Ok(resultado);
        }

        // GET: api/Anamneses/1
        // Consulta uma anamnese específica.
        [HttpGet("{id:int}")]
        public async Task<ActionResult<AnamneseResposta>> BuscarPorId(int id)
        {
            var anamnese = await ConsultaPermitida()
                .AsNoTracking()
                .Where(a => a.Id == id)
                .Select(a => new AnamneseResposta
                {
                    Id = a.Id,
                    AlunoId = a.AlunoId,
                    HistoricoAtividade = a.HistoricoAtividade,
                    Restricoes = a.Restricoes,
                    Objetivo = a.Objetivo,
                    Observacoes = a.Observacoes,
                    DataCadastro = a.DataCadastro
                })
                .FirstOrDefaultAsync();

            if (anamnese == null)
            {
                return NotFound(new
                {
                    mensagem = "Anamnese não encontrada."
                });
            }

            return Ok(anamnese);
        }

        // POST: api/Anamneses
        // Cria uma anamnese para o aluno autenticado.
        // Administradores podem informar o AlunoId.
        [HttpPost]
        public async Task<ActionResult<AnamneseResposta>> Criar(
            [FromBody] AnamneseRequisicao requisicao)
        {
            Aluno? aluno;

            if (EhAdministrador)
            {
                if (!requisicao.AlunoId.HasValue ||
                    requisicao.AlunoId.Value <= 0)
                {
                    return BadRequest(new
                    {
                        mensagem = "Informe um AlunoId válido."
                    });
                }

                aluno = await _context.Alunos
                    .FindAsync(requisicao.AlunoId.Value);
            }
            else
            {
                var usuarioId = UsuarioIdAtual;

                if (!usuarioId.HasValue)
                {
                    return Unauthorized();
                }

                // O aluno não pode escolher o perfil de outra pessoa.
                aluno = await _context.Alunos
                    .SingleOrDefaultAsync(
                        a => a.UsuarioId == usuarioId.Value);
            }

            if (aluno == null)
            {
                return NotFound(new
                {
                    mensagem = "Perfil de aluno não encontrado."
                });
            }

            var anamnese = new Anamnese
            {
                AlunoId = aluno.Id,
                HistoricoAtividade =
                    requisicao.HistoricoAtividade.Trim(),
                Restricoes = requisicao.Restricoes.Trim(),
                Objetivo = requisicao.Objetivo.Trim(),
                Observacoes = requisicao.Observacoes.Trim(),
                DataCadastro = DateTime.UtcNow
            };

            _context.Anamneses.Add(anamnese);
            await _context.SaveChangesAsync();

            var resposta = ConverterParaResposta(anamnese);

            return CreatedAtAction(
                nameof(BuscarPorId),
                new { id = anamnese.Id },
                resposta
            );
        }

        // PUT: api/Anamneses/1
        // Atualiza uma anamnese existente.
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Atualizar(
            int id,
            [FromBody] AnamneseRequisicao requisicao)
        {
            var anamnese = await ConsultaPermitida()
                .FirstOrDefaultAsync(a => a.Id == id);

            if (anamnese == null)
            {
                return NotFound(new
                {
                    mensagem = "Anamnese não encontrada."
                });
            }

            anamnese.HistoricoAtividade =
                requisicao.HistoricoAtividade.Trim();

            anamnese.Restricoes =
                requisicao.Restricoes.Trim();

            anamnese.Objetivo =
                requisicao.Objetivo.Trim();

            anamnese.Observacoes =
                requisicao.Observacoes.Trim();

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/Anamneses/1
        // Exclui uma anamnese autorizada.
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Excluir(int id)
        {
            var anamnese = await ConsultaPermitida()
                .FirstOrDefaultAsync(a => a.Id == id);

            if (anamnese == null)
            {
                return NotFound(new
                {
                    mensagem = "Anamnese não encontrada."
                });
            }

            _context.Anamneses.Remove(anamnese);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Restringe a consulta aos dados do próprio aluno,
        // exceto para usuários com papel Administrador.
        private IQueryable<Anamnese> ConsultaPermitida()
        {
            var consulta = _context.Anamneses
                .Include(a => a.Aluno)
                .AsQueryable();

            if (EhAdministrador)
            {
                return consulta;
            }

            var usuarioId = UsuarioIdAtual;

            if (!usuarioId.HasValue)
            {
                return consulta.Where(a => false);
            }

            return consulta.Where(
                a => a.Aluno.UsuarioId == usuarioId.Value);
        }

        private static AnamneseResposta ConverterParaResposta(
            Anamnese anamnese)
        {
            return new AnamneseResposta
            {
                Id = anamnese.Id,
                AlunoId = anamnese.AlunoId,
                HistoricoAtividade = anamnese.HistoricoAtividade,
                Restricoes = anamnese.Restricoes,
                Objetivo = anamnese.Objetivo,
                Observacoes = anamnese.Observacoes,
                DataCadastro = anamnese.DataCadastro
            };
        }
    }

    // Dados recebidos pela API
    public class AnamneseRequisicao
    {
        public int? AlunoId { get; set; }

        public string HistoricoAtividade { get; set; }
            = string.Empty;

        public string Restricoes { get; set; }
            = string.Empty;

        public string Objetivo { get; set; }
            = string.Empty;

        public string Observacoes { get; set; }
            = string.Empty;
    }

    // Dados devolvidos pela API
    public class AnamneseResposta
    {
        public int Id { get; set; }

        public int AlunoId { get; set; }

        public string HistoricoAtividade { get; set; }
            = string.Empty;

        public string Restricoes { get; set; }
            = string.Empty;

        public string Objetivo { get; set; }
            = string.Empty;

        public string Observacoes { get; set; }
            = string.Empty;

        public DateTime DataCadastro { get; set; }
    }
}