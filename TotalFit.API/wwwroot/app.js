const API_URL = location.protocol.startsWith("http") ? "/api" : "https://localhost:7090/api";

let exerciciosGlobal = [];
let treinosCache = [];
let alunosCache = [];
let meuGraficoPeso = null;
let filtroDiaTreino = "todos";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DIAS_CURTO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const escHtml = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lerSessao = chave => localStorage.getItem(chave) || sessionStorage.getItem(chave);
const getToken = () => lerSessao("token");
const authHeaders = (json = false) => ({ ...(json ? { "Content-Type": "application/json" } : {}), "Authorization": `Bearer ${getToken()}` });
const pad2 = n => String(n).padStart(2, "0");
const isoDia = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
function irPara(page) { document.querySelector(`[data-page="${page}"]`)?.click(); }

function limparSessao() {
    ["token", "user_nome", "user_email", "user_tipo"].forEach(k => { localStorage.removeItem(k); sessionStorage.removeItem(k); });
}

const _fetch = window.fetch.bind(window);
window.fetch = async (...args) => {
    const res = await _fetch(...args);
    if (res.status === 401 && !String(args[0]).includes("/Auth/") && getToken()) {
        limparSessao();
        alert("Sua sessão expirou. Faça login novamente.");
        location.reload();
    }
    return res;
};

(function injetarEstilos() {
    const el = document.createElement("style");
    el.textContent = `
        .semana{display:grid;grid-template-columns:repeat(7,1fr);gap:.5rem;margin-bottom:1.2rem}
        .dia{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:.7rem .2rem;text-align:center;font-size:.8rem;font-weight:700;color:#94a3b8;font-family:inherit}
        button.dia{cursor:pointer}
        .dia small{display:block;font-size:1.05rem;margin-top:.2rem;min-height:1.4rem}
        .dia.hoje{border-color:#3b82f6;color:#3b82f6}
        .dia.ativo{background:#3b82f6;border-color:#3b82f6;color:#fff}
        .dia.feito{background:rgba(16,185,129,.15);border-color:#10b981;color:#10b981}
        .kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin:1.2rem 0}
        .kpi{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:1rem}
        .kpi span{display:block;font-size:.8rem;color:#94a3b8}
        .kpi strong{font-size:1.4rem}
        .checkin-box{background:linear-gradient(135deg,#1d4ed8,#3b82f6);border-radius:16px;padding:1.5rem;display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:1.2rem}
        .checkin-box p{opacity:.85;margin-top:.3rem}
        .badge-dia{display:inline-block;background:rgba(59,130,246,.18);color:#60a5fa;border-radius:999px;padding:.1rem .6rem;font-size:.75rem;font-weight:700}
        .checkin-item{display:flex;justify-content:space-between;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:.6rem 1rem;margin-bottom:.4rem;font-size:.9rem}
    `;
    document.head.appendChild(el);
})();

document.addEventListener("DOMContentLoaded", () => {
    initAuthTabs();
    checkAutoLogin();
    setupNavigation();
});

function initAuthTabs() {
    const loginTab = document.getElementById("loginTab");
    const registerTab = document.getElementById("registerTab");
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const authTitle = document.getElementById("authTitle");
    const authSubtitle = document.getElementById("authSubtitle");

    if (loginTab && registerTab) {
        loginTab.addEventListener("click", () => {
            loginTab.classList.add("active");
            loginTab.setAttribute("aria-selected", "true");
            registerTab.classList.remove("active");
            registerTab.setAttribute("aria-selected", "false");
            loginForm.hidden = false;
            registerForm.hidden = true;
            authTitle.innerText = "Acesse sua conta";
            authSubtitle.innerText = "Entre com seus dados para continuar.";
            clearAuthMessage();
        });

        registerTab.addEventListener("click", () => {
            registerTab.classList.add("active");
            registerTab.setAttribute("aria-selected", "true");
            loginTab.classList.remove("active");
            loginTab.setAttribute("aria-selected", "false");
            registerForm.hidden = false;
            loginForm.hidden = true;
            authTitle.innerText = "Crie sua conta";
            authSubtitle.innerText = "Preencha os campos abaixo para se cadastrar.";
            clearAuthMessage();
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value.trim();
            const senha = document.getElementById("loginPassword").value;
            const rememberMe = document.getElementById("rememberMe")?.checked;

            try {
                const response = await fetch(`${API_URL}/Auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, senha })
                });
                if (!response.ok) throw new Error("E-mail ou senha incorretos.");

                const data = await response.json();
                limparSessao();

                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem("token", data.token);
                storage.setItem("user_nome", data.nome);
                storage.setItem("user_email", email);

                const tipoUsuario = data.tipo || "Aluno";
                storage.setItem("user_tipo", tipoUsuario);

                if (rememberMe) localStorage.setItem("saved_email", email);
                else localStorage.removeItem("saved_email");

                document.getElementById("loginPassword").value = "";
                showAppView(data.nome, tipoUsuario);
            } catch (err) {
                showAuthMessage(err.message || "Erro ao conectar ao servidor.", "error");
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const nome = document.getElementById("registerName").value.trim();
            const email = document.getElementById("registerEmail").value.trim();
            const senha = document.getElementById("registerPassword").value;

            try {
                const response = await fetch(`${API_URL}/Auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome, email, senha })
                });
                if (!response.ok) throw new Error("Erro ao criar conta. E-mail pode já estar em uso.");

                showAuthMessage("Conta criada com sucesso! Faça login para continuar.", "success");
                setTimeout(() => {
                    document.getElementById("loginTab").click();
                    document.getElementById("loginEmail").value = email;
                }, 1500);
            } catch (err) {
                showAuthMessage(err.message, "error");
            }
        });
    }

    const savedEmail = localStorage.getItem("saved_email");
    if (savedEmail) {
        const emailInput = document.getElementById("loginEmail");
        const rememberCheckbox = document.getElementById("rememberMe");
        if (emailInput) emailInput.value = savedEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
}

