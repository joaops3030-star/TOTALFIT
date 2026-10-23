# TotalFit - Projeto da Cadeira de Desenvolvimento Web

Projeto desenvolvido para a matéria de programação orientada a objetos I. É um sistema web (SPA) para gestão de treinos e acompanhamento de alunos em academias, tipo o MFIT Personal.

---

## O que foi usado?

* **Back-End:** C# / .NET 8 (Web API)
* **Banco de Dados:** Entity Framework Core + SQL Server (com Migrations)
* **Autenticação:** JWT (com níveis de acesso pra Aluno e Treinador)
* **Front-End:** HTML, CSS e JavaScript puro (Vanilla JS)
* **Biblioteca externa:** Chart.js para montar o gráfico de peso

---

## Funcionalidades

### Área do Treinador
- Cadastrar, editar e excluir alunos.
- Definir o objetivo e registrar se o aluno tem alguma lesão ou restrição médica.
- Cadastrar exercícios separados por grupo muscular.
- Montar a rotina de treino por dia da semana (séries, repetições, carga e descanso).
- Registrar as avaliações físicas dos alunos.
- Filtro de busca na lista de alunos e exercícios.

### Área do Aluno
- Ver os treinos que o personal passou divididos pelos dias da semana.
- Atualizar seu próprio objetivo e avisar sobre lesões.
- Acompanhar o histórico de avaliações físicas (ordenadas da mais recente para a mais antiga) e ver a evolução do peso no gráfico.
- Fazer check-in diário para marcar presença nos treinos.

---

## Como rodar o projeto localmente

1. **Clonar o repositório:**
   ```bash
   git clone [https://github.com/SEU_USUARIO/TOTALFIT.git](https://github.com/SEU_USUARIO/TOTALFIT.git)