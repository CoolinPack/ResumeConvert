// ============================================================
// КОНФИГУРАЦИЯ
// ============================================================

const API_URL = 'http://localhost:5000';
// const API_URL = 'https://convertfuctions.onrender.com';

// ============================================================
// ВСЕ ФОРМАТЫ (22)
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

function isImage(f) {
    return ['png','jpg','jpeg','gif','bmp','tiff','webp','ico','svg','heic'].includes(f);
}

function isDocument(f) {
    return ['pdf','doc','docx','odt','rtf','txt'].includes(f);
}

function isSpreadsheet(f) {
    return ['xls','xlsx','ods','csv'].includes(f);
}

function isPresentation(f) {
    return ['ppt','pptx','odp'].includes(f);
}

function getConversionType(input, output) {
    input = input.toLowerCase();
    output = output.toLowerCase();

    if (isImage(input) && isImage(output)) return 'image_to_image';
    if (isImage(input) && output === 'pdf') return 'image_to_pdf';
    if (input === 'pdf' && isImage(output)) return 'pdf_to_image';
    if (input === 'pdf' && output === 'txt') return 'pdf_to_text';
    if (input === 'pdf' && output === 'svg') return 'pdf_to_svg';
    if (input === 'pdf' && output === 'pdf') return 'pdf_to_pdf';
    if (isDocument(input) && output === 'pdf') return 'document_to_pdf';
    if (isDocument(input) && isDocument(output)) return 'document_to_document';
    if (isSpreadsheet(input) && output === 'pdf') return 'spreadsheet_to_pdf';
    if (['xls','xlsx','ods'].includes(input) && output === 'csv') return 'spreadsheet_to_csv';
    if (input === 'csv' && ['xls','xlsx','ods'].includes(output)) return 'csv_to_spreadsheet';
    if (isPresentation(input) && output === 'pdf') return 'presentation_to_pdf';
    if (isPresentation(input) && isImage(output)) return 'presentation_to_image';

    return null;
}

function getOutputFormats(input) {
    input = input.toLowerCase();
    if (!ALL_FORMATS.includes(input)) return [];
    var result = new Set();
    ALL_FORMATS.forEach(function(output) {
        if (getConversionType(input, output)) result.add(output);
    });
    if (!result.has(input)) result.add(input);
    return Array.from(result);
}

// ============================================================
// КОНВЕРТАЦИЯ ЧЕРЕЗ API
// ============================================================

