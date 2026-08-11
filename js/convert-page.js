// ==================== КОНФИГУРАЦИЯ ====================
// Для локальной разработки
const API_URL = 'http://localhost:5000';
// Для продакшена на Render (раскомментируйте при деплое)
// const API_URL = 'https://convertfuctions.onrender.com';

// ==================== ПОДДЕРЖИВАЕМЫЕ ФОРМАТЫ ====================
const FORMATS = {
    image: ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'ico', 'svg', 'heic'],
    document: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt'],
    spreadsheet: ['xls', 'xlsx', 'ods', 'csv'],
    presentation: ['ppt', 'pptx', 'odp']
};

const ALL_FORMATS = [...FORMATS.image, ...FORMATS.document, ...FORMATS.spreadsheet, ...FORMATS.presentation];

// ==================== МАТРИЦА КОНВЕРТАЦИЙ ====================
function getConversionType(inputFormat, outputFormat) {
    inputFormat = inputFormat.toLowerCase();
    outputFormat = outputFormat.toLowerCase();
    
    // Изображение → Изображение
    if (FORMATS.image.includes(inputFormat) && FORMATS.image.includes(outputFormat)) {
        return 'image_to_image';
    }
    
    // Изображение → PDF
    if (FORMATS.image.includes(inputFormat) && outputFormat === 'pdf') {
        return 'image_to_pdf';
    }
    
    // PDF → Изображение
    if (inputFormat === 'pdf' && FORMATS.image.includes(outputFormat)) {
        return 'pdf_to_image';
    }
    
    // PDF → Текст
    if (inputFormat === 'pdf' && outputFormat === 'txt') {
        return 'pdf_to_text';
    }
    
    // PDF → SVG
    if (inputFormat === 'pdf' && outputFormat === 'svg') {
        return 'pdf_to_svg';
    }
    
    // PDF → PDF (сжатие)
    if (inputFormat === 'pdf' && outputFormat === 'pdf') {
        return 'pdf_to_pdf';
    }
    
    // Документ → PDF
    if (['doc', 'docx', 'odt', 'rtf'].includes(inputFormat) && outputFormat === 'pdf') {
        return 'document_to_pdf';
    }
    
    // Документ → Документ
    if (['doc', 'docx', 'odt', 'rtf'].includes(inputFormat) && ['doc', 'docx', 'odt', 'rtf'].includes(outputFormat)) {
        return 'document_to_document';
    }
    
    // Таблица → PDF
    if (FORMATS.spreadsheet.includes(inputFormat) && outputFormat === 'pdf') {
        return 'spreadsheet_to_pdf';
    }
    
    // Таблица → CSV
    if (['xls', 'xlsx', 'ods'].includes(inputFormat) && outputFormat === 'csv') {
        return 'spreadsheet_to_csv';
    }
    
    // CSV → Таблица
    if (inputFormat === 'csv' && ['xls', 'xlsx', 'ods'].includes(outputFormat)) {
        return 'csv_to_spreadsheet';
    }
    
    // Презентация → PDF
    if (FORMATS.presentation.includes(inputFormat) && outputFormat === 'pdf') {
        return 'presentation_to_pdf';
    }
    
    // Презентация → Изображение
    if (FORMATS.presentation.includes(inputFormat) && FORMATS.image.includes(outputFormat)) {
        return 'presentation_to_image';
    }
    
    return null;
}

// ==================== ПОЛУЧЕНИЕ ВОЗМОЖНЫХ ФОРМАТОВ ====================
function getOutputFormats(inputFormat) {
    inputFormat = inputFormat.toLowerCase();
    const result = new Set();
    
    // Если формат не поддерживается
    if (!ALL_FORMATS.includes(inputFormat)) {
        return [];
    }
    
    // Проходим по всем возможным конвертациям
    ALL_FORMATS.forEach(outputFormat => {
        if (getConversionType(inputFormat, outputFormat)) {
            result.add(outputFormat);
        }
    });
    
    // Добавляем формат в себя (если он не в списке)
    if (!result.has(inputFormat)) {
        result.add(inputFormat);
    }
    
    return Array.from(result);
}

