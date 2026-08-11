import { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-render-api.onrender.com';

export default function ConvertPage() {
  const [file, setFile] = useState(null);
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formats, setFormats] = useState({ formats: [], categories: {}, conversions: {} });

  // Загрузка поддерживаемых форматов
  const loadFormats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/formats`);
      setFormats(response.data);
    } catch (err) {
      console.error('Failed to load formats:', err);
    }
  };

  // Получение возможных выходных форматов для входного
  const getOutputFormats = (input) => {
    const conversions = formats.conversions || {};
    const result = new Set();
    
    // Проверяем все типы конвертаций
    Object.entries(conversions).forEach(([type, formatList]) => {
      const [from, to] = type.split('_to_');
      if (from === 'image' && input in ['png','jpg','jpeg','gif','bmp','tiff','webp','ico']) {
        formatList.forEach(f => result.add(f));
      }
      if (from === 'pdf' && input === 'pdf') {
        formatList.forEach(f => result.add(f));
      }
      // Добавьте остальные проверки
    });
    
    // Если есть специфичные форматы
    if (input === 'pdf') {
      ['png','jpg','jpeg','txt','svg','pdf'].forEach(f => result.add(f));
    }
    if (['doc','docx','odt','rtf'].includes(input)) {
      ['pdf','doc','docx','odt','rtf'].forEach(f => result.add(f));
    }
    
    return Array.from(result);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    setFile(selectedFile);
    setInputFormat(extension);
    setOutputFormat('');
    setError('');
    
    // Подгружаем возможные выходные форматы
    const outputs = getOutputFormats(extension);
    if (outputs.length > 0) {
      setOutputFormat(outputs[0]);
    }
  };

  const handleConvert = async () => {
    if (!file || !inputFormat || !outputFormat) {
      setError('Пожалуйста, выберите файл и форматы');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Конвертация файла в base64
      const reader = new FileReader();
      const fileBase64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      const response = await axios.post(`${API_URL}/api/convert`, {
        inputFormat,
        outputFormat,
        fileContent: fileBase64,
        fileName: file.name
      }, {
        responseType: 'blob'
      });

      // Скачивание результата
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `converted.${outputFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка конвертации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Конвертер файлов (20+ форматов)</h1>
      
      <div className="border-2 border-dashed p-6 rounded-lg">
        <input
          type="file"
          onChange={handleFileChange}
          className="w-full"
          accept=".png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp,.ico,.pdf,.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp"
        />
        
        {file && (
          <div className="mt-4">
            <p>Файл: {file.name}</p>
            <p>Входной формат: {inputFormat}</p>
            
            <div className="mt-2">
              <label className="block mb-1">Выходной формат:</label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="border p-2 rounded"
              >
                <option value="">Выберите формат</option>
                {getOutputFormats(inputFormat).map((format) => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleConvert}
              disabled={loading}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Конвертация...' : 'Конвертировать'}
            </button>
            
            {error && (
              <div className="mt-4 text-red-500">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Поддерживаемые форматы:</p>
        <div className="grid grid-cols-4 gap-2 mt-1">
          {formats.formats.map((format) => (
            <span key={format} className="bg-gray-100 px-2 py-1 rounded text-center">
              {format.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
