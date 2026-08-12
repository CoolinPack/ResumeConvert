/* NextResume — seven genuinely different resume systems. */
class ResumeTemplates {
    constructor() {
        this.currentTemplate = 1;
        this.names = {
            1: 'Editorial',
            2: 'Split',
            3: 'Swiss',
            4: 'Creative',
            5: 'Executive',
            6: 'European',
            7: 'Academic'
        };
    }

    render(templateId, raw) {
        const data = this.normalize(raw);
        this.currentTemplate = Number(templateId) || 1;
        const renderers = {
            1: this.renderEditorial,
            2: this.renderSplit,
            3: this.renderSwiss,
            4: this.renderCreative,
            5: this.renderExecutive,
            6: this.renderEuropean,
            7: this.renderAcademic
        };
        return (renderers[this.currentTemplate] || this.renderEditorial).call(this, data);
    }

    normalize(raw = {}) {
        const name = [raw.firstName, raw.middleName, raw.lastName].filter(Boolean).join(' ').trim() ||
            raw.name || 'Ваше имя';
        const skills = Array.isArray(raw.skills) ? raw.skills : String(raw.hardSkills || raw.skills || '')
            .split(',').map(v => v.trim()).filter(Boolean);
        const languages = Array.isArray(raw.languages) ? raw.languages.map(v => {
            if (typeof v === 'string') return {name:v, level:'Свободно владею'};
            return {name:v?.name || '', level:v?.level || 'Свободно владею'};
        }).filter(v=>v.name) : String(raw.languages || '')
            .split(',').map(v => v.trim()).filter(Boolean).map(v => ({name:v, level:'Свободно владею'}));
        const experience = Array.isArray(raw.experience) ? raw.experience.map(x => ({
            company: x.company || '',
            position: x.position || '',
            startDate: x.startDate || '',
            endDate: x.endDate || '',
            current: !!x.current,
            description: x.description || ''
        })) : [];
        const education = Array.isArray(raw.education) ? raw.education.map(x => ({
            type: x.type || 'university',
            institution: x.institution || '',
            degree: x.degree || '',
            year: x.year || '',
            classes: x.classes || ''
        })) : [];
        return {
            ...raw,
            name,
            title: raw.desiredPosition || raw.title || 'Желаемая должность',
            email: raw.email || '',
            phone: raw.phone || '',
            link: raw.linkUrl || raw.link || '',
            address: raw.city || raw.address || '',
            photo: raw.photo || null,
            about: raw.about || '',
            skills, languages, experience, education, maritalStatus: raw.maritalStatus || '',
            relocation: raw.relocation || '',
            businessTrips: raw.businessTrips || '',
            salary: raw.salary || '',
            currency: raw.currency || ''
        };
    }

    esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    date(value) {
        if (!value) return '';
        const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
        if (Number.isNaN(d.getTime())) return this.esc(value);
        return d.toLocaleDateString('ru-RU', { month:'short', year:'numeric' }).replace('.', '');
    }

    tx(key, fallback='') { return window.NextI18n?.t(key) || fallback || key; }

    period(exp) {
        const start = this.date(exp.startDate);
        const end = exp.current ? this.tx('ui.untilNow','по настоящее время') : this.date(exp.endDate);
        return [start, end].filter(Boolean).join(' — ') || this.tx('periodMissing','Период не указан');
    }

    photo(data, cls='resume-photo') {
        return data.photo ? `<img class="${cls}" src="${data.photo}" alt="">` : '';
    }

    contact(data, variant='default') {
        const items = [
            data.email && `<span>✉ ${this.esc(data.email)}</span>`,
            data.phone && `<span>☎ ${this.esc(data.phone)}</span>`,
            data.address && `<span>⌖ ${this.esc(data.address)}</span>`,
            data.link && `<span>🔗 ${this.esc(data.link.replace(/^https?:\/\//,''))}</span>`,
            data.maritalStatus && `<span>◦ ${this.esc(data.maritalStatus)}</span>`
        ].filter(Boolean);
        return items.length ? `<div class="r-contact ${variant}">${items.join('')}</div>` : '';
    }

    languageLabel(language) {
        if (typeof language === 'string') return this.esc(language);
        const name=this.esc(language?.name || '');
        const level=this.esc(language?.level || '');
        return level ? `${name} — ${level}` : name;
    }

    languageItems(data, variant='list') {
        if (!data.languages.length) return '';
        return data.languages.map(x => variant==='stack' ? `<div class="t5-lang"><strong>${this.esc(x.name)}</strong><span>${this.esc(x.level)}</span></div>` : `<li>${this.languageLabel(x)}</li>`).join('');
    }

    skills(data, cls='r-tags') {
        return data.skills.length ? `<div class="${cls}">${data.skills.map(s => `<span>${this.esc(s)}</span>`).join('')}</div>` : '';
    }

    experience(data, cls='') {
        return data.experience.map(exp => `
            <article class="r-experience ${cls}">
                <div class="r-exp-top">
                    <strong>${this.esc(exp.position || 'Должность')}</strong>
                    <span>${this.esc(this.period(exp))}</span>
                </div>
                <div class="r-company">${this.esc(exp.company || 'Компания')}</div>
                ${exp.description ? `<p>${this.esc(exp.description)}</p>` : ''}
            </article>`).join('');
    }

