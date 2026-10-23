using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
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
    public class CheckInsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CheckInsController(AppDbContext context)
        {
            _context = context;
        }

        private bool EhTreinador => User.IsInRole("Treinador") || User.IsInRole("Admin") ||
                                   (User.FindFirst(ClaimTypes.Role)?.Value?.ToLower().Contains("admin") ?? false) ||
                                   (User.FindFirst(ClaimTypes.Role)?.Value?.ToLower().Contains("treinador") ?? false);

        private async Task<Aluno?> AlunoAtual()
        {
            if (EhTreinador) return null;

            var idTexto = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idTexto, out var usuarioId)) return null;

            var aluno = await _context.Alunos.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
            if (aluno != null) return aluno;

            // Auto-provisão para alunos criados via registo público
            aluno = new Aluno
            {
                UsuarioId = usuarioId,
                Telefone = string.Empty,
                Objetivo = "Geral",
                Observacoes = "Nenhuma"
            };

            _context.Alunos.Add(aluno);
            try
            {
                await _context.SaveChangesAsync();
            }
            catch
            {
                aluno = await _context.Alunos.FirstOrDefaultAsync(a => a.UsuarioId == usuarioId);
            }

            return aluno;
        }

        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            if (EhTreinador) return StatusCode(403, new { mensagem = "Acesso restrito a alunos." });

            var aluno = await AlunoAtual();
            if (aluno == null) return Ok(new List<object>());

            var lista = await _context.CheckIns
                .Where(c => c.AlunoId == aluno.Id)
                .OrderByDescending(c => c.Data)
                .Select(c => new
                {
                    c.Id,
                    c.AlunoId,
                    data = c.Data.ToString("yyyy-MM-dd")
                })
                .ToListAsync();

            return Ok(lista);
        }

        [HttpPost]
        public async Task<IActionResult> Registrar()
        {
            if (EhTreinador) return StatusCode(403, new { mensagem = "Contas de Treinador / Administrador não fazem check-in." });

            var aluno = await AlunoAtual();
            if (aluno == null) return NotFound(new { mensagem = "Perfil de aluno não encontrado." });

            var hoje = DateTime.Today;
            var jaFez = await _context.CheckIns.AnyAsync(c => c.AlunoId == aluno.Id && c.Data.Date == hoje);
            if (jaFez) return Ok(new { mensagem = "Check-in de hoje já registrado." });

            _context.CheckIns.Add(new CheckIn { AlunoId = aluno.Id, Data = hoje });
            await _context.SaveChangesAsync();

            return Ok(new { mensagem = "Check-in registrado com sucesso!" });
        }
    }
}