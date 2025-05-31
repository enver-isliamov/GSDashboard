document.addEventListener('DOMContentLoaded', () => {
    const tableLinkInput = document.getElementById('tableLinkInput');
    const loadDataBtn = document.getElementById('loadDataBtn');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    const inputFeedback = document.getElementById('inputFeedback');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const dashboardContent = document.getElementById('dashboardContent');
    const sheetTabs = document.getElementById('sheetTabs');
    const activeSheetNameSpan = document.getElementById('activeSheetName');
    const activeSheetRowsSpan = document.getElementById('activeSheetRows');
    const totalRecordsSpan = document.getElementById('totalRecords');
    const totalColumnsSpan = document.getElementById('totalColumns');
    const fillRateSpan = document.getElementById('fillRate');
    const dataQualitySpan = document.getElementById('dataQuality');
    const chartsContainer = document.getElementById('chartsContainer');
    const dataPreviewTableDiv = document.getElementById('dataPreviewTable');
    const recommendationList = document.getElementById('recommendationList');
    const mainNavItems = document.querySelectorAll('.data-navigation li');
    const mainTabs = document.querySelectorAll('.tab-content');
    const analysisNavItems = document.querySelectorAll('.analysis-tab');
    const analysisTabs = document.querySelectorAll('.analysis-content');

    let spreadsheetId = "";

   
    const showFeedback = (message, element = inputFeedback, isSuccess = true) => {
        element.textContent = message;
        element.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
    }
    const showLoading = (isLoading) => {
        loadingIndicator.classList.toggle('active', isLoading);
        dashboardContent.classList.toggle('hidden', !isLoading);
    }
        const extractSpreadsheetId = (url) => {
        const match = url.match(/\/d\/([^\/]+)\/edit|\/d\/([^\/]+)$/);
          console.log(match);
          if (match && (match[1] || match[2])) {
              console.log("Таблица"+match[1])
             return match[1] || match[2];
             }
         throw new Error('Не удалось извлечь ID таблицы из ссылки.');
    }
    const parseCSV = (text) => {
        const lines = text.replace(/\r/g, '').split('\n');
        return lines.map(line => line.split(','));
    };
    const detectDataType = (columnData) => {
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
    };
    const generatePastelColors = (count) => {
        const colors = [];
        for (let i = 0; i < count; i++) {
             const hue = Math.floor(Math.random() * 360);
             colors.push(`hsl(${hue}, 70%, 80%)`);
        }
        return colors;
    };
    const createBarChart = (canvas, label, data) => {
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.map((_, i) => `Запись ${i + 1}`),
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
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
                        beginAtZero: true
                    }
                }
            }
        });
    };
        const createHorizontalBarChart = (canvas, label, data) => {
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
   
    const displayAnalytics = (data) => {
        if (!data || data.length < 2) {
               showFeedback("Недостаточно данных для отображения аналитики.","error");
              return;
          }
      const headers = data[0];
      const rows = data.slice(1);
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
                            createBarChart(canvas, header, columnData.map(Number)); 
                } else {
                    createHorizontalBarChart(canvas, header, columnData);
                    }
          });
}
const displayTable = (data) => {
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
};
const displayData = (sheetData) => {
        const {
            sheetName,
            data
        } = sheetData;
        activeSheetNameSpan.textContent = sheetName;
        if (data.length > 1) {
            displayAnalytics(data)
            displayTable(data)
        } else {
            showFeedback("Что-то пошло не так в процессе парсинга данных", "error");
        }
};
    const createSheetTab = (sheetName, index, spreadsheetId) => {
        const button = document.createElement('button');
        button.classList.add('sheet-tab');
        button.textContent = sheetName;

        button.addEventListener('click', async () => {
          document.querySelectorAll('.sheet-tab').forEach(tab => tab.classList.remove('active'));
          button.classList.add('active');
          try {
              let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
              const response = await fetch(csvUrl);
              if (!response.ok) {
                 throw new Error(`Ошибка при загрузке CSV: ${response.status} ${response.statusText}`);
               }
                const csvText = await response.text();
                 const data = parseCSV(csvText);
                displayData( {sheetName: sheetName, data: data} )
           } catch (e) {
                    showFeedback(`Ошибка во время обработки данных: ${e.message}`);
                   console.error("Ошибка во время обработки данных: ",e.message,e);
            }
          });
         return button;
  }
    const populateSheetTabs = (sheetNames) => {
        sheetTabs.innerHTML = '';
         if (Array.isArray(sheetNames) && sheetNames.length) {
              sheetNames.forEach((sheetName, index) => {
                  const button = createSheetTab(sheetName, index, spreadsheetId);
                   sheetTabs.appendChild(button);
                });
                 let tab = document.getElementsByClassName("sheet-tab")[0];
               if (tab) {
                    tab.click()
               }
         } else {
          showFeedback("Листы отсутствуют. Проверьте данные.");
        }
    };
 const extractData = async (url) => {
      try {
            let sheetNames = []
             spreadsheetId = extractSpreadsheetId(url);
            const sheetListUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
            const response = await fetch(sheetListUrl);
            if (!response.ok) {
                     throw new Error(`Произошла ошибка, код: ${response.status}, ${response.statusText}`);
            }
            const data = await response.text();
            const jsonData = JSON.parse(data.substring(47).slice(0, -2));
               if (!jsonData || !jsonData.table || !jsonData.table.cols) {
                    throw new Error("Не удалось получить данные о листах из JSON. Проверьте JSON");
             }
         const gettedSheetNames = jsonData.table.cols.map(col => col.label).filter(label => label.startsWith('sheet'));
            let result={}
             let data_sheet = []
              return gettedSheetNames
        } catch (ex) {
            console.log(ex.message);
            return Promise.reject(ex.message)
         }
     }
// === ИНИЦИАЛИЗАЦИЯ ===
         try {
                tableLinkInput.value = localStorage.getItem("url_sheet_g")
             } catch (ex) {
                   showFeedback("Найдена старая сессия");
         }

         loadDataBtn.addEventListener('click', () => {
               const url = tableLinkInput.value;
               if (url) {
                   showLoading(true);
               showFeedback("Начинаю загрузку данных...");
                   extractData(url).then(sheetNames => {

                         populateSheetTabs(sheetNames);
                   }).catch(ex => {
                           showFeedback(`Ошибка: ${ex}. Проверьте ссылку`, "error")
                    }).finally((e) => {
                            showLoading(false);
                    });

                   localStorage.setItem("url_sheet_g", url);
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
 // === ФУНКЦИИ АНАЛИЗА И РЕКОМЕНДАЦИЙ ===
  function generateRecommendations(data) {
        recommendationList.innerHTML = ''; // Очищаем существующие рекомендации
        // Выдаем рекомендации
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
   function showFe(message, element = inputFeedback, isSuccess = true) {
            element.textContent = message;
         element.className = `feedback-message ${isSuccess ? 'success' : 'error'}`;
  }

    let tab = document.getElementsByClassName("sheet-tab")[0];
     function generatePastelColors(count) {
        const colors = [];
            for (let i = 0; i < count; i++) {
              const hue = Math.floor(Math.random() * 360);
                colors.push(`hsl(${hue}, 70%, 80%)`);
           }
            return colors;
     }
  /*  activeSheetNameSpan.textContent=sheetName
    if(tab!="")
          tab.click()*/
  
          
    
});
