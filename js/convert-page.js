// ============================================================
// КОНФИГУРАЦИЯ
// ============================================================

// Для локальной разработки
const API_URL = 'http://localhost:5000';
// Для продакшена на Render (раскомментируйте при деплое)
// const API_URL = 'https://convertfuctions.onrender.com';

// ============================================================
// ПОДДЕРЖИВАЕМЫЕ ФОРМАТЫ (22)
// ============================================================

const ALL_FORMATS = [
    'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'ico', 'svg', 'heic',
    'pdf', 'doc', 'docx', 'odt', 'rtf', 'txt',
    'xls', 'xlsx', 'ods', 'csv',
    'ppt', 'pptx', 'odp'
];

// ============================================================
// МАТРИЦА КОНВЕРТАЦИЙ
// ============================================================

function getConversionType(input, output) {
    input = input.toLowerCase();
    output = output.toLowerCase();

    // Изображение → Изображение
    if (isImage(input) && isImage(output)) return 'image_to_image';
    // Изображение → PDF
    if (isImage(input) && output === 'pdf') return 'image_to_pdf';
    // PDF → Изображение
    if (input === 'pdf' && isImage(output)) return 'pdf_to_image';
    // PDF → Текст
    if (input === 'pdf' && output === 'txt') return 'pdf_to_text';
    // PDF → SVG
    if (input === 'pdf' && output === 'svg') return 'pdf_to_svg';
    // PDF → PDF (сжатие)
    if (input === 'pdf' && output === 'pdf') return 'pdf_to_pdf';
    // Документ → PDF
    if (isDocument(input) && output === 'pdf') return 'document_to_pdf';
    // Документ → Документ
    if (isDocument(input) && isDocument(output)) return 'document_to_document';
    // Таблица → PDF
    if (isSpreadsheet(input) && output === 'pdf') return 'spreadsheet_to_pdf';
    // Таблица → CSV
    if (['xls', 'xlsx', 'ods'].includes(input) && output === 'csv') return 'spreadsheet_to_csv';
    // CSV → Таблица
    if (input === 'csv' && ['xls', 'xlsx', 'ods'].includes(output)) return 'csv_to_spreadsheet';
    // Презентация → PDF
    if (isPresentation(input) && output === 'pdf') return 'presentation_to_pdf';
    // Презентация → Изображение
    if (isPresentation(input) && isImage(output)) return 'presentation_to_image';

    return null;
}

function isImage(format) {
    return ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'ico', 'svg', 'heic'].includes(format);
}

function isDocument(format) {
    return ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt'].includes(format);
}

function isSpreadsheet(format) {
    return ['xls', 'xlsx', 'ods', 'csv'].includes(format);
}

function isPresentation(format) {
    return ['ppt', 'pptx', 'odp'].includes(format);
}

function getOutputFormats(input) {
    input = input.toLowerCase();
    if (!ALL_FORMATS.includes(input)) return [];
    const result = new Set();
    ALL_FORMATS.forEach(output => {
        if (getConversionType(input, output)) result.add(output);
    });
    if (!result.has(input)) result.add(input);
    return Array.from(result);
}

// ============================================================
// КОНВЕРТАЦИЯ ЧЕРЕЗ API
// ============================================================

