document.addEventListener('DOMContentLoaded', () => {
    // === DOM ЭЛЕМЕНТЫ ===
    const tableLinkInput = document.getElementById('tableLinkInput');
    const loadDataBtn = document.getElementById('loadDataBtn');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    const inputFeedback = document.getElementById('inputFeedback');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const dashboardContent = document.getElementById('dashboardContent');

    // Смена select на div
    const sheetTabs = document.getElementById('sheetTabs');

    // Навигация
    const mainNavItems = document.querySelectorAll('.data-navigation li');
    const mainTabs = document.querySelectorAll('.tab-content');
    const analysisNavItems = document.querySelectorAll('.analysis-tab');
    const analysisTabs = document.querySelectorAll('.analysis-content');

    // Элементы для данных
    const activeSheetNameSpan = document.getElementById('activeSheetName');
    const activeSheetRowsSpan = document.getElementById('activeSheetRows');
    const totalRecordsSpan = document.getElementById('totalRecords');
    const totalColumnsSpan = document.getElementById('totalColumns');
    const fillRateSpan = document.getElementById('fillRate');
    const dataQualitySpan = document.getElementById('dataQuality');
    const chartsContainer = document.getElementById('chartsContainer');
    const dataPreviewTableDiv = document.getElementById('dataPreviewTable');

    // Рекомендации
    const recommendationList = document.getElementById('recommendationList');

    // === СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===
    let lastLoadedUrl = localStorage.getItem('lastLoadedSheetUrl') || '';
    let spreadsheetId = "";

    // === ИНИЦИАЛИЗАЦИЯ ===
    if (lastLoadedUrl) {
        tableLinkInput.value = lastLoadedUrl;
        loadAndDisplayData(lastLoadedUrl);
    }
    // === ОБРАБОТЧИКИ СОБЫТИЙ ===
        loadDataBtn.addEventListener('click', () => {
        const url = tableLinkInput.value;
        if (url) {
          showFeedback("Начинаю загрузку данных...");
          loadAndDisplayData(url);
        } else {
            showFeedback('Пожалуйста, вставьте ссылку на таблицу.', 'error');
        }
    });
    refreshDataBtn.addEventListener('click', () => {
        if (lastLoadedUrl) {
            loadAndDisplayData(lastLoadedUrl, true);
        } else {
            alert('Сначала загрузите данные, чтобы их можно было обновить.');
        }
    });
    mainNavItems.forEach(item => {
        item.addEventListener('click', () => {
            mainNavItems.forEach(i => i.classList.remove('active'));
            mainTabs.forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(item.dataset.tab).classList.add('active');
        });
    });
    analysisNavItems.forEach(item => {
        item.addEventListener('click', () => {
            analysisNavItems.forEach(i => i.classList.remove('active'));
            analysisTabs.forEach(c => c.classList.remove('active'));
            item.classList.add('active');
            document.getElementById(item.dataset.analysis).classList.add('active');
        });
    });

  function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    return lines.map(line => line.split(','));
  }

  // === ОСНОВНАЯ ЛОГИКА ===
  async function loadAndDisplayData(url, forceRefresh = false) {
        showLoading(true);
        showFeedback('');
         try {
                spreadsheetId = extractSpreadsheetId(url);
                showFeedback("spreadsheetId "+spreadsheetId);

                const sheetListUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
                showFeedback("sheetListUrl "+sheetListUrl);
                const response = await fetch(sheetListUrl);
                 if (!response.ok) {
                         throw new Error(`Не удалось получить данные о листах. HTTP код: ${response.status}`);
                 }

                 const data = await response.text();
                 const jsonData = JSON.parse(data.substring(47).slice(0, -2));
                  if (!jsonData || !jsonData.table || !jsonData.table.cols) {
                         throw new Error("Не удалось получить данные о листах из JSON. Проверьте JSON");
                  }

                   const sheetNames = jsonData.table.cols.map(col => col.label).filter(label => label.startsWith('sheet'));
                   showFeedback("Найдено листов"+sheetNames.length);
                   populateSheetTabs(sheetNames);
           localStorage.setItem('lastLoadedSheetUrl', url); // Сохраняем URL
          } catch (error) {
              console.error('Ошибка при загрузке данных:', error);
              showFeedback(`Ошибка: ${error.message}. Убедитесь, что ссылка верна и доступ к таблице открыт "Всем, у кого есть ссылка".`, 'error');
          } finally {
                 showLoading(false);
          }
  }
    function createSheetTab(sheetName, index, spreadsheetId) {
      const button = document.createElement('button');
      button.classList.add('sheet-tab');
      button.textContent = sheetName;
       button.addEventListener('click', async () => {
          document.querySelectorAll('.sheet-tab').forEach(tab => tab.classList.remove('active'));
          button.classList.add('active');
            try {
                   let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
                showFeedback("csvUrl "+csvUrl);
                      const response = await fetch(csvUrl);
                      if (!response.ok) {
                              throw new Error(`Ошибка при загрузке CSV: ${response.status} ${response.statusText}`);
                      }
                      const csvText = await response.text();
                      const data = parseCSV(csvText);
                    showFeedback("Получены данные, строк: " + data.length + " для листа: " + sheetName);
                     displayAnalytics(data)
                     displayTable(data)  // Show analytics for the sheet
          } catch (e) {
                    showFeedback(`Ошибка во время обработки данных: ${e.message}`);
                   console.error("Ошибка во время обработки данных: ",e.message,e);
             }
         activeSheetNameSpan.textContent=sheetName;
          showFeedback(activeSheetNameSpan.textContent);
         });
          return button;
  }
   // New function
       function createHorizontalBarChart(canvas, label, data) {
           const counts = {};
           data.forEach(value => {
               counts[value] = (counts[value] || 0) + 1;
           });

           const labels = Object.keys(counts);
           const values = Object.values(counts);

           new Chart(canvas, {
               type: 'bar',
               data: {
                   labels: labels,
                   datasets: [{
                       label: label,
                       data: values,
                       backgroundColor: generatePastelColors(labels.length),
                       borderWidth: 1
                   }]
               },
               options: {
                   indexAxis: 'y',
                   responsive: true,
                   maintainAspectRatio: false,
                   plugins: {
                       title: {
                           display: true,
                           text: `Горизонтальная столбчатая диаграмма для "${label}"`
                       }
                   },
                   scales: {
                       x: {
                           beginAtZero: true
                       }
                   }
               }
           });
     }
    function populateSheetTabs(sheetNames) {
        sheetTabs.innerHTML = '';
        if (Array.isArray(sheetNames) && sheetNames.length) {
            sheetNames.forEach((sheetName, index) => {
                const button = createSheetTab(sheetName, index, spreadsheetId);
                sheetTabs.appendChild(button);
            });
   } else {
    showFeedback("Листы отсутствуют. Проверьте данные.");
 }
    }

  function generatePastelColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = Math.floor(Math.random() * 360);
      colors.push(`hsl(${hue}, 70%, 80%)`);
    }
    return colors;
  }
  // === ФУНКЦИИ АНАЛИЗА И ОТОБРАЖЕНИЯ ===
  function displayAnalytics(data) {
    if (!data || data.length < 2) {
        showFeedback("Недостаточно данных для отображения аналитики.","error");
        return;
    }

    const headers = data[0];
    const rows = data.slice(1);

    // 1. Отображение основных метрик
    const totalRecords = rows.length;
    const totalColumns = headers.length;
    totalRecordsSpan.textContent = totalRecords;
    totalColumnsSpan.textContent = totalColumns;
    activeSheetRowsSpan.textContent = totalRecords;

    let filledCells = 0;
    rows.forEach(row => {
      row.forEach(cell => {
        if (cell && cell.trim() !== '') filledCells++;
      });
    });
    const totalCells = totalRecords * totalColumns;
    const fillRate = totalCells > 0 ? (filledCells / totalCells) * 100 : 0;
    fillRateSpan.textContent = `${fillRate.toFixed(1)}%`;
    dataQualitySpan.textContent = `${fillRate.toFixed(1)}%`; // В простом варианте качество = заполненность

    // 2. Генерация и отображение графиков
    chartsContainer.innerHTML = ''; // Очищаем старые графики
    headers.forEach((header, index) => {
      const columnData = rows.map(row => row[index]);
      const dataType = detectDataType(columnData);
      const chartContainer = document.createElement('div');
      chartContainer.className = 'chart-container';
      const canvas = document.createElement('canvas');
      chartContainer.appendChild(canvas);
      chartsContainer.appendChild(chartContainer);
      if (dataType === 'number') {
        createBarChart(canvas, header, columnData.map(Number)); // Numeric data, use bar chart
      } else {
        // For other data types, create a horizontal bar chart
        createHorizontalBarChart(canvas, header, columnData); // Call new function
      }
    });
  }

  function displayTable(data) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headerRow = document.createElement('tr');
    data[0].forEach(headerText => {
      const th = document.createElement('th');
      th.textContent = headerText;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    data.slice(1).forEach(rowData => {
      const row = document.createElement('tr');
      rowData.forEach(cellText => {
        const td = document.createElement('td');
        td.textContent = cellText;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    dataPreviewTableDiv.innerHTML = '';
    dataPreviewTableDiv.appendChild(table);
  }
    
     function showFeedback(element, message, isSuccess = true) {
            inputFeedback.textContent = message;
            inputFeedback.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
     }

  // === ФУНКЦИИ АНАЛИЗА ДАННЫХ ===

  function detectDataType(columnData) {
    // Проверяем, является ли большинство значений числами
    let numberCount = 0;
    columnData.forEach(val => {
      if (val && !isNaN(val) && val.trim() !== '') {
        numberCount++;
      }
    });

    if (numberCount / columnData.length > 0.8) {
      return 'number';
    }

    return 'string';
  }

  // === ФУНКЦИИ ДЛЯ ГРАФИКОВ ===

  function createBarChart(canvas, label, data) {
    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map((_, i) => `Запись ${i + 1}`),
        datasets: [{
          label: label,
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.5)', // Blue
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: `Столбчатая диаграмма для "${label}"`
          }
        },
        scales: {
          y: {
            beginAtZero: true // Start y-axis at zero
          }
        }
      }
    });
  }
     function createHorizontalBarChart(canvas, label, data) {
         const counts = {};
         data.forEach(value => {
             counts[value] = (counts[value] || 0) + 1;
         });

         const labels = Object.keys(counts);
         const values = Object.values(counts);

         new Chart(canvas, {
             type: 'bar',
             data: {
                 labels: labels,
                 datasets: [{
                     label: label,
                     data: values,
                     backgroundColor: generatePastelColors(labels.length),
                     borderWidth: 1
                 }]
             },
             options: {
                 indexAxis: 'y',
                 responsive: true,
                 maintainAspectRatio: false,
                 plugins: {
                     title: {
                         display: true,
                         text: `Горизонтальная столбчатая диаграмма для "${label}"`
                     }
                 },
                 scales: {
                     x: {
                         beginAtZero: true
                     }
                 }
             }
         });
   }
     function generatePastelColors(count) {
       const colors = [];
       for (let i = 0; i < count; i++) {
            const hue = Math.floor(Math.random() * 360);
             colors.push(`hsl(${hue}, 70%, 80%)`);
       }
         return colors;
   }
  // === ФУНКЦИИ АНАЛИЗА И РЕКОМЕНДАЦИЙ ===
    function generateRecommendations(data) {
        recommendationList.innerHTML = '';
        if (!data || data.length <= 1) {
          recommendationList.innerHTML = '<li>Нет данных для анализа.</li>';
          return;
        }

       const headers = data[0];
       const rows = data.slice(1);
        if (rows.length < 5) {
           recommendationList.innerHTML += '<li>Рассмотрите возможность добавить больше данных для получения более точных результатов анализа.</li>';
         }

       if (headers.length > 10) {
           recommendationList.innerHTML += '<li>Оптимизируйте количество столбцов для упрощения анализа.</li>';
        }
      recommendationList.innerHTML += "<li>Раздел в разработке. В будущем здесь будут появляться более точные результаты анализа.</li>"

   }

    // Инициализация при загрузке страницы.
    try {
        tableLinkInput.value = localStorage.getItem("url_sheet_g");
        if (tableLinkInput.value != "") {
            loadAndDisplayData(localStorage.getItem("url_sheet_g"));
        }

    } catch (ex) {
      showFeedback("Найдена старая сессия");
    }
});
