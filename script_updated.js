document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.section');
    const buttons = document.querySelectorAll('.botoes button');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.getAttribute('data-section');
            sections.forEach(sec => {
                sec.style.display = sec.id === target ? 'block' : 'none';
            });
        });
    });
    // Activate first
    buttons[0].click();
    renderCharts();
    loadSatisfaction();
    
    // Carregar dados para as novas abas
    loadTransacoes();
    loadCampanhas();
});

async function fetchJson(file) {
    try {
        const res = await fetch('/' + file);
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        return res.json();
    } catch (error) {
        console.error(`Erro ao carregar ${file}:`, error);
        return null;
    }
}

async function fetchCsv(file) {
    try {
        const res = await fetch('/' + file);
        if (!res.ok) throw new Error(`Erro ${res.status}`);
        const text = await res.text();
        return parseCSV(text);
    } catch (error) {
        console.error(`Erro ao carregar ${file}:`, error);
        return null;
    }
}

function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).filter(line => line.trim() !== '').map(line => {
        const values = line.split(',');
        const entry = {};
        
        headers.forEach((header, index) => {
            entry[header.trim()] = values[index] ? values[index].trim() : '';
        });
        
        return entry;
    });
}

let clusterChart, campanhaChart;
let transacoesData = [];
let campanhasData = [];
let currentTransacoesPage = 1;
const transacoesPerPage = 10;

async function renderCharts() {
    const clusterData = await fetchJson('cluster_points.json');
    const clusterDiag = await fetchJson('cluster_diagnostico.json');
    const campData = await fetchJson('preferencias_campanhas.json');
    const regData = await fetchJson('regression_coeffs.json');
    const clvData = await fetchJson('clv_segments.json');

    if (!clusterData || !clusterDiag || !campData || !regData || !clvData) {
        console.error("Falha ao carregar dados para os gráficos");
        return;
    }

    // Cluster scatter
    const ctx1 = document.getElementById('clusterChart').getContext('2d');
    clusterChart = new Chart(ctx1, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Clusters',
          data: clusterData.map(p => ({x: p.pca1, y: p.pca2})),
          backgroundColor: clusterData.map(p => ['#FF6384','#36A2EB','#FFCE56'][p.cluster])
        }]
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `Cluster: ${clusterData[context.dataIndex].cluster}`;
              }
            }
          }
        },
        scales: { 
          x: { title: { display: true, text: 'PCA1' }}, 
          y: { title: { display: true, text: 'PCA2' }}
        }
      }
    });

    // Cluster diag
    const ctx2 = document.getElementById('clusterDiagChart').getContext('2d');
    new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: clusterDiag.map(c => 'Cluster ' + c.cluster),
        datasets: [
          { 
            label: 'Freq Compras', 
            data: clusterDiag.map(c => c.frequencia_compras),
            backgroundColor: '#36A2EB'
          },
          { 
            label: 'Total Gasto', 
            data: clusterDiag.map(c => c.total_gasto),
            backgroundColor: '#FF6384'
          },
          { 
            label: 'Última Compra', 
            data: clusterDiag.map(c => c.ultima_compra),
            backgroundColor: '#FFCE56'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        }
      }
    });

    // Campanha
    const ctx3 = document.getElementById('campanhaChart').getContext('2d');
    campanhaChart = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: campData.map(c => c.campanha),
        datasets: [
          { 
            label: 'Gasto Médio/Cliente', 
            data: campData.map(c => c.gasto_medio_por_cliente),
            backgroundColor: '#36A2EB',
            yAxisID: 'y'
          },
          { 
            label: 'ROI', 
            data: campData.map(c => c.roi_estimado),
            backgroundColor: '#FF6384',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Gasto Médio (R$)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'ROI'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    });

    // Regression
    const ctx4 = document.getElementById('regressionChart').getContext('2d');
    new Chart(ctx4, {
      type: 'bar',
      data: {
        labels: regData.map(r => r.variable),
        datasets: [{ 
          label: 'Coeficiente', 
          data: regData.map(r => r.coefficient),
          backgroundColor: regData.map(r => r.coefficient > 0 ? '#4CAF50' : '#F44336')
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });

    // CLV
    const ctx5 = document.getElementById('clvChart').getContext('2d');
    new Chart(ctx5, {
      type: 'pie',
      data: { 
        labels: clvData.map(c => c.segmento_valor || c.index), 
        datasets: [{ 
          data: clvData.map(c => c.count),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
        }] 
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right'
          }
        }
      }
    });

    // Preencher os filtros
    const clusterFilter = document.getElementById('clusterFilter');
    const clusters = [...new Set(clusterData.map(item => item.cluster))].sort((a, b) => a - b);
    clusters.forEach(cluster => {
        const option = document.createElement('option');
        option.value = cluster;
        option.textContent = `Cluster ${cluster}`;
        clusterFilter.appendChild(option);
    });

    const campanhaFilter = document.getElementById('campanhaFilter');
    const campanhas = [...new Set(campData.map(item => item.campanha))];
    campanhas.forEach(campanha => {
        const option = document.createElement('option');
        option.value = campanha;
        option.textContent = campanha;
        campanhaFilter.appendChild(option);
    });
}