    education(data, cls='') {
        const typeLabel={school:this.tx('educationTypes.school','Школа'),college:this.tx('educationTypes.college','Среднее специальное'),university:this.tx('educationTypes.university','Университет / вуз'),other:this.tx('educationTypes.other','Образование')};
        return data.education.map(edu => `
            <article class="r-education ${cls}">
                <strong>${this.esc(edu.institution || 'Учебное заведение')}</strong>
                <span class="r-education-type">${this.esc(typeLabel[edu.type] || this.tx('educationTypes.other','Образование'))}</span>
                ${edu.degree ? `<span>${this.esc(edu.degree)}</span>` : ''}
                ${edu.classes ? `<span>${this.tx('ui.classes','Классов окончено')}: ${this.esc(edu.classes)}</span>` : ''}
                ${edu.year ? `<time>${this.esc(edu.year)}</time>` : ''}
            </article>`).join('');
    }

    section(title, body, cls='') {
        const map={
          'Профиль':'profile','Profile':'profile','О себе':'about','О СЕБЕ':'about','Навыки':'skills','НАВЫКИ':'skills','Core skills':'coreSkills','Основные навыки':'coreSkills','Языки':'languages','ЯЗЫКИ':'languages','Languages':'languages','Опыт работы':'experience','ОПЫТ':'experience','Professional experience':'experience','Образование':'education','ОБРАЗОВАНИЕ':'education','Education':'education','Контакты':'contact','Contact':'contact','CONTACTS':'contact','Ожидания':'salary','Expectations':'salary'
        };
        const translated=map[title]?this.tx(map[title],title):title;
        return body ? `<section class="r-section ${cls}"><h2>${translated}</h2>${body}</section>` : '';
    }

    renderEditorial(d) {
        return `<div class="resume-sheet template-1">
            <header class="t1-head">
                <div class="t1-identity">${this.photo(d,'resume-photo t1-photo')}<div>
                    <div class="eyebrow" >${this.tx('ui.cv','CURRICULUM VITAE')}</div>
                    <h1>${this.esc(d.name)}</h1><div class="r-title">${this.esc(d.title)}</div>
                    ${this.contact(d)}
                </div></div>
                <div class="t1-rule"></div>
            </header>
            <div class="t1-grid">
                <aside>
                    ${this.section('Профиль', d.about ? `<p>${this.esc(d.about)}</p>` : '')}
                    ${this.section('Навыки', this.skills(d))}
                    ${this.section('Языки', d.languages.length ? `<ul class="r-list">${d.languages.map(x=>`<li>${this.languageLabel(x)}</li>`).join('')}</ul>` : '')}
                </aside>
                <main>
                    ${this.section('Опыт работы', this.experience(d))}
                    ${this.section('Образование', this.education(d))}
                </main>
            </div>
        </div>`;
    }

    renderSplit(d) {
        return `<div class="resume-sheet template-2">
            <aside class="t2-side">
                ${this.photo(d,'resume-photo t2-photo')}
                <div class="t2-side-block"><span class="t2-label" >${this.tx('contact','Контакты')}</span>${this.contact(d,'stack')}</div>
                ${this.section('НАВЫКИ', this.skills(d,'r-tags t2-tags'),'t2-section')}
                ${this.section('ЯЗЫКИ', d.languages.length ? `<ul class="t2-langs">${d.languages.map(x=>`<li>${this.languageLabel(x)}</li>`).join('')}</ul>` : '', 't2-section')}
            </aside>
            <main class="t2-main">
                <header><div class="eyebrow" >${this.tx('profile','Профиль')}</div><h1>${this.esc(d.name)}</h1><p>${this.esc(d.title)}</p></header>
                ${this.section('О СЕБЕ', d.about ? `<p>${this.esc(d.about)}</p>` : '', 't2-main-section')}
                ${this.section('ОПЫТ', this.experience(d,'t2-exp'),'t2-main-section')}
                ${this.section('ОБРАЗОВАНИЕ', this.education(d,'t2-edu'),'t2-main-section')}
            </main>
        </div>`;
    }

    renderSwiss(d) {
        return `<div class="resume-sheet template-3">
            <header class="t3-head">
                <div class="t3-number">03</div>
                <div><h1>${this.esc(d.name)}</h1><p>${this.esc(d.title)}</p></div>
                ${this.photo(d,'resume-photo t3-photo')}
            </header>
            ${this.contact(d,'swiss')}
            <div class="t3-rule"></div>
            <div class="t3-grid">
                <main>
                    ${this.section('О себе', d.about ? `<p>${this.esc(d.about)}</p>` : '')}
                    ${this.section('Опыт работы', this.experience(d,'t3-exp'))}
                    ${this.section('Образование', this.education(d))}
                </main>
                <aside>
                    ${this.section('Навыки', this.skills(d,'r-tags t3-tags'))}
                    ${this.section('Языки', d.languages.length ? `<ul class="r-list">${d.languages.map(x=>`<li>${this.languageLabel(x)}</li>`).join('')}</ul>` : '')}
                    ${d.salary ? this.section('Ожидания', `<strong>${this.esc(d.salary)} ${this.esc(d.currency)}</strong>`) : ''}
                </aside>
            </div>
        </div>`;
    }

