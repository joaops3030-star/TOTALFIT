using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TotalFit.API.Migrations
{
    /// <inheritdoc />
    public partial class AdicionarColunaDiaSemanaTreino : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DiaSemana",
                table: "Treinos",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiaSemana",
                table: "Treinos");
        }
    }
}