function showAuthMessage(msg, type) {
    const msgEl = document.getElementById("authMessage");
    if (msgEl) {
        msgEl.innerText = msg;
        msgEl.style.color = type === "error" ? "#ef4444" : "#10b981";
    }
}

function clearAuthMessage() {
    const msgEl = document.getElementById("authMessage");
    if (msgEl) msgEl.innerText = "";
}

function checkAutoLogin() {
    if (getToken()) showAppView(lerSessao("user_nome") || "Usuário", lerSessao("user_tipo") || "Aluno");
}

function isTreinador() {
    const tipo = (lerSessao("user_tipo") || "Aluno").toLowerCase();
    return tipo.includes("treinador") || tipo.includes("master") || tipo.includes("admin");
}

function adicionarNavLink(page, icone, texto) {
    if (document.querySelector(`[data-page="${page}"]`)) return;
    const nav = document.querySelector(".navigation") || document.querySelector("nav");
    if (!nav) return;
    const btn = document.createElement("button");
    btn.className = "nav-link";
    btn.setAttribute("data-page", page);
    btn.innerHTML = `<span class="nav-icon">${icone}</span><span>${texto}</span>`;
    btn.addEventListener("click", () => ativarPagina(btn, page));
    nav.appendChild(btn);
}

function removerNavLink(page) {
    document.querySelectorAll(`[data-page="${page}"]`).forEach(el => el.remove());
}

function ativarPagina(btn, page) {
    document.querySelectorAll(".nav-link").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("breadcrumbPage").innerText = btn.querySelector("span:not(.nav-icon)")?.innerText || page;
    document.getElementById("sidebar")?.classList.remove("open");
    navigateToPage(page);
}

function showAppView(nome, tipo) {
    document.getElementById("loginView").hidden = true;
    document.getElementById("appView").hidden = false;
    document.getElementById("userName").innerText = nome;
    document.getElementById("userRole").innerText = tipo;

    const linkAlunos = document.querySelector('[data-page="alunos"]');
    const linkExercicios = document.querySelector('[data-page="exercicios"]');
    const linkPerfil = document.querySelector('[data-page="perfil"]');

    if (isTreinador()) {
        if (linkAlunos) linkAlunos.style.display = "flex";
        if (linkExercicios) linkExercicios.style.display = "flex";
        if (linkPerfil) linkPerfil.style.display = "none";
        removerNavLink("checkin");
    } else {
        if (linkAlunos) linkAlunos.style.display = "none";
        if (linkExercicios) linkExercicios.style.display = "none";
        adicionarNavLink("perfil", "🎯", "Meu Objetivo");
        adicionarNavLink("checkin", "☑", "Check-in");
    }
    navigateToPage("dashboard");
}

function setupNavigation() {
    document.querySelectorAll(".nav-link").forEach(btn => {
        btn.addEventListener("click", () => ativarPagina(btn, btn.getAttribute("data-page")));
    });

    const menuBtn = document.getElementById("mobileMenuButton");
    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            const aberto = document.getElementById("sidebar")?.classList.toggle("open");
            menuBtn.setAttribute("aria-expanded", String(!!aberto));
        });
    }

    const logoutBtn = document.getElementById("logoutButton");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            limparSessao();
            location.reload();
        });
    }
}

const cabecalho = (titulo, sub, botao = "") =>
    `<div class="content-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
        <div><h2>${titulo}</h2><p>${sub}</p></div>${botao}</div>`;
const botaoNovo = (texto, acao) =>
    `<button class="primary-button" style="width:auto; padding:0.6rem 1.2rem;" onclick="${acao}">${texto}</button>`;

