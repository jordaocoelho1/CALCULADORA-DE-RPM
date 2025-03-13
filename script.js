// Função para aplicar máscara de milhares (ex: 50000 -> "50,000")
function aplicarMascaraMilhares(valor) {
  return valor.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Função para validar o total de visualizações (0 a 999.999.999.999)
function validarTotalVisualizacoes(valor) {
  const numero = parseInt(valor.replace(/\D/g, ""), 10) || 0;
  if (numero < 0) {
    return 0; // Mínimo de 0
  }
  if (numero > 999999999999) {
    // Máximo de 999.999.999.999
    return 999999999999;
  }
  return numero;
}

// Função para formatar números (ex: 50000 -> "50 mil visualizações")
function formatarNumero(numero) {
  if (isNaN(numero) || numero === 0) {
    return "0 visualizações";
  }

  if (numero >= 1000000000) {
    const bilhoes = numero / 1000000000;
    const texto = bilhoes === 1 ? "bilhão" : "bilhões";
    return `${bilhoes
      .toFixed(1)
      .replace(/\.0$/, "")} ${texto} de visualizações`;
  } else if (numero >= 1000000) {
    const milhoes = numero / 1000000;
    const texto = milhoes === 1 ? "milhão" : "milhões";
    return `${milhoes
      .toFixed(1)
      .replace(/\.0$/, "")} ${texto} de visualizações`;
  } else if (numero >= 1000) {
    const milhares = numero / 1000;
    return `${milhares.toFixed(1).replace(/\.0$/, "")} mil visualizações`;
  } else {
    return `${numero} visualizações`;
  }
}

// Função para buscar a taxa de câmbio do BACEN
async function buscarTaxaCambio(codigoMoeda) {
  const codigosMoedas = {
    USD: 1, // Dólar Americano
    EUR: 21619, // Euro
    GBP: 21620, // Libra Esterlina
  };

  if (!codigosMoedas[codigoMoeda]) {
    throw new Error(`Moeda '${codigoMoeda}' não suportada.`);
  }

  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigosMoedas[codigoMoeda]}/dados/ultimos/1?formato=json`;
  const response = await fetch(url);

  if (response.ok) {
    const data = await response.json();
    return parseFloat(data[0].valor); // Retorna a taxa de câmbio
  } else {
    throw new Error("Erro ao buscar taxa de câmbio.");
  }
}

// Função para atualizar as moedas na seção "Moedas Hoje"
async function atualizarMoedasHoje() {
  try {
    const usd = await buscarTaxaCambio("USD");
    const eur = await buscarTaxaCambio("EUR");
    const gbp = await buscarTaxaCambio("GBP");

    document.getElementById("usdHoje").innerText = `R$ ${usd.toFixed(2)}`;
    document.getElementById("eurHoje").innerText = `R$ ${eur.toFixed(2)}`;
    document.getElementById("gbpHoje").innerText = `R$ ${gbp.toFixed(2)}`;
  } catch (error) {
    console.error("Erro ao atualizar moedas:", error);
    document.getElementById("usdHoje").innerText = "Erro ao carregar";
    document.getElementById("eurHoje").innerText = "Erro ao carregar";
    document.getElementById("gbpHoje").innerText = "Erro ao carregar";
  }
}

// Função para salvar o cálculo no histórico (limite de 10 resultados)
function salvarNoHistorico(valorMoeda, valorBRL, moeda) {
  const historico = JSON.parse(localStorage.getItem("historico")) || [];

  // Adiciona o novo cálculo ao histórico
  historico.push({
    data: new Date().toLocaleString(),
    valorMoeda: `${valorMoeda.toFixed(2)} ${moeda}`,
    valorBRL: `R$ ${valorBRL.toFixed(2)}`,
  });

  // Limita o histórico a 10 resultados
  if (historico.length > 10) {
    historico.shift(); // Remove o resultado mais antigo
  }

  localStorage.setItem("historico", JSON.stringify(historico));
  atualizarHistorico();
}

// Função para atualizar o histórico na tela
function atualizarHistorico() {
  const historico = JSON.parse(localStorage.getItem("historico")) || [];

  // Ordena o histórico por data (do mais recente para o mais antigo)
  historico.sort((a, b) => new Date(b.data) - new Date(a.data));

  const historicoDiv = document.getElementById("historico");
  historicoDiv.innerHTML = "<h2>Histórico de Cálculos</h2>";
  historico.forEach((item, index) => {
    historicoDiv.innerHTML += `
          <div class="historico-item">
              <p><strong>Data:</strong> ${item.data}</p>
              <p><strong>Valor na Moeda:</strong> ${item.valorMoeda}</p>
              <p><strong>Valor em BRL:</strong> ${item.valorBRL}</p>
          </div>
      `;
  });

  // Adiciona o botão de limpar histórico
  historicoDiv.innerHTML += `<button id="limparHistorico">Limpar Histórico</button>`;

  // Adiciona o evento de clique ao botão de limpar histórico
  document
    .getElementById("limparHistorico")
    .addEventListener("click", limparHistorico);
}

// Função para limpar o histórico
function limparHistorico() {
  localStorage.removeItem("historico");
  atualizarHistorico(); // Atualiza a exibição do histórico
}

// Função para calcular o valor aproximado
async function calcular() {
  try {
    const totalVisualizacoes =
      parseInt(
        document.getElementById("totalVisualizacoes").value.replace(/\D/g, ""),
        10
      ) || 0;
    const percentualValidas = parseFloat(
      document.getElementById("percentualValidas").value
    );
    const rpm = parseFloat(document.getElementById("rpm").value);
    const moeda = document.getElementById("moeda").value;

    if (percentualValidas < 0 || percentualValidas > 100) {
      throw new Error(
        "O percentual de visualizações válidas deve estar entre 0 e 100."
      );
    }

    const visualizacoesValidas = totalVisualizacoes * (percentualValidas / 100);
    const valorMoeda = (rpm * visualizacoesValidas) / 1000;

    const taxaCambio = await buscarTaxaCambio(moeda);
    const valorBRL = valorMoeda * taxaCambio;

    // Exibe a seção de resultados
    document.getElementById("resultado").style.display = "block";

    document.getElementById(
      "valorMoeda"
    ).innerText = `Valor na moeda selecionada (${moeda}): ${Number(
      valorMoeda.toFixed(2)
    ).toString()} ${moeda}`;
    document.getElementById(
      "valorBRL"
    ).innerText = `Valor convertido para BRL: R$ ${Number(
      valorBRL.toFixed(2)
    ).toString()}`;

    // Salvar no histórico
    salvarNoHistorico(valorMoeda, valorBRL, moeda);
  } catch (error) {
    alert(error.message);
  }
}

// Função para validar se todos os campos estão preenchidos
function validarCampos() {
  const totalVisualizacoes = document
    .getElementById("totalVisualizacoes")
    .value.trim();
  const percentualValidas = document
    .getElementById("percentualValidas")
    .value.trim();
  const rpm = document.getElementById("rpm").value.trim();
  const moeda = document.getElementById("moeda").value;

  // Verifica se todos os campos estão preenchidos
  const todosPreenchidos =
    totalVisualizacoes && percentualValidas && rpm && moeda;

  // Habilita ou desabilita o botão
  const botaoCalcular = document.querySelector("#calculadoraForm button");
  botaoCalcular.disabled = !todosPreenchidos;
}

// Adicionar validação em tempo real para todos os campos
// Aplica máscara e formatação ao campo de visualizações
document
  .getElementById("totalVisualizacoes")
  .addEventListener("input", function (e) {
    const valor = e.target.value.replace(/\D/g, "");
    e.target.value = aplicarMascaraMilhares(valor);
    document.getElementById("visualizacoesFormatadas").innerText =
      formatarNumero(parseInt(valor, 10) || 0);
  });

document
  .getElementById("percentualValidas")
  .addEventListener("input", validarCampos);
document.getElementById("rpm").addEventListener("input", validarCampos);
document.getElementById("moeda").addEventListener("change", validarCampos);

// Validação em tempo real para o campo de % de visualizações válidas
document
  .getElementById("percentualValidas")
  .addEventListener("input", function (e) {
    const valor = parseFloat(e.target.value);
    if (valor < 0 || valor > 100) {
      e.target.setCustomValidity("O percentual deve estar entre 0 e 100.");
    } else {
      e.target.setCustomValidity("");
    }
  });

// Alternar Modo Escuro
document
  .getElementById("toggleDarkMode")
  .addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");
    // Salvar preferência no localStorage
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDarkMode);
  });

// Atualiza as moedas, verifica o modo escuro e valida os campos ao carregar a página
window.addEventListener("load", function () {
  atualizarMoedasHoje(); // Atualiza as moedas
  const isDarkMode = localStorage.getItem("darkMode") === "true";
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
  }
  validarCampos(); // Valida os campos ao carregar a página
});

// Atualiza o histórico ao carregar a página
atualizarHistorico();