async function loadSatisfaction() {
    const container = document.getElementById('tableContainer');
    try {
        const data = await fetchJson('satisfacao.json');
        if (!data) {
            container.innerHTML = `<div class="erro">Erro ao carregar dados de satisfação</div>`;
            return;
        }
        
        // build table
        const table = document.createElement('table');
        const thead = table.createTHead();
        const hrow = thead.insertRow();
        ['Campanha', 'Satisfação Média'].forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            hrow.appendChild(th);
        });
        const tbody = table.createTBody();
        data.forEach(r => {
            const tr = tbody.insertRow();
            const td1 = tr.insertCell(); td1.textContent = r.campanha;
            const td2 = tr.insertCell(); td2.textContent = r.satisfacao_media.toFixed(2);
        });
        container.innerHTML = '';
        container.appendChild(table);
    } catch (err) {
        container.innerHTML = `<div class="erro">Erro ao carregar satisfação: ${err.message}</div>`;
    }
}

async function loadTransacoes() {
    const container = document.getElementById('transacoesTableContainer');
    const paginationContainer = document.getElementById('transacoesPagination');
    
    try {
        // Mostrar loading
        container.innerHTML = '<div class="loading"></div>';
        
        // Carregar dados
        transacoesData = await fetchCsv('Transa__es_Completas.csv');
        
        if (!transacoesData || transacoesData.length === 0) {
            container.innerHTML = `<div class="erro">Erro ao carregar dados de transações</div>`;
            return;
        }
        
        // Atualizar estatísticas
        updateTransacoesStats(transacoesData);
        
        // Preencher filtro de campanhas
        const transacaoFilter = document.getElementById('transacaoFilter');
        const campanhas = [...new Set(transacoesData.map(item => item.campanha))].sort();
        campanhas.forEach(campanha => {
            const option = document.createElement('option');
            option.value = campanha;
            option.textContent = campanha;
            transacaoFilter.appendChild(option);
        });
        
        // Configurar datas para os filtros
        const dates = transacoesData.map(item => new Date(item.data_compra));
        const minDate = new Date(Math.min.apply(null, dates));
        const maxDate = new Date(Math.max.apply(null, dates));
        
        document.getElementById('dataInicioFilter').valueAsDate = minDate;
        document.getElementById('dataFimFilter').valueAsDate = maxDate;
        
        // Configurar evento de filtro
        document.getElementById('aplicarFiltros').addEventListener('click', () => {
            filterTransacoes();
        });
        
        // Renderizar gráfico temporal
        renderTransacoesTempoChart(transacoesData);
        
        // Renderizar tabela inicial
        renderTransacoesTable(transacoesData, currentTransacoesPage);
        
    } catch (err) {
        container.innerHTML = `<div class="erro">Erro ao carregar transações: ${err.message}</div>`;
    }
}