function navigateToPage(page) {
    const container = document.getElementById("pageContent");
    if (!container) return;
    if (meuGraficoPeso) { meuGraficoPeso.destroy(); meuGraficoPeso = null; }

    const eAdmin = isTreinador();
    const restrito = `<p style="color:#ef4444; padding:2rem;">Acesso restrito a Treinadores.</p>`;

    if (page === "dashboard") {
        container.innerHTML = `
            <div class="content-header"><h2>Visão Geral</h2>
                <p>Bem-vindo ao Total Fit. Utilize o menu lateral para acessar suas seções.</p></div>
            <div class="cards-grid">
                ${eAdmin ? `
                <div class="item-card" style="cursor:pointer;" onclick="irPara('alunos')">
                    <h3>👥 Gestão de Alunos</h3>
                    <p>Cadastre, edite e defina objetivos e restrições de todos os alunos.</p>
                </div>` : `
                <div class="item-card" style="cursor:pointer;" onclick="irPara('perfil')">
                    <h3>🎯 Meu Objetivo</h3>
                    <p>Defina seu objetivo principal e registre lesões ou restrições médicas.</p>
                </div>`}
                <div class="item-card" style="cursor:pointer;" onclick="irPara('treinos')">
                    <h3>📋 ${eAdmin ? "Prescrição de Treinos" : "Meus Treinos Prescritos"}</h3>
                    <p>${eAdmin ? "Monte rotinas detalhadas com carga e intervalo." : "Consulte suas rotinas de treino organizadas por dia da semana."}</p>
                </div>
                <div class="item-card" style="cursor:pointer;" onclick="irPara('avaliacoes')">
                    <h3>📊 Avaliações Físicas</h3>
                    <p>Monitore o progresso de peso e histórico corporal com gráficos.</p>
                </div>
                ${!eAdmin ? `
                <div class="item-card" style="cursor:pointer;" onclick="irPara('checkin')">
                    <h3>☑ Check-in</h3>
                    <p>Registre a presença e acompanhe a frequência da semana.</p>
                </div>` : ""}
                ${eAdmin ? `
                <div class="item-card" style="cursor:pointer;" onclick="irPara('exercicios')">
                    <h3>💪 Biblioteca de Exercícios</h3>
                    <p>Consulte, edite e adicione novos exercícios musculares.</p>
                </div>` : ""}
            </div>`;
    } else if (page === "perfil") {
        if (eAdmin) { container.innerHTML = restrito; return; }
        container.innerHTML = `
            ${cabecalho("Meu Perfil & Objetivo", "Defina suas metas pessoais para o Treinador adaptar sua rotina de exercícios.")}
            <div id="dados-perfil-aluno" class="cards-grid"><p style="color:#94a3b8;">Carregando seus dados...</p></div>`;
        carregarPerfilAluno();
    } else if (page === "alunos") {
        if (!eAdmin) { container.innerHTML = restrito; return; }
        container.innerHTML = `
            ${cabecalho("Alunos Cadastrados", "Gerenciamento de cadastros, objetivos e restrições.", botaoNovo("+ Novo Aluno", "abrirModalAluno()"))}
            <div style="margin-bottom: 1.2rem;">
                <input type="text" id="filtroAlunos" placeholder="🔍 Pesquisar aluno por nome ou e-mail..." oninput="filtrarAlunosLocal()" style="width: 100%; padding: 0.8rem; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-family: inherit;">
            </div>
            <div id="lista-alunos" class="cards-grid"></div>`;
        carregarAlunos();
    } else if (page === "exercicios") {
        if (!eAdmin) { container.innerHTML = restrito; return; }
        container.innerHTML = `
            ${cabecalho("Exercícios", "Biblioteca de exercícios musculares.", botaoNovo("+ Novo Exercício", "abrirModalExercicio()"))}
            <div style="margin-bottom: 1.2rem;">
                <input type="text" id="filtroExercicios" placeholder="🔍 Pesquisar exercício por nome ou grupo muscular..." oninput="filtrarExerciciosLocal()" style="width: 100%; padding: 0.8rem; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-family: inherit;">
            </div>
            <div id="lista-exercicios" class="cards-grid"></div>`;
        carregarExercicios();
    } else if (page === "treinos") {
        container.innerHTML = `
            ${cabecalho(eAdmin ? "Treinos Prescritos" : "Meus Treinos",
            eAdmin ? "Rotinas de treinamento dos alunos." : "Sua rotina de exercícios prescrita pelo Personal.",
            eAdmin ? botaoNovo("+ Prescrever Treino", "abrirModalTreino()") : "")}
            <div id="treinos-semana" class="semana"></div>
            <div id="lista-treinos" class="cards-grid"></div>`;
        filtroDiaTreino = "todos";
        carregarTreinos();
    } else if (page === "avaliacoes") {
        container.innerHTML = `
            ${cabecalho("Avaliações Físicas & Metas", "Evolução corporal e histórico de medidas.",
            botaoNovo("+ Registrar Medida", "abrirModalAvaliacao()"))}
            <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1rem; font-size: 1rem; color: #3b82f6;">Gráfico de Evolução de Peso (kg)</h3>
                <div style="position: relative; height: 260px; width: 100%;"><canvas id="graficoPeso"></canvas></div>
            </div>
            <div id="lista-avaliacoes" class="cards-grid"></div>`;
        carregarAvaliacoes();
    } else if (page === "checkin") {
        if (eAdmin) { container.innerHTML = `<p style="color:#ef4444; padding:2rem;">O check-in é exclusivo para contas de aluno.</p>`; return; }
        container.innerHTML = `
            ${cabecalho("Check-in", "Registre sua presença e acompanhe a frequência da semana.")}
            <div id="checkin-conteudo"></div>`;
        carregarCheckin();
    }
}