// ==================== ОСНОВНАЯ ЛОГИКА КОНВЕРТАЦИИ ====================
async function convertFile(file, inputFormat, outputFormat) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const base64 = e.target.result.split(',')[1];
                
                const response = await fetch(`${API_URL}/api/convert`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputFormat: inputFormat,
                        outputFormat: outputFormat,
                        fileContent: base64,
                        fileName: file.name
                    })
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    reject(new Error(error.error || 'Ошибка конвертации'));
                    return;
                }
                
                const blob = await response.blob();
                resolve(blob);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ==================== ЗАГРУЗКА ФОРМАТОВ ПРИ СТАРТЕ ====================
async function loadFormats() {
    try {
        const response = await fetch(`${API_URL}/api/formats`);
        if (response.ok) {
            const data = await response.json();
            console.log('Доступные форматы:', data);
        }
    } catch (error) {
        console.error('Не удалось загрузить форматы:', error);
    }
}

// ==================== UI ЛОГИКА ====================
document.addEventListener('DOMContentLoaded', function() {
    // Загружаем форматы
    loadFormats();
    
    // Получаем элементы
    const fileInput = document.getElementById('fileInput');
    const outputFormatSelect = document.getElementById('outputFormat');
    const convertBtn = document.getElementById('convertBtn');
    const statusDiv = document.getElementById('status');
    const progressBar = document.getElementById('progressBar');
    const resultDiv = document.getElementById('result');
    
    // Если элементов нет, создаём их
    if (!fileInput) {
        console.warn('Элементы не найдены, создаём их динамически');
        createUI();
        return;
    }
    
    // Обработка выбора файла
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const extension = file.name.split('.').pop().toLowerCase();
        
        // Проверяем, поддерживается ли формат
        if (!ALL_FORMATS.includes(extension)) {
            showStatus(`Формат "${extension}" не поддерживается`, 'error');
            return;
        }
        
        // Обновляем информацию о файле
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = formatFileSize(file.size);
        document.getElementById('fileFormat').textContent = extension.toUpperCase();
        
        // Заполняем возможные выходные форматы
        const outputFormats = getOutputFormats(extension);
        outputFormatSelect.innerHTML = '';
        outputFormats.forEach(format => {
            const option = document.createElement('option');
            option.value = format;
            option.textContent = format.toUpperCase();
            outputFormatSelect.appendChild(option);
        });
        
        // Показываем кнопку конвертации
        convertBtn.style.display = 'block';
        showStatus(`Файл "${file.name}" готов к конвертации`, 'info');
    });
    
    // Конвертация
    convertBtn.addEventListener('click', async function() {
        const file = fileInput.files[0];
        if (!file) {
            showStatus('Выберите файл', 'error');
            return;
        }
        
        const inputFormat = file.name.split('.').pop().toLowerCase();
        const outputFormat = outputFormatSelect.value;
        
        if (!outputFormat) {
            showStatus('Выберите выходной формат', 'error');
            return;
        }
        
        // Проверяем, поддерживается ли конвертация
        const conversionType = getConversionType(inputFormat, outputFormat);
        if (!conversionType) {
            showStatus(`Конвертация из ${inputFormat} в ${outputFormat} не поддерживается`, 'error');
            return;
        }
        
        // Запускаем конвертацию
        convertBtn.disabled = true;
        convertBtn.textContent = 'Конвертация...';
        showStatus('Идёт конвертация...', 'info');
        progressBar.style.display = 'block';
        
        try {
            const blob = await convertFile(file, inputFormat, outputFormat);
            
            // Скачивание результата
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `converted_${Date.now()}.${outputFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showStatus(`✅ Конвертация успешно завершена!`, 'success');
            resultDiv.innerHTML = `<p>Файл: converted.${outputFormat}</p>`;
            
        } catch (error) {
            showStatus(`❌ Ошибка: ${error.message}`, 'error');
        } finally {
            convertBtn.disabled = false;
            convertBtn.textContent = 'Конвертировать';
            progressBar.style.display = 'none';
        }
    });
});

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) {
        console.log(message);
        return;
    }
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function createUI() {
    // Создаём интерфейс, если его нет
    const container = document.querySelector('.container') || document.body;
    
    container.innerHTML = `
        <div class="converter-container">
            <h2>Конвертер файлов (22 формата)</h2>
            
            <div class="upload-area" id="uploadArea">
                <input type="file" id="fileInput" style="display:none">
                <div class="upload-placeholder">
                    <p>Перетащите файл сюда или <span class="browse-link">выберите файл</span></p>
                    <p class="supported-formats">Поддерживается: ${ALL_FORMATS.map(f => f.toUpperCase()).join(', ')}</p>
                </div>
            </div>
            
            <div class="file-info" id="fileInfo" style="display:none">
                <p>Файл: <span id="fileName"></span></p>
                <p>Размер: <span id="fileSize"></span></p>
                <p>Формат: <span id="fileFormat"></span></p>
            </div>
            
            <div class="options">
                <label>Выходной формат:</label>
                <select id="outputFormat"></select>
            </div>
            
            <button id="convertBtn" style="display:none">Конвертировать</button>
            
            <div class="progress" id="progressBar" style="display:none">
                <div class="progress-bar"></div>
            </div>
            
            <div id="status" class="status" style="display:none"></div>
            <div id="result"></div>
        </div>
        
        <style>
            .converter-container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; }
            .upload-area { border: 2px dashed #ccc; border-radius: 10px; padding: 40px; text-align: center; cursor: pointer; }
            .upload-area:hover { border-color: #007bff; background: #f8f9fa; }
            .browse-link { color: #007bff; cursor: pointer; text-decoration: underline; }
            .supported-formats { font-size: 12px; color: #666; margin-top: 10px; }
            .file-info { background: #f0f0f0; padding: 10px; border-radius: 5px; margin: 10px 0; }
            .options { margin: 15px 0; }
            .options select { padding: 8px 12px; border-radius: 5px; border: 1px solid #ccc; width: 100%; }
            #convertBtn { background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; width: 100%; margin: 10px 0; }
            #convertBtn:disabled { background: #6c757d; cursor: not-allowed; }
            .progress { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0; }
            .progress-bar { width: 0%; height: 100%; background: #007bff; animation: progress 2s infinite; }
            @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
            .status { padding: 10px; border-radius: 5px; margin: 10px 0; display: none; }
            .status.info { background: #cce5ff; color: #004085; display: block; }
            .status.success { background: #d4edda; color: #155724; display: block; }
            .status.error { background: #f8d7da; color: #721c24; display: block; }
            #result { margin-top: 10px; }
        </style>
    `;
    
    // Перепривязываем события
    document.getElementById('uploadArea').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', function(e) {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            const extension = file.name.split('.').pop().toLowerCase();
            
            document.getElementById('fileName').textContent = file.name;
            document.getElementById('fileSize').textContent = formatFileSize(file.size);
            document.getElementById('fileFormat').textContent = extension.toUpperCase();
            document.getElementById('fileInfo').style.display = 'block';
            
            const outputFormats = getOutputFormats(extension);
            const select = document.getElementById('outputFormat');
            select.innerHTML = '';
            outputFormats.forEach(format => {
                const option = document.createElement('option');
                option.value = format;
                option.textContent = format.toUpperCase();
                select.appendChild(option);
            });
            
            document.getElementById('convertBtn').style.display = 'block';
        }
    });
    
    document.getElementById('convertBtn').addEventListener('click', function() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        if (!file) return;
        
        const inputFormat = file.name.split('.').pop().toLowerCase();
        const outputFormat = document.getElementById('outputFormat').value;
        
        const btn = this;
        btn.disabled = true;
        btn.textContent = 'Конвертация...';
        document.getElementById('progressBar').style.display = 'block';
        
        convertFile(file, inputFormat, outputFormat)
            .then(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `converted.${outputFormat}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showStatus('✅ Конвертация успешно завершена!', 'success');
            })
            .catch(error => {
                showStatus(`❌ Ошибка: ${error.message}`, 'error');
            })
            .finally(() => {
                btn.disabled = false;
                btn.textContent = 'Конвертировать';
                document.getElementById('progressBar').style.display = 'none';
            });
    });
}
