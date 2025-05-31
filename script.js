document.addEventListener('DOMContentLoaded', () => {
    const spreadsheetIdInput = document.getElementById('spreadsheetId');
    const apiKeyInput = document.getElementById('apiKey');
    const loadDataBtn = document.getElementById('loadDataBtn');
    const tabsDiv = document.getElementById('tabs');
    const contentDiv = document.getElementById('content');

    loadDataBtn.addEventListener('click', async () => {
        const spreadsheetId = spreadsheetIdInput.value;
        const apiKey = apiKeyInput.value;

        if (!spreadsheetId || !apiKey) {
            alert('Пожалуйста, введите ID таблицы и API ключ.');
            return;
        }

        try {
            const data = await loadSheetsData(spreadsheetId, apiKey);
            createTabs(data);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            alert('Ошибка загрузки данных.  Проверьте ID таблицы и API ключ, а также CORS настройки.');
        }
    });

    async function loadSheetsData(spreadsheetId, apiKey) {
        //  Важно:  Замените `YOUR_SPREADSHEET_ID` и `YOUR_API_KEY` на переменные, хранящиеся в config.js.
        const spreadsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;


        const response = await fetch(spreadsheetUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data.sheets; // Возвращает массив листов
    }

    function createTabs(sheetsData) {
        tabsDiv.innerHTML = ''; // Очищаем существующие вкладки
        contentDiv.innerHTML = ''; // Очищаем существующий контент

        sheetsData.forEach((sheet, index) => {
            const sheetName = sheet.properties.title;
            const tabButton = document.createElement('button');
            tabButton.textContent = sheetName;
            tabButton.addEventListener('click', () => showTabContent(index, sheetsData));
            tabsDiv.appendChild(tabButton);

            const tabContent = document.createElement('div');
            tabContent.id = `tab-${index}`;
            contentDiv.appendChild(tabContent);

            if (index === 0) {
                tabButton.classList.add('active');
                tabContent.classList.add('active');
                showTabContent(index, sheetsData); // Показываем контент первой вкладки
            }
        });
    }


    async function showTabContent(tabIndex, sheetsData) {
        // Сначала деактивируем все вкладки и контент
        document.querySelectorAll('#tabs button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('#content > div').forEach(div => div.classList.remove('active'));

        // Активируем выбранную вкладку и контент
        document.querySelector(`#tabs button:nth-child(${tabIndex + 1})`).classList.add('active');
        document.getElementById(`tab-${tabIndex}`).classList.add('active');

        const sheet = sheetsData[tabIndex];
        const spreadsheetId = spreadsheetIdInput.value;
        const apiKey = apiKeyInput.value;
        const sheetName = sheet.properties.title;

        try {
            const sheetValues = await getSheetValues(spreadsheetId, sheetName, apiKey);
            if (sheetValues && sheetValues.length > 0) {
                 const tabContentDiv = document.getElementById(`tab-${tabIndex}`);
                 tabContentDiv.innerHTML = ''; // Clear existing content

                // Предполагаем, что первая строка - заголовки
                const headers = sheetValues[0];

                // Создаем таблицу
                const table = createTable(sheetValues);
                tabContentDiv.appendChild(table);

                // Анализ данных и создание графиков
                await analyzeAndVisualize(sheetValues, headers, tabContentDiv);
            } else {
                document.getElementById(`tab-${tabIndex}`).textContent = 'Нет данных для отображения.';
            }
        } catch (error) {
            console.error('Ошибка при получении данных из листа:', error);
            document.getElementById(`tab-${tabIndex}`).textContent = 'Ошибка при получении данных. Проверьте консоль.';
        }
    }


    async function getSheetValues(spreadsheetId, sheetName, apiKey) {
        const range = sheetName; //  Получаем все данные листа. Можно указать конкретный диапазон, например 'A1:B10'
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Ошибка API Google Sheets: ${response.status}`);
        }
        const data = await response.json();
        return data.values;
    }

    function createTable(data) {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Заголовки
        const headerRow = document.createElement('tr');
        data[0].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Данные
        for (let i = 1; i < data.length; i++) {
            const row = document.createElement('tr');
            data[i].forEach(cellText => {
                const td = document.createElement('td');
                td.textContent = cellText;
                row.appendChild(td);
            });
            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        return table;
    }


    async function analyzeAndVisualize(data, headers, tabContentDiv) {
      // Пропускаем строку заголовков при анализе
      if (!data || data.length <= 1) {
          console.warn("Недостаточно данных для анализа и визуализации.");
          return;
      }

      for (let i = 0; i < headers.length; i++) {
          const header = headers[i];
          const columnData = data.slice(1).map(row => row[i]); // Extract data for the current column

          const dataType = detectDataType(columnData);

          if (dataType === 'number') {
            const numbers = columnData.map(Number); // Convert to numbers
            createChart(header, numbers, 'bar', tabContentDiv); // Example: bar chart for numbers
          } else if (dataType === 'string') {
            const counts = {};
            columnData.forEach(value => {
                counts[value] = (counts[value] || 0) + 1;
            });

            const labels = Object.keys(counts);
            const values = Object.values(counts);
            createChart(header, values, 'pie', tabContentDiv); // Example: pie chart for strings
          }  else if (dataType === 'date'){
              //  TODO:  Реализовать логику для обработки и визуализации дат
              console.log(`Столбец "${header}" определен как даты.  Необходима логика для визуализации дат.`);
          }

          else {
              console.log(`Не могу определить тип данных для столбца "${header}".`);
          }
      }
    }


    function detectDataType(columnData) {
      // Проверяем, является ли большинство значений числами
      const isNumberLike = columnData.every(value => !isNaN(parseFloat(value)) && isFinite(value));

      if (isNumberLike) {
          return 'number';
      }

      // Проверяем, являются ли большинство значений датами
      const isDateLike = columnData.every(value => !isNaN(new Date(value)));

      if (isDateLike) {
          return 'date';
      }

        // Если не число и не дата, считаем строкой
        return 'string';
    }



    function createChart(label, data, type, tabContentDiv) {
        const canvas = document.createElement('canvas');
        tabContentDiv.appendChild(canvas);

        new Chart(canvas.getContext('2d'), {
            type: type,
            data: {
                labels: data.map((_, index) => index + 1),  // Простые labels для примера
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }


});
