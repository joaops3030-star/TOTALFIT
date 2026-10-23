using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.IdentityModel.Tokens;
using TotalFit.API.Data;
using TotalFit.API.Models;

var builder = WebApplication.CreateBuilder(args);

// Configuração do CORS para liberar o consumo pelo front-end
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configuração do DbContext com SQL Server e supressão de avisos
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
    options.ConfigureWarnings(warnings => warnings.Ignore(RelationalEventId.PendingModelChangesWarning));
});

// Registrar o IPasswordHasher para hash de senhas
builder.Services.AddScoped<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();

// Configuração da Autenticação JWT
var jwtKey = builder.Configuration["Jwt:Key"] ?? "MinhaChaveSuperSecretaECompridaDoTotalFit2026!";
var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

app.UseCors("AllowAll");

// Garantir inicialização do banco
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        context.Database.EnsureCreated();

        // Seed inicial de Exercícios se a tabela estiver vazia
        if (!context.Exercicios.Any())
        {
            context.Exercicios.AddRange(
                new Exercicio { Nome = "Supino Reto com Barra", GrupoMuscular = "Peitoral", Descricao = "4 séries de 10 a 12 repetições" },
                new Exercicio { Nome = "Agachamento Livre", GrupoMuscular = "Membros Inferiores", Descricao = "4 séries de 8 a 10 repetições" },
                new Exercicio { Nome = "Puxada Frontal", GrupoMuscular = "Dorsal", Descricao = "3 séries de 12 repetições" },
                new Exercicio { Nome = "Rosca Direta", GrupoMuscular = "Bíceps", Descricao = "3 séries de 12 repetições" }
            );
            context.SaveChangesAsync().Wait();
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Erro na inicialização da base de dados.");
    }
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();