function updateTransacoesStats(data) {
    // Total de transações
    document.getElementById('totalTransacoes').textContent = data.length;
    
    // Valor médio
    const valorMedio = data.reduce((sum, item) => sum + parseFloat(item.valor_compra || 0), 0) / data.length;
    document.getElementById('valorMedio').textContent = valorMedio.toFixed(2);
    
    // Total de clientes únicos
    const clientesUnicos = new Set(data.map(item => item.cliente_id)).size;
    document.getElementById('totalClientes').textContent = clientesUnicos;
    
    // Data da última transação
    const dates = data.map(item => new Date(item.data_compra));
    const maxDate = new Date(Math.max.apply(null, dates));
    document.getElementById('ultimaTransacao').textContent = maxDate.toLocaleDateString('pt-BR');
}

function renderTransacoesTempoChart(data) {
    // Agrupar transações por mês
    const transacoesPorMes = {};
    
    data.forEach(item => {
        const date = new Date(item.data_compra);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!transacoesPorMes[monthYear]) {
            transacoesPorMes[monthYear] = {
                count: 0,
                total: 0
            };
        }
        
        transacoesPorMes[monthYear].count += 1;
        transacoesPorMes[monthYear].total += parseFloat(item.valor_compra || 0);
    });
    
    // Ordenar por data
    const sortedMonths = Object.keys(transacoesPorMes).sort();
    
    // Preparar dados para o gráfico
    const chartData = {
        labels: sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            return `${monthNum}/${year}`;
        }),
        datasets: [
            {
                label: 'Número de Transações',
                data: sortedMonths.map(month => transacoesPorMes[month].count),
                backgroundColor: '#36A2EB',
                borderColor: '#36A2EB',
                type: 'line',
                yAxisID: 'y'
            },
            {
                label: 'Valor Total (R$)',
                data: sortedMonths.map(month => transacoesPorMes[month].total),
                backgroundColor: '#FF6384',
                type: 'bar',
                yAxisID: 'y1'
            }
        ]
    };
    
    const ctx = document.getElementById('transacoesTempoChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Número de Transações'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Valor Total (R$)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function renderTransacoesTable(data, page) {
    const container = document.getElementById('transacoesTableContainer');
    const paginationContainer = document.getElementById('transacoesPagination');
    
    // Calcular paginação
    const totalPages = Math.ceil(data.length / transacoesPerPage);
    const startIndex = (page - 1) * transacoesPerPage;
    const endIndex = Math.min(startIndex + transacoesPerPage, data.length);
    const pageData = data.slice(startIndex, endIndex);
    
    // Construir tabela
    const table = document.createElement('table');
    const thead = table.createTHead();
    const hrow = thead.insertRow();
    
    // Cabeçalhos
    const headers = ['ID', 'Cliente', 'Data', 'Valor (R$)', 'Pagamento', 'Campanha', 'Idade', 'Cidade', 'Tipo'];
    const dataFields = ['transacao_id', 'cliente_id', 'data_compra', 'valor_compra', 'meio_pagamento', 'campanha', 'idade', 'cidade', 'tipo_cliente'];
    
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        hrow.appendChild(th);
    });
    
    // Corpo da tabela
    const tbody = table.createTBody();
    pageData.forEach(item => {
        const tr = tbody.insertRow();
        
        dataFields.forEach(field => {
            const td = tr.insertCell();
            
            if (field === 'data_compra') {
                const date = new Date(item[field]);
                td.textContent = date.toLocaleDateString('pt-BR');
            } else if (field === 'valor_compra') {
                td.textContent = parseFloat(item[field]).toFixed(2);
            } else {
                td.textContent = item[field];
            }
        });
    });
    
    // Limpar e adicionar tabela
    container.innerHTML = '';
    container.appendChild(table);
    
    // Renderizar paginação
    renderPagination(paginationContainer, page, totalPages, (newPage) => {
        currentTransacoesPage = newPage;
        renderTransacoesTable(data, newPage);
    });
}