    renderCreative(d) {
        return `<div class="resume-sheet template-4">
            <div class="t4-top"><div class="t4-accent"></div><div class="t4-head">
                ${this.photo(d,'resume-photo t4-photo')}<div><span class="eyebrow" >${this.tx('ui.hello',"HELLO, I'M")}</span><h1>${this.esc(d.name)}</h1><p>${this.esc(d.title)}</p></div>
            </div></div>
            <div class="t4-grid">
                <aside>
                    ${this.section('Контакты', this.contact(d,'stack'),'t4-section')}
                    ${this.section('Навыки', this.skills(d,'r-tags t4-tags'),'t4-section')}
                    ${this.section('Языки', d.languages.length ? d.languages.map(x=>`<div class="t4-language"><strong>${this.esc(x.name)}</strong><span>${this.esc(x.level)}</span></div>`).join('') : '','t4-section')}
                </aside>
                <main>
                    ${this.section('Обо мне', d.about ? `<p>${this.esc(d.about)}</p>` : '', 't4-main-section')}
                    ${this.section('Опыт', this.experience(d,'t4-exp'), 't4-main-section')}
                    ${this.section('Образование', this.education(d), 't4-main-section')}
                </main>
            </div>
        </div>`;
    }

    renderExecutive(d) {
        return `<div class="resume-sheet template-5">
            <header class="t5-head">
                <div><span class="eyebrow">PROFESSIONAL PROFILE</span><h1>${this.esc(d.name)}</h1><p>${this.esc(d.title)}</p></div>
                ${this.photo(d,'resume-photo t5-photo')}
                ${this.contact(d,'executive')}
            </header>
            <div class="t5-body">
                <main>
                    ${this.section('Профиль', d.about ? `<p>${this.esc(d.about)}</p>` : '')}
                    ${this.section('Опыт работы', this.experience(d,'t5-exp'))}
                    ${this.section('Образование', this.education(d))}
                </main>
                <aside>
                    ${this.section('Ключевые навыки', this.skills(d,'r-tags t5-tags'))}
                    ${this.section('Языки', d.languages.length ? d.languages.map(x=>`<div class="t5-lang"><strong>${this.esc(x.name)}</strong><span>${this.esc(x.level)}</span></div>`).join('') : '')}
                    ${d.relocation ? this.section('Переезд', `<p>${this.esc(d.relocation)}</p>`) : ''}
                    ${d.businessTrips ? this.section('Командировки', `<p>${this.esc(d.businessTrips)}</p>`) : ''}
                </aside>
            </div>
        </div>`;
    }

    renderEuropean(d) {
        return `<div class="resume-sheet template-6">
            <header class="t6-head">
                ${this.photo(d,'resume-photo t6-photo')}
                <div class="t6-name"><h1>${this.esc(d.name)}</h1><p>${this.esc(d.title)}</p></div>
                <div class="t6-contact">${this.contact(d,'stack')}</div>
            </header>
            <div class="t6-bar">BERUFLICHER WERDEGANG</div>
            <div class="t6-grid">
                <main>
                    ${this.section('Опыт работы', this.experience(d,'t6-exp'))}
                    ${this.section('Образование', this.education(d))}
                </main>
                <aside>
                    ${this.section('Профиль', d.about ? `<p>${this.esc(d.about)}</p>` : '')}
                    ${this.section('Компетенции', this.skills(d,'r-tags t6-tags'))}
                    ${this.section('Языки', d.languages.length ? `<ul class="r-list">${d.languages.map(x=>`<li>${this.languageLabel(x)}</li>`).join('')}</ul>` : '')}
                </aside>
            </div>
        </div>`;
    }

    renderAcademic(d) {
        return `<div class="resume-sheet template-7">
            <header class="t7-head">
                <div class="t7-topline"></div>
                ${this.photo(d,'resume-photo t7-photo')}
                <div class="eyebrow" >${this.tx('ui.cv2026','CURRICULUM VITAE · 2026')}</div>
                <h1>${this.esc(d.name)}</h1><p>${this.esc(d.title)}</p>
                ${this.contact(d,'academic')}
            </header>
            <div class="t7-grid">
                <main>
                    ${this.section('Professional experience', this.experience(d,'t7-exp'))}
                    ${this.section('Education', this.education(d))}
                    ${this.section('Profile', d.about ? `<p>${this.esc(d.about)}</p>` : '')}
                </main>
                <aside>
                    ${this.section('Core skills', this.skills(d,'r-tags t7-tags'))}
                    ${this.section('Languages', d.languages.length ? `<ul class="r-list">${d.languages.map(x=>`<li>${this.languageLabel(x)}</li>`).join('')}</ul>` : '')}
                    ${d.email || d.phone || d.address ? this.section('Contact', this.contact(d,'stack')) : ''}
                </aside>
            </div>
        </div>`;
    }
}
