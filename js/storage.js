class StorageManager {
    constructor() {
        this.key = 'resume_builder_data';
    }

    saveResumeData(data) {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) {
            console.error('Ошибка сохранения:', e);
        }
    }

    getResumeData() {
        try {
            const data = localStorage.getItem(this.key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Ошибка загрузки:', e);
            return null;
        }
    }

    clearData() {
        localStorage.removeItem(this.key);
    }
}