async function buscarAnamneses() {
    const res = await fetch(`${API_URL}/Anamneses`, { headers: authHeaders() });
    return res.ok ? await res.json() : [];
}

async function salvarAnamneseApi(atual, alunoId, objetivo, restricoes) {
    const res = await fetch(atual ? `${API_URL}/Anamneses/${atual.id}` : `${API_URL}/Anamneses`, {
        method: atual ? "PUT" : "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
            alunoId,
            historicoAtividade: atual?.historicoAtividade ?? "",
            restricoes,
            objetivo,
            observacoes: atual?.observacoes ?? ""
        })
    });
    if (!res.ok) {
        let msg = await res.text();
        try { const j = JSON.parse(msg); msg = j.mensagem || j.message || msg; } catch { }
        throw new Error(`(${res.status}) ${msg || "sem permissão"}`);
    }
}

async function carregarPerfilAluno() {
    try {
        const el = document.getElementById("dados-perfil-aluno");
        if (!el) return;
        const ultima = (await buscarAnamneses())[0];
        const objAtual = ultima?.objetivo || "Não informado";
        const restAtual = ultima?.restricoes || "Nenhuma";
        el.innerHTML = `
            <div class="item-card" style="grid-column: span 2;">
                <div>
                    <h3>👤 ${escHtml(lerSessao("user_nome"))}</h3>
                    <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1); font-size:0.95rem; color:#cbd5e1; line-height: 1.8;">
                        <p>🎯 <strong>Objetivo Principal:</strong> <span style="color:#3b82f6;">${escHtml(objAtual)}</span></p>
                        <p>⚠️ <strong>Lesões / Restrições Médicas:</strong> <span style="color:#f59e0b;">${escHtml(restAtual)}</span></p>
                    </div>
                </div>
                <div style="margin-top:1.5rem;">
                    <button class="primary-button" style="background:#3b82f6; width:auto; padding:0.6rem 1.2rem;" onclick="alunoEditarObjetivo()">🎯 Definir / Atualizar Meu Objetivo</button>
                </div>
            </div>`;
    } catch (e) { console.error(e); }
}

async function alunoEditarObjetivo() {
    const atual = (await buscarAnamneses())[0];
    const objetivo = prompt("Qual o seu Objetivo Principal (ex: Hipertrofia, Perda de Peso):", atual?.objetivo || "");
    if (objetivo === null) return;
    const restricoes = prompt("Possui alguma lesão ou restrição médica?", atual?.restricoes || "Nenhuma");
    if (restricoes === null) return;
    try {
        await salvarAnamneseApi(atual, null, objetivo, restricoes);
        alert("Objetivo atualizado com sucesso!");
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    }
    carregarPerfilAluno();
}

async function carregarAlunos() {
    try {
        const res = await fetch(`${API_URL}/Alunos`, { headers: authHeaders() });
        if (!res.ok) return;
        alunosCache = await res.json();
        const el = document.getElementById("lista-alunos");
        if (!el) return;
        if (!alunosCache.length) {
            el.innerHTML = '<p style="color: #94a3b8;">Nenhum aluno cadastrado.</p>';
            return;
        }

        const porAluno = {};
        (await buscarAnamneses()).forEach(x => { if (!(x.alunoId in porAluno)) porAluno[x.alunoId] = x; });

        el.innerHTML = alunosCache.map(a => {
            const an = porAluno[a.id];
            return `
            <div class="item-card">
                <div>
                    <h3>${escHtml(a.nome)}</h3>
                    <p>📧 ${escHtml(a.email)}</p>
                    <p>📞 ${escHtml(a.telefone || "Não informado")}</p>
                    <div style="margin-top:0.8rem; padding-top:0.6rem; border-top:1px solid rgba(255,255,255,0.1); font-size:0.85rem; color:#cbd5e1;">
                        <strong>🎯 Objetivo & Restrições:</strong><br>
                        <span>• Objetivo: ${escHtml(an?.objetivo || a.objetivo || "Não informado")}</span><br>
                        <span>• Lesões/Restrições: ${escHtml(an?.restricoes || a.observacoes || "Nenhuma")}</span>
                    </div>
                </div>
                <div style="margin-top:1rem; display:flex; gap:0.4rem; flex-wrap:wrap;">
                    <button class="primary-button" style="background:#3b82f6; padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="editarAnamnese(${a.id})">🎯 Objetivo</button>
                    <button class="primary-button" style="background:#f59e0b; padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="editarAluno(${a.id})">✏️ Editar</button>
                    <button class="primary-button" style="background:#ef4444; padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="excluirAluno(${a.id})">Excluir</button>
                </div>
            </div>`;
        }).join("");
    } catch (e) { console.error(e); }
}

