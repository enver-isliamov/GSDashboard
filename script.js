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

           let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${sheetName}`;
             fetch(csvUrl)
             .then(response => {
                     if (!response.ok) {
                         throw new Error(`Ошибка при загрузке CSV: ${response.status} ${response.statusText}`);
              }
                      return response.text();
            })
                 .then(csvText => {
                       let data = parseCSV(csvText);
                      showFeedback("Отрисовываю данные");
                const sheetData = {
                         "sheetName": sheetName,
                           "data": data
                    };
                activeSheetNameSpan.innerText = sheetName;
              displayAnalytics(data)
               displayTable(data)
           }).catch(e => {
                showFeedback(`Ошибка во время обработки данных: ${e.message}`, "error");
                console.error(e.message,e);
            });
         });

         return button;
    }
      function generatePastelColors(count) {
        const colors = [];
            for (let i = 0; i < count; i++) {
              const hue = Math.floor(Math.random() * 360);
               colors.push(`hsl(${hue}, 70%, 80%)`);
         }
      return colors;
      }
  /*
    
        let tab = document.getElementsByClassName("sheet-tab")[0];
    try{
         if (lastLoadedUrl) {
              tab.click()
              }
    }catch(er){}

     }
 // === ИНИЦИАЛИЗАЦИЯ ===
 
    loadDataBtn.addEventListener('click', () => {
        const url = tableLinkInput.value;
        if (url) {
            showLoading(true);
            showFeedback("Начинаю загрузку данных...");

            /* 
                Убрана лишняя аналитика
             */
            extractSpreadsheetId(url);
               
                showFeedback("Отрисовываю табы")
                const sheetListUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
              fetch(sheetListUrl)
             .then(response => {
                  if (!response.ok) {
                        throw new Error(`Ошибка при загрузке CSV: ${response.status} ${response.statusText}`);
                 }
                    return response.text();
                })
                .then(data=> {
                    const jsonData = JSON.parse(data.substring(47).slice(0, -2));
                   const sheetNames = jsonData.table.cols.map(col => col.label).filter(label => label.startsWith('sheet'));
                  populateSheetTabs(sheetNames)
               }).catch(e => {
                showFeedback(`Ошибка во время обработки данных: ${e.message}`, "error");
                  console.error(e.message,e);
                    localStorage.setItem("url_sheet_g", url);
             }).finally(er=>showLoading(false));
       ;
        } else {
            showFeedback('Пожалуйста, вставьте ссылку на таблицу.', 'error');
        }
    });
        
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
          try {
             tableLinkInput.value = localStorage.getItem("url_sheet_g")
        } catch (ex) {
        }
   
    showFe=showFeedback
   });