function renderPagination(container, currentPage, totalPages, callback) {
    container.innerHTML = '';
    
    // Botão anterior
    const prevButton = document.createElement('button');
    prevButton.textContent = '«';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            callback(currentPage - 1);
        }
    });
    container.appendChild(prevButton);
    
    // Páginas
    const maxButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.toggle('active', i === currentPage);
        pageButton.addEventListener('click', () => {
            callback(i);
        });
        container.appendChild(pageButton);
    }
    
    // Botão próximo
    const nextButton = document.createElement('button');
    nextButton.textContent = '»';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            callback(currentPage + 1);
        }
    });
    container.appendChild(nextButton);
}

function filterTransacoes() {
    const campanhaValue = document.getElementById('transacaoFilter').value;
    const clienteValue = document.getElementById('clienteFilter').value.trim();
    const dataInicio = document.getElementById('dataInicioFilter').valueAsDate;
    const dataFim = document.getElementById('dataFimFilter').valueAsDate;
    
    // Aplicar filtros
    let filteredData = [...transacoesData];
    
    if (campanhaValue !== 'all') {
        filteredData = filteredData.filter(item => item.campanha === campanhaValue);
    }
    
    if (clienteValue) {
        filteredData = filteredData.filter(item => item.cliente_id.includes(clienteValue));
    }
    
    if (dataInicio) {
        filteredData = filteredData.filter(item => new Date(item.data_compra) >= dataInicio);
    }
    
    if (dataFim) {
        filteredData = filteredData.filter(item => new Date(item.data_compra) <= dataFim);
    }
    
    // Atualizar estatísticas e tabela
    updateTransacoesStats(filteredData);
    renderTransacoesTable(filteredData, 1);
    renderTransacoesTempoChart(filteredData);
}

async function loadCampanhas() {
    const container = document.getElementById('campanhasTableContainer');
    
    try {
        // Mostrar loading
        container.innerHTML = '<div class="loading"></div>';
        
        // Carregar dados
        campanhasData = await fetchCsv('campanhas.csv');
        
        if (!campanhasData || campanhasData.length === 0) {
            container.innerHTML = `<div class="erro">Erro ao carregar dados de campanhas</div>`;
            return;
        }
        
        // Calcular métricas adicionais
        campanhasData = campanhasData.map(item => {
            const alcance = parseInt(item.alcance || 0);
            const conversao = parseInt(item.conversao || 0);
            const custo = parseFloat(item.custo_campanha || 0);
            
            return {
                ...item,
                taxa_conversao: alcance > 0 ? (conversao / alcance * 100).toFixed(2) : '0.00',
                custo_aquisicao: conversao > 0 ? (custo / conversao).toFixed(2) : '0.00'
            };
        });
        
        // Atualizar estatísticas
        updateCampanhasStats(campanhasData);
        
        // Preencher filtro de campanhas
        const campanhaDet = document.getElementById('campanhaDet');
        campanhasData.forEach(item => {
            const option = document.createElement('option');
            option.value = item.nome_campanha;
            option.textContent = item.nome_campanha;
            campanhaDet.appendChild(option);
        });
        
        // Configurar evento de filtro
        document.getElementById('aplicarFiltroCampanha').addEventListener('click', () => {
            filterCampanhas();
        });
        
        // Renderizar gráficos
        renderCampanhasMetricasChart(campanhasData);
        renderCampanhaEficienciaChart(campanhasData);
        
        // Renderizar tabela
        renderCampanhasTable(campanhasData);
        
    } catch (err) {
        container.innerHTML = `<div class="erro">Erro ao carregar campanhas: ${err.message}</div>`;
    }
}

