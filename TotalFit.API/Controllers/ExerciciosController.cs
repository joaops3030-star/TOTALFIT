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
    public class ExerciciosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ExerciciosController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var exercicios = await _context.Exercicios.ToListAsync();
            return Ok(exercicios);
        }

        [HttpPost]
        [Authorize(Roles = "Treinador,Admin")]
        public async Task<IActionResult> Create([FromBody] Exercicio dto)
        {
            if (dto == null) return BadRequest("Dados inválidos.");

            _context.Exercicios.Add(dto);
            await _context.SaveChangesAsync();
            return Ok(dto);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Treinador,Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] Exercicio dto)
        {
            var exercicio = await _context.Exercicios.FindAsync(id);
            if (exercicio == null) return NotFound("Exercício não encontrado.");

            exercicio.Nome = dto.Nome;
            exercicio.GrupoMuscular = dto.GrupoMuscular;
            exercicio.Descricao = dto.Descricao;

            await _context.SaveChangesAsync();
            return Ok(exercicio);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Treinador,Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var exercicio = await _context.Exercicios.FindAsync(id);
            if (exercicio == null) return NotFound("Exercício não encontrado.");

            _context.Exercicios.Remove(exercicio);
            await _context.SaveChangesAsync();
            return Ok(new { mensagem = "Exercício excluído com sucesso!" });
        }
    }
}