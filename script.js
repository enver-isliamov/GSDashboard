document.addEventListener('DOMContentLoaded', () => {
    // Селекторы элементов
    const spreadsheetIdInput = document.getElementById('spreadsheetId');
    const apiKeyInput = document.getElementById('apiKey');
    const loadDataBtn = document.getElementById('loadDataBtn');
    const sheetsListDiv = document.getElementById('sheetsList');
    const dataPreviewTableDiv = document.getElementById('dataPreviewTable');
    const dataStructureDiv = document.getElementById('dataStructure');
    const activeSheetNameSpan = document.getElementById('activeSheetName');
    const activeSheetRowsSpan = document.getElementById('activeSheetRows');
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsModal = document.getElementById('closeSettingsModal');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const tableLinkInput = document.getElementById('tableLink');
    const saveTableLinkBtn = document.getElementById('saveTableLinkBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const spreadsheetIdValidation = document.getElementById('spreadsheetIdValidation');
    const apiKeyValidation = document.getElementById('apiKeyValidation');
    const settingsFeedback = document.getElementById('settingsFeedback');
    const tableLinkFeedback = document.getElementById('tableLinkFeedback');

    // Analysis section elements
    const analysisTabs = document.querySelectorAll('.analysis-tab');
    const analysisContents = document.querySelectorAll('.analysis-content');
    const totalRecordsSpan = document.getElementById('totalRecords');
    const totalColumnsSpan = document.getElementById('totalColumns');
    const fillRateSpan = document.getElementById('fillRate');
    const dataQualitySpan = document.getElementById('dataQuality');
    const lastMonthTrendSpan = document.getElementById('lastMonthTrend');
    const lastWeekTrendSpan = document.getElementById('lastWeekTrend');
    const borisCountSpan = document.getElementById('borisCount');
    const denisCountSpan = document.getElementById('denisCount');

    // State Variables
    let currentSpreadsheetId = localStorage.getItem('spreadsheetId') || '';
    let currentApiKey = localStorage.getItem('apiKey') || '';
    let sheetsData = [];
    let currentSheetIndex = parseInt(localStorage.getItem('currentSheetIndex')) || 0; // Load last selected sheet index

    // Initialization
    spreadsheetIdInput.value = currentSpreadsheetId;
    apiKeyInput.value = currentApiKey;

    // Functions

    //Load data and update ui
    const loadAndDisplayData = async (spreadsheetId, apiKey, sheetIndex = currentSheetIndex) => {
        try {
            showLoadingIndicator(true);
            sheetsData = await loadSheetsData(spreadsheetId, apiKey);
            createSheetsList(sheetsData);
            showDataPreview(sheetIndex); // Use provided sheetIndex or default
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data. Check your Spreadsheet ID, API Key, and CORS settings.');
        } finally {
            showLoadingIndicator(false);
        }
    }

    // Load initial data if available
    if (currentSpreadsheetId && currentApiKey) {
        loadAndDisplayData(currentSpreadsheetId, currentApiKey, currentSheetIndex); // Load with last selected sheet
    }

    // Fetch Sheets Data
    async function loadSheetsData(spreadsheetId, apiKey) {
        const spreadsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
        const response = await fetch(spreadsheetUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data.sheets;
    }

    // Create Sheets List
    function createSheetsList(sheets) {
        sheetsListDiv.innerHTML = '';
        sheets.forEach((sheet, index) => {
            const sheetButton = document.createElement('button');
            sheetButton.textContent = sheet.properties.title;
            sheetButton.classList.add('sheet-button');
            if (index === currentSheetIndex) {
                sheetButton.classList.add('active');
            }
            sheetButton.addEventListener('click', () => showDataPreview(index));
            sheetsListDiv.appendChild(sheetButton);
        });
    }

    // Show Data Preview for a selected sheet
    async function showDataPreview(sheetIndex) {
        currentSheetIndex = sheetIndex;
        localStorage.setItem('currentSheetIndex', sheetIndex); // Save current sheet index

        // Update active state of sheet buttons
        document.querySelectorAll('.sheet-button').forEach((btn, index) => {
            if (index === sheetIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const sheet = sheetsData[sheetIndex];
        const sheetName = sheet.properties.title;
        activeSheetNameSpan.textContent = sheetName;

        try {
            const sheetValues = await getSheetValues(currentSpreadsheetId, sheetName, currentApiKey);
            if (sheetValues && sheetValues.length > 0) {
                // Create and display table
                const table = createTable(sheetValues);
                dataPreviewTableDiv.innerHTML = '';
                dataPreviewTableDiv.appendChild(table);

                // Display data structure
                const headers = sheetValues[0];
                const structure = detectDataStructure(sheetValues);
                displayDataStructure(headers, structure);

                // Update active sheet rows count
                activeSheetRowsSpan.textContent = sheetValues.length - 1; // Exclude header row

                // Perform and display analytics
                performAndDisplayAnalytics(sheetValues);
            } else {
                dataPreviewTableDiv.innerHTML = '<p>No data to display.</p>';
                dataStructureDiv.innerHTML = '';
                activeSheetRowsSpan.textContent = '0';
            }
        } catch (error) {
            console.error('Error fetching or displaying data:', error);
            dataPreviewTableDiv.innerHTML = '<p>Error fetching data. Check console for details.</p>';
            dataStructureDiv.innerHTML = '';
            activeSheetRowsSpan.textContent = '0';
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

    // Create Table
    function createTable(data) {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Headers
        const headerRow = document.createElement('tr');
        data[0].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Data Rows
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

    // Detect Data Structure
    function detectDataStructure(data) {
        if (!data || data.length <= 1) return [];
        const structure = [];
        const headers = data[0];
        for (let i = 0; i < headers.length; i++) {
            const columnData = data.slice(1).map(row => row[i]);
            structure.push(detectDataType(columnData));
        }
        return structure;
    }

    // Display Data Structure
    function displayDataStructure(headers, structure) {
        dataStructureDiv.innerHTML = '';
        headers.forEach((header, index) => {
            const structureItem = document.createElement('span');
            structureItem.textContent = `${header}: ${structure[index]}`;
            structureItem.classList.add('structure-item');
            dataStructureDiv.appendChild(structureItem);
        });
    }

    // Detect Data Type
    function detectDataType(columnData) {
        const isNumberLike = columnData.every(value => !isNaN(parseFloat(value)) && isFinite(value));
        if (isNumberLike) return 'number';

        const isDateLike = columnData.every(value => !isNaN(new Date(value)));
        if (isDateLike) return 'date';

        return 'text';
    }

    // Perform Analytics
    function performAndDisplayAnalytics(data) {
        if (!data || data.length <= 1) {
            console.warn("Not enough data for analytics.");
            return;
        }

        // Simple Descriptive Analytics
        const totalRecords = data.length - 1; // Exclude header row
        const totalColumns = data[0].length;
        const fillRate = calculateFillRate(data);
        const dataQuality = calculateDataQuality(data);
        const lastMonthTrend = 8; // Placeholder - replace with actual calculation
        const lastWeekTrend = 2; // Placeholder - replace with actual calculation
        const borisCount = countOccurrences(data, 0, 'Борис'); // Count occurrences of 'Борис' in the first column
        const denisCount = countOccurrences(data, 0, 'Денис'); // Count occurrences of 'Денис' in the first column

        // Update UI with analytics data
        totalRecordsSpan.textContent = totalRecords;
        totalColumnsSpan.textContent = totalColumns;
        fillRateSpan.textContent = fillRate.toFixed(2) + '%';
        dataQualitySpan.textContent = dataQuality.toFixed(2) + '%';
        lastMonthTrendSpan.textContent = lastMonthTrend;
        lastWeekTrendSpan.textContent = lastWeekTrend;
        borisCountSpan.textContent = borisCount;
        denisCountSpan.textContent = denisCount;
    }

    // Calculate Fill Rate
    function calculateFillRate(data) {
        let totalCells = (data.length - 1) * data[0].length;
        let filledCells = 0;

        for (let i = 1; i < data.length; i++) {
            data[i].forEach(cell => {
                if (cell && cell.trim() !== '') {
                    filledCells++;
                }
            });
        }

        return (filledCells / totalCells) * 100;
    }

    // Calculate Data Quality (example: non-empty cells)
    function calculateDataQuality(data) {
        let totalCells = (data.length - 1) * data[0].length;
        let validCells = 0;

        for (let i = 1; i < data.length; i++) {
            data[i].forEach((cell, index) => {
                // Add your data quality rules here (e.g., check for valid email, phone number, etc.)
                if (cell && cell.trim() !== '') {
                    validCells++;
                }
            });
        }

        return (validCells / totalCells) * 100;
    }

    // Count Occurrences
    function countOccurrences(data, columnIndex, value) {
        let count = 0;
        for (let i = 1; i < data.length; i++) {
            if (data[i][columnIndex] === value) {
                count++;
            }
        }
        return count;
    }

    // Event Listeners

    // Load Data Button
    loadDataBtn.addEventListener('click', () => {
        const spreadsheetId = spreadsheetIdInput.value;
        const apiKey = apiKeyInput.value;
        loadAndDisplayData(spreadsheetId, apiKey);
    });

    // Refresh Data Button
    refreshDataBtn.addEventListener('click', () => {
        loadAndDisplayData(currentSpreadsheetId, currentApiKey);
    });

    // Settings Button
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    // Close Settings Modal
    closeSettingsModal.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // Save Settings Button
    saveSettingsBtn.addEventListener('click', () => {
        const spreadsheetId = spreadsheetIdInput.value;
        const apiKey = apiKeyInput.value;

        // Validate inputs
        if (!validateInputs(spreadsheetId, apiKey)) return;

        //Store values in local storage
        localStorage.setItem('spreadsheetId', spreadsheetId);
        localStorage.setItem('apiKey', apiKey);

        currentSpreadsheetId = spreadsheetId;
        currentApiKey = apiKey;

        settingsModal.style.display = 'none';
        loadAndDisplayData(currentSpreadsheetId, currentApiKey);
    });

    // Table Link Save Button
    saveTableLinkBtn.addEventListener('click', () => {
        const tableLink = tableLinkInput.value;
        // Implement logic to extract Spreadsheet ID from the link (if necessary)
        // For simplicity, assuming the input is just the Spreadsheet ID
        const spreadsheetId = tableLink;

        spreadsheetIdInput.value = spreadsheetId;
        currentSpreadsheetId = spreadsheetId;

        loadAndDisplayData(currentSpreadsheetId, currentApiKey);

        showFeedback(tableLinkFeedback, "Ссылка на таблицу сохра