function filtrarAlunosLocal() {
    const termo = (document.getElementById("filtroAlunos")?.value || "").toLowerCase();
    const cards = document.querySelectorAll("#lista-alunos .item-card");
    cards.forEach(card => {
        const texto = card.innerText.toLowerCase();
        card.style.display = texto.includes(termo) ? "flex" : "none";
    });
}

async function abrirModalAluno() {
    const nome = prompt("Nome do Aluno:");
    if (!nome) return;
    const email = prompt("E-mail do Aluno:");
    if (!email) return;
    const telefone = prompt("Telefone do Aluno:") || "";
    const objetivo = prompt("Objetivo Principal (ex: Hipertrofia, Emagrecimento):") || "";
    const observacoes = prompt("Histórico / Restrições Médicas (ex: Condromalácia, Hérnia):") || "Nenhuma";

    const res = await fetch(`${API_URL}/Alunos`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ nome, email, telefone, objetivo, observacoes })
    });
    if (res.ok) {
        alert("Aluno cadastrado! Senha inicial de acesso: 123456");
        carregarAlunos();
    } else {
        alert("Erro ao cadastrar aluno: " + (await res.text() || res.status));
    }
}

async function editarAluno(id) {
    const a = alunosCache.find(x => x.id === id);
    if (!a) return;
    const nome = prompt("Editar Nome:", a.nome);
    if (!nome) return;
    const email = prompt("Editar E-mail:", a.email);
    if (!email) return;
    const telefone = prompt("Editar Telefone:", a.telefone || "") ?? "";

    const res = await fetch(`${API_URL}/Alunos/${id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ nome, email, telefone, objetivo: a.objetivo || "", observacoes: a.observacoes || "" })
    });
    if (res.ok) carregarAlunos();
    else alert("Erro ao editar aluno: " + (await res.text() || res.status));
}

async function editarAnamnese(alunoId) {
    const atual = (await buscarAnamneses()).find(x => x.alunoId === alunoId);
    const objetivo = prompt("Objetivo do Aluno:", atual?.objetivo || "");
    if (objetivo === null) return;
    const restricoes = prompt("Restrições / Lesões / Observações:", atual?.restricoes || "");
    if (restricoes === null) return;
    try {
        await salvarAnamneseApi(atual, alunoId, objetivo, restricoes);
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    }
    carregarAlunos();
}

async function excluirAluno(id) {
    if (!confirm("Deseja excluir este aluno?")) return;
    const res = await fetch(`${API_URL}/Alunos/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) carregarAlunos();
    else alert("Não foi possível excluir (o aluno pode ter treinos ou avaliações vinculados).");
}

async function carregarExercicios() {
    try {
        const res = await fetch(`${API_URL}/Exercicios`, { headers: authHeaders() });
        if (!res.ok) return;
        exerciciosGlobal = await res.json();
        const el = document.getElementById("lista-exercicios");
        if (!el) return;
        if (!exerciciosGlobal.length) {
            el.innerHTML = '<p style="color: #94a3b8;">Nenhum exercício cadastrado.</p>';
            return;
        }
        el.innerHTML = exerciciosGlobal.map(e => `
            <div class="item-card">
                <div>
                    <h3>${escHtml(e.nome)}</h3>
                    <p><strong>Grupo:</strong> ${escHtml(e.grupoMuscular)}</p>
                    <p style="font-size:0.85rem; color:#94a3b8;">${escHtml(e.descricao || "")}</p>
                </div>
                <div style="margin-top:1rem; display:flex; gap:0.4rem;">
                    <button class="primary-button" style="background:#f59e0b; padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="editarExercicio(${e.id})">✏️ Editar</button>
                    <button class="primary-button" style="background:#ef4444; padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="excluirExercicio(${e.id})">Excluir</button>
                </div>
            </div>`).join("");
    } catch (e) { console.error(e); }
}

function filtrarExerciciosLocal() {
    const termo = (document.getElementById("filtroExercicios")?.value || "").toLowerCase();
    const cards = document.querySelectorAll("#lista-exercicios .item-card");
    cards.forEach(card => {
        const texto = card.innerText.toLowerCase();
        card.style.display = texto.includes(termo) ? "flex" : "none";
    });
}

function abrirModalExercicio() {
    const nome = prompt("Nome do Exercício:");
    if (!nome) return;
    const grupoMuscular = prompt("Grupo Muscular (ex: Peitoral, Pernas):");
    if (!grupoMuscular) return;
    const descricao = prompt("Descrição / Observações:") || "";

    fetch(`${API_URL}/Exercicios`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ nome, grupoMuscular, descricao })
    }).then(res => { if (res.ok) carregarExercicios(); });
}

