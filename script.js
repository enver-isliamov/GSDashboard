document.addEventListener('DOMContentLoaded', () => {
    // === DOM ЭЛЕМЕНТЫ ===
    const tableLinkInput = document.getElementById('tableLinkInput');
    const loadDataBtn = document.getElementById('loadDataBtn');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    const inputFeedback = document.getElementById('inputFeedback');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const dashboardContent = document.getElementById('dashboardContent');

    // Навигация
    const mainNavItems = document.querySelectorAll('.data-navigation li');
    const mainTabs = document.querySelectorAll('.tab-content');
    const analysisNavItems = document.querySelectorAll('.analysis-tab');
    const analysisTabs = document.querySelectorAll('.analysis-content');
    
    // Элементы для данных
    const activeSheetRowsSpan = document.getElementById('activeSheetRows');
    const totalRecordsSpan = document.getElementById('totalRecords');
    const totalColumnsSpan = document.getElementById('totalColumns');
    const fillRateSpan = document.getElementById('fillRate');
    const dataQualitySpan = document.getElementById('dataQuality');
    const chartsContainer = document.getElementById('chartsContainer');
    const dataPreviewTableDiv = document.getElementById('dataPreviewTable');

    // === СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===
    let lastLoadedUrl = localStorage.getItem('lastLoadedSheetUrl') || '';
    let currentData = [];

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
            loadAndDisplayData(lastLoadedUrl, true); // true - флаг для принудительного обновления
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

    // === ОСНОВНАЯ ЛОГИКА ===
    async function loadAndDisplayData(url, forceRefresh = false) {
        showLoading(true);
        showFeedback('');
        
        try {
            const csvUrl = convertToCsvExportUrl(url, forceRefresh);
            const response = await fetch(csvUrl);
            if (!response.ok) {
                throw new Error(`Ошибка сети: ${response.status} ${response.statusText}`);
            }
            const csvText = await response.text();
            
            currentData = parseCSV(csvText);
            
            if (currentData.length < 2) { // Проверка на наличие данных (заголовок + хотя бы одна строка)
                 throw new Error('Таблица пуста или содержит только заголовки.');
            }

            displayAnalytics(currentData);
            displayTable(currentData);
            
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

    function convertToCsvExportUrl(url, forceRefresh) {
        const spreadsheetId = extractSpreadsheetId(url);
        // Мы всегда будем запрашивать первый лист (gid=0)
        let exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=0`;
        // Добавляем случайный параметр, чтобы обойти кеширование при обновлении
        if (forceRefresh) {
            exportUrl += `×tamp=${new Date().getTime()}`;
        }
        return exportUrl;
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
                    backgroundColor: 'rgba(0, 123, 255, 0.5)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: `Столбчатая диаграмма для "${label}"` }
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

        new Chart(canvas, {
            type: 'pie',
            data: {
                labels: chartLabels,
                datasets: [{
                    label: label,
                    data: chartData,
                    backgroundColor: generatePastelColors(chartLabels.length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: `Круговая диаграмма для "${label}"` }
                }
            }
        });
    }
    
    function generatePastelColors(count) {
        const colors = [];
        for (let i = 0; i < count; i++) {
            // Generate a random pastel color
            const hue = Math.floor(Math.random() * 360);
            colors.push(`hsl(${hue}, 70%, 80%)`);
        }
        return colors;
    }
});