function updateCampanhasStats(data) {
    // Total de campanhas
    document.getElementById('totalCampanhas').textContent = data.length;
    
    // Custo total
    const custoTotal = data.reduce((sum, item) => sum + parseFloat(item.custo_campanha || 0), 0);
    document.getElementById('custoTotal').textContent = custoTotal.toLocaleString('pt-BR');
    
    // Alcance total
    const alcanceTotal = data.reduce((sum, item) => sum + parseInt(item.alcance || 0), 0);
    document.getElementById('alcanceTotal').textContent = alcanceTotal.toLocaleString('pt-BR');
    
    // Conversões totais
    const conversaoTotal = data.reduce((sum, item) => sum + parseInt(item.conversao || 0), 0);
    document.getElementById('conversaoTotal').textContent = conversaoTotal.toLocaleString('pt-BR');
}

function renderCampanhasMetricasChart(data) {
    const ctx = document.getElementById('campanhasMetricasChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.nome_campanha),
            datasets: [
                {
                    label: 'Custo (R$)',
                    data: data.map(item => parseFloat(item.custo_campanha)),
                    backgroundColor: '#36A2EB',
                    yAxisID: 'y'
                },
                {
                    label: 'Alcance',
                    data: data.map(item => parseInt(item.alcance)),
                    backgroundColor: '#FF6384',
                    yAxisID: 'y1'
                },
                {
                    label: 'Conversões',
                    data: data.map(item => parseInt(item.conversao)),
                    backgroundColor: '#FFCE56',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Custo (R$)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Alcance / Conversões'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function renderCampanhaEficienciaChart(data) {
    const ctx = document.getElementById('campanhaEficienciaChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(item => item.nome_campanha),
            datasets: [
                {
                    label: 'Custo por Aquisição (R$)',
                    data: data.map(item => parseFloat(item.custo_aquisicao)),
                    backgroundColor: '#4BC0C0',
                    yAxisID: 'y'
                },
                {
                    label: 'Taxa de Conversão (%)',
                    data: data.map(item => parseFloat(item.taxa_conversao)),
                    backgroundColor: '#9966FF',
                    type: 'line',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Custo por Aquisição (R$)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Taxa de Conversão (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function renderCampanhasTable(data) {
    const container = document.getElementById('campanhasTableContainer');
    
    // Construir tabela
    const table = document.createElement('table');
    const thead = table.createTHead();
    const hrow = thead.insertRow();
    
    // Cabeçalhos
    const headers = ['ID', 'Campanha', 'Custo (R$)', 'Alcance', 'Conversões', 'Taxa de Conversão (%)', 'Custo por Aquisição (R$)'];
    
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        hrow.appendChild(th);
    });
    
    // Corpo da tabela
    const tbody = table.createTBody();
    data.forEach(item => {
        const tr = tbody.insertRow();
        
        // ID
        const td1 = tr.insertCell();
        td1.textContent = item.campanha_id;
        
        // Campanha
        const td2 = tr.insertCell();
        td2.textContent = item.nome_campanha;
        
        // Custo
        const td3 = tr.insertCell();
        td3.textContent = parseFloat(item.custo_campanha).toLocaleString('pt-BR');
        
        // Alcance
        const td4 = tr.insertCell();
        td4.textContent = parseInt(item.alcance).toLocaleString('pt-BR');
        
        // Conversões
        const td5 = tr.insertCell();
        td5.textContent = parseInt(item.conversao).toLocaleString('pt-BR');
        
        // Taxa de Conversão
        const td6 = tr.insertCell();
        td6.textContent = item.taxa_conversao;
        
        // Custo por Aquisição
        const td7 = tr.insertCell();
        td7.textContent = item.custo_aquisicao;
    });
    
    // Limpar e adicionar tabela
    container.innerHTML = '';
    container.appendChild(table);
}

function filterCampanhas() {
    const campanhaValue = document.getElementById('campanhaDet').value;
    
    // Aplicar filtros
    let filteredData = [...campanhasData];
    
    if (campanhaValue !== 'all') {
        filteredData = filteredData.filter(item => item.nome_campanha === campanhaValue);
    }
    
    // Atualizar estatísticas e tabela
    updateCampanhasStats(filteredData);
    renderCampanhasTable(filteredData);
    renderCampanhasMetricasChart(filteredData);
    renderCampanhaEficienciaChart(filteredData);
}