async function editarExercicio(id) {
    const ex = exerciciosGlobal.find(x => x.id === id);
    if (!ex) return;
    const nome = prompt("Editar Nome do Exercício:", ex.nome);
    if (!nome) return;
    const grupoMuscular = prompt("Editar Grupo Muscular:", ex.grupoMuscular);
    if (!grupoMuscular) return;
    const descricao = prompt("Editar Descrição:", ex.descricao || "") ?? "";

    const res = await fetch(`${API_URL}/Exercicios/${id}`, {
        method: "PUT",
        headers: authHeaders(true),
        body: JSON.stringify({ id, nome, grupoMuscular, descricao })
    });
    if (res.ok) carregarExercicios();
}

async function excluirExercicio(id) {
    if (!confirm("Deseja excluir este exercício?")) return;
    const res = await fetch(`${API_URL}/Exercicios/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) carregarExercicios();
}

const semAcento = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const normalizarDia = s => DIAS.find(d => semAcento(d) === semAcento(s)) || null;

async function carregarTreinos() {
    try {
        const res = await fetch(`${API_URL}/Treinos`, { headers: authHeaders() });
        if (!res.ok) return;
        treinosCache = await res.json();
        renderSemanaTreinos();
        renderListaTreinos();
    } catch (e) { console.error(e); }
}

function treinosDoUsuario() {
    if (isTreinador()) return treinosCache;
    const nome = (lerSessao("user_nome") || "").toLowerCase();
    return treinosCache.filter(t => (t.alunoNome || "").toLowerCase().includes(nome));
}

function renderSemanaTreinos() {
    const container = document.getElementById("treinos-semana");
    if (!container) return;
    container.style.gridTemplateColumns = "repeat(8, 1fr)";
    const doUsuario = treinosDoUsuario();

    container.innerHTML = `
        <button class="dia ${filtroDiaTreino === "todos" ? "ativo" : ""}" onclick="filtrarDiaTreino('todos')">Todos<small>∞</small></button>
    ` + DIAS.map((d, i) => `
        <button class="dia ${filtroDiaTreino === d ? "ativo" : ""}" onclick="filtrarDiaTreino('${d}')">
            ${DIAS_CURTO[i]}<small>${doUsuario.some(t => semAcento(t.diaSemana) === semAcento(d)) ? "●" : "·"}</small></button>
    `).join("");
}

function filtrarDiaTreino(dia) {
    filtroDiaTreino = dia;
    renderSemanaTreinos();
    renderListaTreinos();
}

function renderListaTreinos() {
    const el = document.getElementById("lista-treinos");
    if (!el) return;
    const eAdmin = isTreinador();

    let treinos = treinosDoUsuario();
    if (filtroDiaTreino !== "todos") treinos = treinos.filter(t => semAcento(t.diaSemana) === semAcento(filtroDiaTreino));

    if (!treinos.length) {
        el.innerHTML = `<p style="color: #94a3b8;">Nenhum treino encontrado para este filtro.</p>`;
        return;
    }

    el.innerHTML = treinos.map(t => {
        const listaEx = t.exercicios || t.treinoExercicios || t.exerciciosTreino || [];
        let exerciciosHtml = '<p style="font-size:0.85rem; color:#64748b; margin: 0.5rem 0;">Nenhum exercício vinculado.</p>';
        if (listaEx.length > 0) {
            exerciciosHtml = '<ul style="margin: 0.8rem 0; padding-left: 1.2rem; color: #cbd5e1; font-size: 0.9rem;">' +
                listaEx.map(e => {
                    const nomeEx = e.nomeExercicio || e.exercicioNome || e.nome || (e.exercicio ? e.exercicio.nome : "Exercício");
                    const carga = e.carga ? ` | ⚡ ${escHtml(e.carga)} kg` : "";
                    const intervalo = ` | ⏱️ ${escHtml(e.intervalo || e.intervaloDescanso || 60)}s desc`;
                    return `<li><strong>${escHtml(nomeEx)}</strong>: ${escHtml(e.series || 3)}×${escHtml(e.repeticoes || 10)}${carga}${intervalo}</li>`;
                }).join("") + "</ul>";
        }

        return `
            <div class="item-card">
                <div>
                    <span class="badge-dia">${escHtml(t.diaSemana || "Geral")}</span>
                    <h3 style="margin-top:0.4rem;">${escHtml(t.nome)}</h3>
                    <p><strong>Aluno:</strong> ${escHtml(t.alunoNome || "Não informado")}</p>
                    <p style="font-size:0.85rem; color:#94a3b8; margin-top:0.3rem;">${escHtml(t.descricao || "Sem observações")}</p>
                    <div style="margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.5rem;">
                        <strong style="font-size:0.85rem; color:#3b82f6;">🏋️ Exercícios:</strong>
                        ${exerciciosHtml}
                    </div>
                </div>
                ${eAdmin ? `
                <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <button class="primary-button" style="background:#3b82f6; padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="adicionarExercicioAoTreino(${t.id})">+ Exercício</button>
                    <button class="primary-button" style="background:#ef4444; padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="excluirTreino(${t.id})">Excluir</button>
                </div>` : ""}
            </div>`;
    }).join("");
}

async function abrirModalTreino() {
    const nome = prompt("Nome do Treino (ex: Treino A - Peito):");
    if (!nome) return;

    const diaIn = prompt("Dia da semana (Segunda, Terça, Quarta, Quinta, Sexta, Sábado, Domingo). Deixe vazio para qualquer dia:") || "";
    const diaSemana = normalizarDia(diaIn);
    if (diaIn.trim() && !diaSemana) {
        alert("Dia inválido. Use: Segunda, Terça, Quarta, Quinta, Sexta, Sábado ou Domingo.");
        return;
    }

    const resAlunos = await fetch(`${API_URL}/Alunos`, { headers: authHeaders() });
    if (!resAlunos.ok) return;
    const alunos = await resAlunos.json();
    if (!alunos.length) { alert("Cadastre um aluno primeiro."); return; }

    const alunoId = parseInt(prompt("Selecione o ID do aluno:\n" + alunos.map(a => `${a.id}: ${a.nome}`).join("\n")));
    if (!alunoId) return;

    const descricao = prompt("Observações do treino:") || "";

    const res = await fetch(`${API_URL}/Treinos`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ nome, alunoId, diaSemana: diaSemana || "Segunda", descricao })
    });

    if (res.ok) carregarTreinos();
    else alert("Erro ao cadastrar treino.");
}

async function adicionarExercicioAoTreino(treinoId) {
    const resEx = await fetch(`${API_URL}/Exercicios`, { headers: authHeaders() });
    if (!resEx.ok) return;
    const exercicios = await resEx.json();
    if (!exercicios.length) { alert("Nenhum exercício cadastrado. Cadastre exercícios primeiro."); return; }

    const exercicioId = parseInt(prompt("Selecione o ID do exercício:\n" + exercicios.map(e => `${e.id}: ${e.nome} (${e.grupoMuscular})`).join("\n")));
    if (!exercicioId) return;

    const series = parseInt(prompt("Número de séries:", "3")) || 3;
    const repeticoes = parseInt(prompt("Número de repetições:", "10")) || 10;
    const carga = parseFloat(prompt("Carga em kg (opcional):", "0")) || 0;

    const res = await fetch(`${API_URL}/Treinos/${treinoId}/exercicios`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ exercicioId, series, repeticoes, carga })
    });

    if (res.ok) carregarTreinos();
    else alert("Não foi possível vincular o exercício ao treino.");
}

async function excluirTreino(id) {
    if (!confirm("Deseja excluir este treino?")) return;
    const res = await fetch(`${API_URL}/Treinos/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) carregarTreinos();
}