async function convertFile(file, inputFormat, outputFormat) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const base64 = e.target.result.split(',')[1];
                const response = await fetch(API_URL + '/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                resolve(await response.blob());
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================================
// UI — СОХРАНЯЕМ ОРИГИНАЛЬНЫЙ ДИЗАЙН
// ============================================================

document.addEventListener('DOMContentLoaded', function() {

    // === ЭЛЕМЕНТЫ ===
    var dropZone = document.getElementById('dropZone');
    var fileInput = document.getElementById('fileInput');
    var fileInfo = document.getElementById('fileInfo');
    var fileName = document.getElementById('fileName');
    var fileSize = document.getElementById('fileSize');
    var removeFileBtn = document.getElementById('removeFile');
    var fromSelect = document.getElementById('fromFormat');
    var toSelect = document.getElementById('toFormat');
    var convertBtn = document.getElementById('convertBtn');
    var resultBox = document.getElementById('resultBox');
    var resultMessage = document.getElementById('resultMessage');
    var resultMeta = document.getElementById('resultMeta');
    var downloadBtn = document.getElementById('downloadConvertedBtn');
    var highQualityCheck = document.getElementById('highQuality');
    var compressCheck = document.getElementById('compress');

    var selectedFile = null;
    var convertedBlob = null;
    var convertedFileName = null;

    // === ЗАПОЛНЯЕМ СПИСОК ФОРМАТОВ ===
    function populateFormatSelects() {
        var formats = [
            'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'webp', 'ico', 'svg', 'heic',
            'pdf', 'doc', 'docx', 'odt', 'rtf', 'txt',
            'xls', 'xlsx', 'ods', 'csv',
            'ppt', 'pptx', 'odp'
        ];
        formats.sort();

        [fromSelect, toSelect].forEach(function(select) {
            var currentValue = select.value;
            select.innerHTML = '';
            formats.forEach(function(f) {
                var opt = document.createElement('option');
                opt.value = f;
                opt.textContent = f.toUpperCase();
                select.appendChild(opt);
            });
            if (currentValue && formats.indexOf(currentValue) !== -1) {
                select.value = currentValue;
            }
        });
    }
    populateFormatSelects();

    // === ОБНОВЛЕНИЕ ВЫХОДНЫХ ФОРМАТОВ ===
    function updateOutputFormats(inputFormat) {
        var outputs = getOutputFormats(inputFormat);
        var currentValue = toSelect.value;
        toSelect.innerHTML = '';
        outputs.forEach(function(f) {
            var opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f.toUpperCase();
            toSelect.appendChild(opt);
        });
        if (currentValue && outputs.indexOf(currentValue) !== -1) {
            toSelect.value = currentValue;
        }
        // Если формат не поддерживается, выбираем первый
        if (!toSelect.value && outputs.length) {
            toSelect.value = outputs[0];
        }
    }

    // === ВЫБОР ФАЙЛА ===
    function handleFile(file) {
        var ext = file.name.split('.').pop().toLowerCase();

        if (!ALL_FORMATS.includes(ext)) {
            alert('Формат "' + ext + '" не поддерживается. Доступные форматы: ' + ALL_FORMATS.join(', '));
            return;
        }

        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.style.display = 'block';
        fromSelect.value = ext;
        updateOutputFormats(ext);
        convertBtn.disabled = false;
        resultBox.style.display = 'none';
        convertedBlob = null;
        convertedFileName = null;
        document.getElementById('filePreview').style.display = 'none';
    }

    // === УДАЛЕНИЕ ФАЙЛА ===
    function removeFile() {
        selectedFile = null;
        fileInfo.style.display = 'none';
        convertBtn.disabled = true;
        resultBox.style.display = 'none';
        convertedBlob = null;
        convertedFileName = null;
        fileInput.value = '';
        document.getElementById('filePreview').style.display = 'none';
    }

    // === ФОРМАТИРОВАНИЕ РАЗМЕРА ===
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Байт';
        var k = 1024;
        var sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // === СОБЫТИЯ ===

    // Клик по зоне загрузки
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });

    // Выбор файла
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag & Drop
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', function() {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Удаление файла
    removeFileBtn.addEventListener('click', removeFile);

    // Смена входного формата (обновляем выходные)
    fromSelect.addEventListener('change', function() {
        if (selectedFile) {
            var ext = selectedFile.name.split('.').pop().toLowerCase();
            if (this.value !== ext) {
                // Если пользователь меняет формат вручную — обновляем список
            }
            updateOutputFormats(this.value);
        }
    });

    // === КОНВЕРТАЦИЯ ===
    convertBtn.addEventListener('click', async function() {
        if (!selectedFile) {
            alert('Выберите файл');
            return;
        }

        var inputFormat = fromSelect.value;
        var outputFormat = toSelect.value;

        if (!inputFormat || !outputFormat) {
            alert('Выберите входной и выходной формат');
            return;
        }

        if (!getConversionType(inputFormat, outputFormat)) {
            alert('Конвертация из ' + inputFormat.toUpperCase() + ' в ' + outputFormat.toUpperCase() + ' не поддерживается');
            return;
        }

        // Блокируем кнопку
        convertBtn.disabled = true;
        convertBtn.textContent = 'Конвертация...';
        resultBox.style.display = 'none';
        convertedBlob = null;
        convertedFileName = null;

        try {
            var blob = await convertFile(selectedFile, inputFormat, outputFormat);

            convertedBlob = blob;
            convertedFileName = 'converted.' + outputFormat;

            // Показываем результат
            resultBox.style.display = 'block';
            resultMessage.textContent = '✅ Конвертация успешно завершена!';
            resultMeta.textContent = 'Файл: ' + selectedFile.name + ' → ' + outputFormat.toUpperCase();

            // Автоскачивание (если нужно)
            // downloadResult();

        } catch (error) {
            resultBox.style.display = 'block';
            resultMessage.textContent = '❌ Ошибка: ' + error.message;
            resultMeta.textContent = 'Попробуйте другой файл или формат';
        } finally {
            convertBtn.disabled = false;
            convertBtn.textContent = 'Конвертировать';
        }
    });

    // === СКАЧИВАНИЕ РЕЗУЛЬТАТА ===
    function downloadResult() {
        if (!convertedBlob) {
            alert('Сначала сконвертируйте файл');
            return;
        }
        var url = URL.createObjectURL(convertedBlob);
        var a = document.createElement('a');
        a.href = url;
        a.download = convertedFileName || 'converted.file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadBtn.addEventListener('click', downloadResult);

    // === ПРОВЕРКА API ===
    async function checkAPI() {
        try {
            var response = await fetch(API_URL + '/api/health');
            if (response.ok) {
                console.log('✅ API доступен');
            } else {
                console.warn('⚠️ API недоступен');
                resultBox.style.display = 'block';
                resultMessage.textContent = '⚠️ Сервер конвертации недоступен';
                resultMeta.textContent = 'Убедитесь, что бэкенд запущен на ' + API_URL;
            }
        } catch (error) {
            console.warn('⚠️ API недоступен:', error.message);
            resultBox.style.display = 'block';
            resultMessage.textContent = '⚠️ Сервер конвертации недоступен';
            resultMeta.textContent = 'Запустите бэкенд локально: python app.py';
        }
    }

    // Проверяем API через 1 секунду после загрузки
    setTimeout(checkAPI, 1000);

    // === ПРЕДВАРИТЕЛЬНЫЙ ПРОСМОТР (опционально) ===
    // Можно добавить превью для изображений и PDF
});