async function convertFile(file, inputFormat, outputFormat) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = async function(e) {
            try {
                var base64 = e.target.result.split(',')[1];
                var response = await fetch(API_URL + '/api/convert', {
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
                    var error = await response.json();
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
// ФУНКЦИЯ ФОРМАТИРОВАНИЯ РАЗМЕРА
// ============================================================

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Байт';
    var k = 1024;
    var sizes = ['Байт', 'КБ', 'МБ', 'ГБ'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ============================================================
// ГЛАВНАЯ ФУНКЦИЯ — ЗАПУСКАЕТСЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ
// ============================================================

document.addEventListener('DOMContentLoaded', function() {

    console.log('🔄 Конвертер загружен');

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
    var downloadBtn = document.getElementById('downloadBtn');

    // Проверяем, что элементы найдены
    if (!dropZone) console.error('❌ dropZone не найден');
    if (!fileInput) console.error('❌ fileInput не найден');

    var selectedFile = null;
    var convertedBlob = null;
    var convertedFileName = null;

    // === ОБРАБОТЧИК ФАЙЛА ===
    function handleFile(file) {
        var ext = file.name.split('.').pop().toLowerCase();

        if (!ALL_FORMATS.includes(ext)) {
            alert('Формат "' + ext + '" не поддерживается');
            return;
        }

        selectedFile = file;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileInfo.classList.add('active');
        fileInfo.style.display = 'flex';

        fromSelect.value = ext;

        // Обновляем выходные форматы
        var outputs = getOutputFormats(ext);
        var currentTo = toSelect.value;
        toSelect.innerHTML = '';
        outputs.forEach(function(f) {
            var opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f.toUpperCase();
            toSelect.appendChild(opt);
        });
        if (currentTo && outputs.indexOf(currentTo) !== -1) {
            toSelect.value = currentTo;
        } else if (outputs.length) {
            toSelect.value = outputs[0];
        }

        var controls = document.getElementById('controls');
        if (controls) controls.classList.add('active');

        convertBtn.disabled = false;
        resultBox.classList.remove('active');
        resultBox.style.display = 'none';
        convertedBlob = null;
    }

    function removeFile() {
        selectedFile = null;
        fileInfo.classList.remove('active');
        fileInfo.style.display = 'none';
        convertBtn.disabled = true;
        resultBox.classList.remove('active');
        resultBox.style.display = 'none';
        convertedBlob = null;
        fileInput.value = '';
        var controls = document.getElementById('controls');
        if (controls) controls.classList.remove('active');
    }

    // === СОБЫТИЯ ===

    // Клик по зоне загрузки
    if (dropZone) {
        dropZone.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('🖱️ Клик по зоне загрузки');
            fileInput.click();
        });

        // Drag & Drop
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            dropZone.style.borderColor = '#6C63FF';
            dropZone.style.background = 'rgba(108,99,255,0.05)';
        });

        dropZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
            dropZone.style.background = 'rgba(255,255,255,0.02)';
        });

        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(255,255,255,0.1)';
            dropZone.style.background = 'rgba(255,255,255,0.02)';
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
    }

    // Выбор файла
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            console.log('📁 Файл выбран');
            if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });
    }

    // Удаление файла
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', function(e) {
            e.preventDefault();
            removeFile();
        });
    }

    // Смена входного формата
    if (fromSelect) {
        fromSelect.addEventListener('change', function() {
            var outputs = getOutputFormats(this.value);
            var currentTo = toSelect.value;
            toSelect.innerHTML = '';
            outputs.forEach(function(f) {
                var opt = document.createElement('option');
                opt.value = f;
                opt.textContent = f.toUpperCase();
                toSelect.appendChild(opt);
            });
            if (currentTo && outputs.indexOf(currentTo) !== -1) {
                toSelect.value = currentTo;
            } else if (outputs.length) {
                toSelect.value = outputs[0];
            }
        });
    }

    // === КОНВЕРТАЦИЯ ===
    if (convertBtn) {
        convertBtn.addEventListener('click', async function() {
            if (!selectedFile) {
                alert('Выберите файл');
                return;
            }

            var inputFormat = fromSelect.value;
            var outputFormat = toSelect.value;

            if (!inputFormat || !outputFormat) {
                alert('Выберите формат');
                return;
            }

            if (!getConversionType(inputFormat, outputFormat)) {
                alert('Конвертация из ' + inputFormat.toUpperCase() + ' в ' + outputFormat.toUpperCase() + ' не поддерживается');
                return;
            }

            convertBtn.disabled = true;
            convertBtn.textContent = 'Конвертация...';
            resultBox.classList.remove('active');
            resultBox.style.display = 'none';
            convertedBlob = null;

            try {
                var blob = await convertFile(selectedFile, inputFormat, outputFormat);
                convertedBlob = blob;
                convertedFileName = 'converted.' + outputFormat;

                resultBox.classList.add('active');
                resultBox.style.display = 'block';
                resultMessage.textContent = '✅ Конвертация успешно завершена!';
                resultMeta.textContent = selectedFile.name + ' → ' + outputFormat.toUpperCase();
                if (downloadBtn) downloadBtn.disabled = false;

            } catch (error) {
                resultBox.classList.add('active');
                resultBox.style.display = 'block';
                resultMessage.textContent = '❌ Ошибка: ' + error.message;
                resultMeta.textContent = 'Попробуйте другой файл или формат';
                if (downloadBtn) downloadBtn.disabled = true;
            } finally {
                convertBtn.disabled = false;
                convertBtn.textContent = 'Конвертировать';
            }
        });
    }

    // === СКАЧИВАНИЕ ===
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
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
        });
    }

    // === ПРОВЕРКА API ===
    async function checkAPI() {
        try {
            var response = await fetch(API_URL + '/api/health');
            if (response.ok) {
                console.log('✅ API доступен');
            } else {
                console.warn('⚠️ API недоступен');
                if (resultBox) {
                    resultBox.classList.add('active');
                    resultBox.style.display = 'block';
                    resultMessage.textContent = '⚠️ Сервер конвертации недоступен';
                    resultMeta.textContent = 'Запустите бэкенд: python app.py';
                    if (downloadBtn) downloadBtn.disabled = true;
                }
            }
        } catch (error) {
            console.warn('⚠️ API недоступен:', error.message);
            if (resultBox) {
                resultBox.classList.add('active');
                resultBox.style.display = 'block';
                resultMessage.textContent = '⚠️ Сервер конвертации недоступен';
                resultMeta.textContent = 'Запустите бэкенд: python app.py';
                if (downloadBtn) downloadBtn.disabled = true;
            }
        }
    }

    setTimeout(checkAPI, 1000);

    console.log('✅ Конвертер инициализирован');
});