async function carregarAvaliacoes() {
    try {
        const res = await fetch(`${API_URL}/AvaliacoesFisicas`, { headers: authHeaders() });
        if (!res.ok) return;
        const avaliacoes = await res.json();
        renderGraficoPeso(avaliacoes);

        const el = document.getElementById("lista-avaliacoes");
        if (!el) return;
        if (!avaliacoes.length) {
            el.innerHTML = '<p style="color: #94a3b8;">Nenhuma avaliação física cadastrada.</p>';
            return;
        }

        const eAdmin = isTreinador();
        el.innerHTML = avaliacoes.map(a => {
            const dataFormatada = a.data ? new Date(a.data).toLocaleDateString('pt-BR') : "Data não informada";
            return `
            <div class="item-card">
                <div>
                    <span class="badge-dia">${escHtml(dataFormatada)}</span>
                    <h3 style="margin-top:0.4rem;">📊 Avaliação Corporal</h3>
                    <p><strong>Aluno:</strong> ${escHtml(a.alunoNome || "Desconhecido")}</p>
                    <p><strong>Peso:</strong> ${escHtml(a.peso)} kg</p>
                    <p><strong>Altura:</strong> ${escHtml(a.altura)} m</p>
                    <p><strong>% Gordura:</strong> ${escHtml(a.percentualGordura || 0)}%</p>
                </div>
                ${eAdmin ? `
                <div style="margin-top:1rem;">
                    <button class="primary-button" style="background:#ef4444; padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="excluirAvaliacao(${a.id})">Excluir</button>
                </div>` : ""}
            </div>`;
        }).join("");
    } catch (e) { console.error(e); }
}

function renderGraficoPeso(avaliacoes) {
    const canvas = document.getElementById("graficoPeso");
    if (!canvas || !window.Chart) return;
    if (meuGraficoPeso) meuGraficoPeso.destroy();

    const pesos = avaliacoes.map(a => a.peso);
    const labels = avaliacoes.map((a, i) => a.data ? new Date(a.data).toLocaleDateString('pt-BR') : `Medida ${i + 1}`);

    meuGraficoPeso = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['Sem dados'],
            datasets: [{
                label: 'Peso (kg)',
                data: pesos.length ? pesos : [0],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
            }
        }
    });
}

