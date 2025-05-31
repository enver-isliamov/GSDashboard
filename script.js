document.addEventListener('DOMContentLoaded', () => {
    // === DOM ЭЛЕМЕНТЫ ===
    const tableLinkInput = document.getElementById('tableLinkInput');
    const loadDataBtn = document.getElementById('loadDataBtn');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    const inputFeedback = document.getElementById('inputFeedback');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const dashboardContent = document.getElementById('dashboardContent');

    // Селектор листов
    const sheetSelect = document.getElementById('sheetSelect');

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
    let currentData = [];
    let currentSheetIndex = 0;
    let sheetNames = []; // Array to store sheet names

    // === ИНИЦИАЛИЗАЦИЯ ===
    if (lastLoadedUrl) {
        tableLinkInput.value = lastLoadedUrl;
        loadAndDisplayData(lastLoadedUrl);
    }
    
    // === ОБРАБОТЧИКИ СОБЫТИЙ ===
    loadDataBtn.addEventListener('click', () => {
        const url = tableLinkInput.value;
        if (url) {
            loadAndDisplayData(url);
        } else {
            showFeedback('Пожалуйста, вставьте ссылку на таблицу.', 'error');
        }
    });

    refreshDataBtn.addEventListener('click', () => {
        if (lastLoadedUrl) {
            loadAndDisplayData(lastLoadedUrl, true, currentSheetIndex); // Pass currentSheetIndex for refresh
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

    // Sheet Select Change Event
    sheetSelect.addEventListener('change', () => {
        currentSheetIndex = parseInt(sheetSelect.value);
        displayDataForSheet(currentData, currentSheetIndex);
    });

    // === ОСНОВНАЯ ЛОГИКА ===
    async function loadAndDisplayData(url, forceRefresh = false, sheetIndex = 0) {
        showLoading(true);
        showFeedback('');
        
        try {
            const spreadsheetId = extractSpreadsheetId(url);
            sheetNames = await fetchSheetNames(spreadsheetId);
            populateSheetSelect(sheetNames);
            
            // Adjust sheetIndex if it exceeds available sheets
            if (sheetIndex >= sheetNames.length) {
                sheetIndex = 0; // Reset to first sheet if index is out of bounds
            }
            currentSheetIndex = sheetIndex; // Update global index

            const csvUrl = convertToCsvExportUrl(url, forceRefresh, sheetIndex);
            const response = await fetch(csvUrl);
            if (!response.ok) {
                throw new Error(`Ошибка сети: ${response.status} ${response.statusText}`);
            }
            const csvText = await response.text();
            
            currentData = parseCSV(csvText);
            
            if (currentData.length < 2) { // Проверка на наличие данных (заголовок + хотя бы одна строка)
                 throw new Error('Таблица пуста или содержит только заголовки.');
            }

            displayDataForSheet(currentData, sheetIndex);
            
            lastLoadedUrl = url;
            localStorage.setItem('lastLoadedSheetUrl', url);
            showFeedback('Данные успешно загружены и проанализированы.', 'success');

        } catch (error) {
            console.error('Ошибка при загрузке данных:', error);
            showFeedback(`Ошибка: ${error.message}. Убедитесь, что ссылка верна и таблица опубликована в интернете.`, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function fetchSheetNames(spreadsheetId) {
        try {
            const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
            const response = await fetch(spreadsheetUrl);
            const data = await response.text();
            const json = JSON.parse(data.substring(47).slice(0, -2)); // Extract JSON from Google Visualization API response
            const sheets = json.table.cols.map(col => col.label).filter(label => label.startsWith('sheet'));
            return sheets;
        } catch (error) {
            console.error("Error fetching sheet names:", error);
            return ["Sheet1"]; // Fallback to default
        }
    }

    function populateSheetSelect(sheetNames) {
        sheetSelect.innerHTML = '';
        sheetNames.forEach((sheetName, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = sheetName;
            sheetSelect.appendChild(option);
        });
        sheetSelect.value = currentSheetIndex; // Set the selected sheet
    }

    function displayDataForSheet(data, sheetIndex) {
        activeSheetNameSpan.textContent = sheetNames[sheetIndex]; // Update the sheet name display
        displayAnalytics(data);
        displayTable(data);
        generateRecommendations(data);
    }

    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

    function showLoading(isLoading) {
        loadingIndicator.classList.toggle('active', isLoading);
        dashboardContent.classList.toggle('hidden', isLoading);
    }

    function showFeedback(message, type = 'info') {
        inputFeedback.textContent = message;
        inputFeedback.className = `feedback-message ${type}`;
    }

    function extractSpreadsheetId(url) {
        const match = url.match(/\/d\/(.*?)\//);
        if (match && match[1]) {
            return match[1];
        }
        throw new Error('Не удалось извлечь ID таблицы из ссылки.');
    }

    function convertToCsvExportUrl(url, forceRefresh, sheetIndex = 0) {
        const spreadsheetId = extractSpreadsheetId(url);
                // Use the gid (sheet ID) that corresponds to the selected sheetIndex
        let exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${getSheetIdFromIndex(spreadsheetId, sheetIndex)}`;
        if (forceRefresh) {
            exportUrl += `×tamp=${new Date().getTime()}`; // Append timestamp for cache busting
        }
        return exportUrl;
    }

    async function getSheetIdFromIndex(spreadsheetId, sheetIndex) {
        // Fetch sheet metadata using Google Sheets API
        const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetIndex}`;

        try {
             const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetIndex}`);

                const pattern = /gid=(\d+)/;
                const match = spreadsheetUrl.match(pattern);
                return (match && match[1]) ? match[1] : 0;
        } catch (error) {
            console.error("Error fetching sheet id:", error);
            return 0;
        }
    }

    function parseCSV(text) {
        // Простая реализация парсера CSV. Для сложных случаев может потребоваться доработка.
        const lines = text.replace(/\r/g, '').split('\n');
        return lines.map(line => line.split(','));
    }

    // === ФУНКЦИИ ОТОБРАЖЕНИЯ ===

    function displayAnalytics(data) {
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
                createBarChart(canvas, header, columnData.map(Number));
            } else if (dataType === 'string') {
                // Проверяем наличие данных перед созданием круговой диаграммы
                const counts = data.reduce((acc, value) => {
                    acc[value] = (acc[value] || 0) + 1;
                    return acc;
                }, {});
                
                const chartLabels = Object.keys(counts);
                const chartData = Object.values(counts);

                if (chartLabels.length > 1) { // Убедимся, что есть хотя бы 2 разных значения для диаграммы
                    createPieChart(canvas, header, columnData);
                }  else {
                    // Если значений недостаточно, выводим сообщение вместо графика
                    canvas.outerHTML = `<p>Недостаточно данных для построения круговой диаграммы по столбцу "${header}".</p>`;
                }
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
    
    // === ФУНКЦИИ АНАЛИЗА И ГРАФИКОВ ===

    function detectDataType(columnData) {
        // Проверяем, является ли большинство значений числами
        let numberCount = 0;
        columnData.forEach(val => {
            if (val && !isNaN(val) && val.trim() !== '') {
                numberCount++;
            }
        });

        if (numberCount / columnData.length > 0.8) { // Если более 80% - числа
            return 'number';
        }
        return 'string';
    }

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


   function createPieChart(canvas, label, data) {
        const counts = data.reduce((acc, value) => {
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {});

        const chartLabels = Object.keys(counts);
        const chartData = Object.values(counts);

        if (chartLabels.length > 1) {
            new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: label,
                        data: chartData,
                        backgroundColor: generatePastelColors(chartLabels.length), // Call function for pastel colors
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: `Круговая диаграмма для "${label}"`
                        }
                    }
                }
            });
        } else {
            canvas.outerHTML = `<p>Недостаточно данных для построения круговой диаграммы по столбцу "${label}".</p>`;
        }
    }

    function createLineChart(canvas, label, data) {
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: data.map((_, i) => `Запись ${i + 1}`),
                datasets: [{
                    label: label,
                    data: data,
                    borderColor: 'rgba(255, 99, 132, 1)', // Red
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Линейный график для "${label}"`
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    function createScatterChart(canvas, label, dataX, dataY) {
        new Chart(canvas, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: label,
                    data: dataX.map((x, i) => ({ x: x, y: dataY[i] })), // Map X and Y coordinates
                    backgroundColor: 'rgba(75, 192, 192, 0.7)', // Teal
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Точечная диаграмма для "${label}"`
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'X Axis' }
                    },
                    y: {
                        title: { display: true, text: 'Y Axis' },
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
        recommendationList.innerHTML = ''; // Clear existing recommendations
        const headers = data[0];
        const rows = data.slice(1);

        if (rows.length === 0) {
            recommendationList.innerHTML = '<li>Нет данных для анализа и генерации рекомендаций.</li>';
            return;
        }

        // Example recommendations (customize based on your data)
        const recommendations = [];
        if (rows.length < 10) {
            recommendations.push('Рассмотрите возможность добавления больше данных для более точного анализа.');
        }
        if (dataQuality < 70) {
            recommendations.push('Проверьте данные на наличие ошибок и неточностей.');
        }
        if (headers.includes('Дата') || headers.includes('Дата создания')) {
            recommendations.push('Используйте временные ряды для анализа данных во времени.');
        }

        // Add more recommendations based on your data analysis

        if (recommendations.length === 0) {
            recommendations.push('Нет конкретных рекомендаций на основе текущего анализа.');
        }

        recommendations.forEach(recommendation => {
            const li = document.createElement('li');
            li.textContent = recommendation;
            recommendationList.appendChild(li);
        });
    }
});