async function abrirModalAvaliacao() {
    const peso = parseFloat(prompt("Informe seu Peso (kg):"));
    if (!peso) return;
    const altura = parseFloat(prompt("Informe sua Altura (m, ex: 1.75):"));
    if (!altura) return;
    const percentualGordura = parseFloat(prompt("Percentual de Gordura % (opcional):", "0")) || 0;

    let alunoId = 0;
    if (isTreinador()) {
        const resAlunos = await fetch(`${API_URL}/Alunos`, { headers: authHeaders() });
        if (!resAlunos.ok) return;
        const alunos = await resAlunos.json();
        if (!alunos.length) { alert("Cadastre um aluno primeiro."); return; }
        alunoId = parseInt(prompt("Selecione o ID do aluno:\n" + alunos.map(a => `${a.id}: ${a.nome}`).join("\n")));
        if (!alunoId) return;
    }

    const res = await fetch(`${API_URL}/AvaliacoesFisicas`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({ alunoId, peso, altura, percentualGordura })
    });

    if (res.ok) carregarAvaliacoes();
    else alert("Erro ao registrar avaliação física.");
}

async function excluirAvaliacao(id) {
    if (!confirm("Deseja excluir esta avaliação?")) return;
    const res = await fetch(`${API_URL}/AvaliacoesFisicas/${id}`, { method: "DELETE", headers: authHeaders() });
    if (res.ok) carregarAvaliacoes();
}

async function carregarCheckin() {
    const container = document.getElementById("checkin-conteudo");
    if (!container) return;

    const hojeObj = new Date();
    const hojeIso = `${hojeObj.getFullYear()}-${pad2(hojeObj.getMonth() + 1)}-${pad2(hojeObj.getDate())}`;
    const diaSemanaAtualIndex = (hojeObj.getDay() + 6) % 7;

    try {
        const res = await fetch(`${API_URL}/CheckIns`, { headers: authHeaders() });
        let checkins = [];
        let jaFezHoje = false;

        if (res.ok) {
            checkins = await res.json();
            jaFezHoje = checkins.some(c => {
                if (!c) return false;
                const d = c.data || c.Data;
                if (!d) return false;
                return String(d).substring(0, 10) === hojeIso;
            });
        }

        const datasCheckin = checkins.map(c => String(c.data || c.Data).substring(0, 10));

        const semanaHtml = DIAS_CURTO.map((diaAbrev, idx) => {
            const d = new Date(hojeObj);
            d.setDate(hojeObj.getDate() - diaSemanaAtualIndex + idx);
            const dIso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

            const eHoje = idx === diaSemanaAtualIndex;
            const fezNesteDia = datasCheckin.includes(dIso);

            let classeCss = "dia";
            if (fezNesteDia) classeCss += " feito";
            else if (eHoje) classeCss += " hoje ativo";

            return `
                <div class="${classeCss}">
                    ${diaAbrev}
                    <small>${d.getDate()}</small>
                </div>`;
        }).join("");

        container.innerHTML = `
            <div class="checkin-box" style="${jaFezHoje ? 'background: linear-gradient(135deg, #059669, #10b981);' : ''}">
                <div>
                    <h3 style="color:#fff; margin:0;">${jaFezHoje ? "Check-in Realizado com Sucesso!" : "Pronto para treinar?"}</h3>
                    <p style="color:#e2e8f0; font-size:0.9rem;">${jaFezHoje ? "Seu treino de hoje já está contabilizado na sua frequência." : "Faça o check-in de hoje para manter sua frequência."}</p>
                </div>
                ${!jaFezHoje
                ? `<button class="primary-button" style="background:#fff; color:#1d4ed8; font-weight:bold; width:auto; padding:0.8rem 1.5rem;" onclick="confirmarCheckin()">Fazer check-in</button>`
                : `<span style="background:rgba(255,255,255,0.2); padding:0.6rem 1.2rem; border-radius:8px; font-weight:700; color:#fff;">✓ Concluído</span>`}
            </div>

            <div class="semana" style="margin-top: 1.5rem;">
                ${semanaHtml}
            </div>

            <div class="kpis">
                <div class="kpi"><span>Data de Hoje</span><strong>${hojeIso}</strong></div>
                <div class="kpi"><span>Status</span><strong style="color:${jaFezHoje ? '#10b981' : '#3b82f6'};">${jaFezHoje ? 'Registrado' : 'Disponível'}</strong></div>
            </div>`;
    } catch (e) {
        console.error("Erro ao carregar o módulo de check-in:", e);
    }
}

async function confirmarCheckin() {
    try {
        const res = await fetch(`${API_URL}/CheckIns`, {
            method: "POST",
            headers: authHeaders(true)
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            alert(data.mensagem || "Check-in realizado com sucesso! Bom treino!");
            await carregarCheckin();
        } else {
            alert(data.mensagem || "Não foi possível realizar o check-in.");
            await carregarCheckin();
        }
    } catch (err) {
        alert("Erro ao conectar ao servidor de check-in.");
    }
}