document.addEventListener('DOMContentLoaded', () => {
    const templates = new ResumeTemplates();
    const templatePreviewData = {
        firstName:'Имя', lastName:'Фамилия', desiredPosition:'Product Designer',
        city:'Ташкент', email:'alex@example.com', phone:'+998 90 123 45 67',
        about:'Создаю понятные цифровые продукты и улучшаю пользовательский опыт.',
        hardSkills:'Figma, UX/UI, Research', languages:[{name:'Русский',level:(window.NextI18n?.dict?.[window.NextI18n.locale?.()||'ru']?.languageLevels?.[5] || 'Свободно владею')},{name:'Английский',level:'Рабочий уровень'}], maritalStatus:'Холост(а)',
        experience:[{company:'Studio One',position:'Product Designer',startDate:'2023-01-01',endDate:'',current:true,description:'Проектировал интерфейсы и развивал дизайн-систему.'}],
        education:[{institution:'Технический университет',degree:'Дизайн и технологии',year:'2022'}]
    };
    document.querySelectorAll('.live-template-preview').forEach(card=>{
        const id=Number(card.dataset.previewTemplate)||1;
        try{card.innerHTML=templates.render(id,templatePreviewData);}catch(e){console.error('Template preview:',e);}
    });
    document.addEventListener('nextresume:locale', () => {
        const lang = window.NextI18n?.locale?.() || 'ru';
        updatePreview();
        const levelMap = window.NextI18n?.dict?.[lang]?.languageLevels || [];
        document.querySelectorAll('#languageList .language-level').forEach(sel => {
            const current = sel.value;
            sel.innerHTML = levelMap.map((l,i)=>`<option ${i===5?'selected':''}>${l}</option>`).join('');
            if (levelMap.includes(current)) sel.value=current;
        });
    });

    const storage = new StorageManager();
    const analytics = new Analytics();
    let currentStep = 1;
    const urlTemplate = Number(new URLSearchParams(location.search).get('template') || 0);
    let selectedTemplate = urlTemplate >= 1 && urlTemplate <= 7 ? urlTemplate : Number(localStorage.getItem('selectedResumeTemplate') || 1);
    let photoData = null;
    let updateTimer = null;

    const $ = id => document.getElementById(id);
    const preview = $('resumePreview');
    const templateCards = document.querySelectorAll('.template-card');
    const stepDots = document.querySelectorAll('.step-dot');
    const stepContents = document.querySelectorAll('.step-content');
    const prevBtn = $('prevStep'), nextBtn = $('nextStep'), submitBtn = $('submitResume');

    function setSelectedTemplate(id) {
        selectedTemplate = Number(id) || 1;
        localStorage.setItem('selectedResumeTemplate', String(selectedTemplate));
        templateCards.forEach(card => card.classList.toggle('selected', Number(card.dataset.template) === selectedTemplate));
        updatePreview();
    }

    templateCards.forEach(card => card.addEventListener('click', () => setSelectedTemplate(card.dataset.template)));

    function goToStep(step) {
        currentStep = Math.max(1, Math.min(2, step));
        stepDots.forEach((dot, i) => {
            const n = i + 1;
            dot.classList.toggle('active', n === currentStep);
            dot.classList.toggle('completed', n < currentStep);
        });
        stepContents.forEach((content, i) => content.classList.toggle('active', i + 1 === currentStep));
        prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';
        nextBtn.style.display = currentStep === 2 ? 'none' : 'inline-flex';
        submitBtn.style.display = currentStep === 2 ? 'inline-flex' : 'none';
        if (currentStep === 2) setTimeout(updatePreview, 20);
        window.scrollTo({top:0, behavior:'smooth'});
    }

    stepDots.forEach(dot => dot.addEventListener('click', () => {
        const n = Number(dot.dataset.step);
        if (n <= currentStep || n === 2) goToStep(n);
    }));
    $('selectTemplateBtn').addEventListener('click', () => goToStep(2));
    $('resetResumeBtn').addEventListener('click', () => {
        if (!confirm('Сбросить текущее резюме и начать заново?')) return;
        localStorage.removeItem('resume_builder_data');
        localStorage.removeItem('nextresume_resume');
        localStorage.removeItem('resumeData');
        localStorage.removeItem('selectedResumeTemplate');
        document.getElementById('resumeForm').reset(); resetLanguages();
        $('experienceList').innerHTML = `<div class="experience-item"><div class="form-row-2"><div class="form-group"><label>Компания</label><input class="exp-company" placeholder="Компания"></div><div class="form-group"><label>Должность</label><input class="exp-position" placeholder="Должность"></div></div><div class="form-row-2"><div class="form-group"><label>Начало</label><input class="exp-start-date" type="date"></div><div class="form-group"><label>Окончание</label><input class="exp-end-date" type="date"></div></div><label style="display:flex;gap:8px;align-items:center;color:rgba(255,255,255,.5);font-size:12px"><input class="exp-current" type="checkbox"> По настоящее время</label><div class="form-group" style="margin-top:10px"><label>Обязанности и достижения</label><textarea class="exp-description" rows="3" placeholder="Что делали, за что отвечали, какого результата достигли"></textarea></div><button type="button" class="btn-remove remove-exp">×</button></div>`;
        $('educationList').innerHTML = `<div class="education-item"><div class="form-row-2 edu-top-row"><div class="form-group"><label>Тип образования</label><select class="edu-type"><option value="school">Школа</option><option value="college">Среднее специальное</option><option value="university" selected>Университет / вуз</option><option value="other">Другое</option></select></div><div class="form-group"><label>Год окончания</label><input class="edu-year" type="number" min="1950" max="2100" placeholder="2026"></div></div><div class="form-group"><label class="edu-institution-label">Учебное заведение</label><input class="edu-institution" placeholder="Название университета"></div><div class="form-row-2 edu-detail-row"><div class="form-group"><label class="edu-degree-label">Специальность</label><input class="edu-degree" placeholder="Специальность"></div><div class="form-group edu-classes-group" hidden><label>Классов окончено</label><input class="edu-classes" type="number" min="1" max="13" placeholder="11"></div></div><button type="button" class="btn-remove remove-edu">×</button></div>`;
        photoData=null; if($('profilePhoto')) $('profilePhoto').value=''; $('photoPreview').style.display='none'; $('photoDropZone').style.display='block';
        selectedTemplate=1; setSelectedTemplate(1); bindDynamicFields(); updateEducationType($('educationList').querySelector('.education-item')); $('educationList').querySelector('.edu-type').addEventListener('change',()=>{updateEducationType($('educationList').querySelector('.education-item'));scheduleUpdate();}); bindDynamicFields($('educationList').firstElementChild); bindDynamicFields($('experienceList').firstElementChild); goToStep(1); notify('Резюме сброшено. Можно начать заново.');
    });
    prevBtn.addEventListener('click', () => goToStep(currentStep - 1));
    nextBtn.addEventListener('click', () => goToStep(currentStep + 1));

    const LANGUAGE_LEVELS=()=>window.NextI18n?.dict?.[window.NextI18n.locale?.()||'ru']?.languageLevels || ['Не говорю','Начальный','Базовый','Средний','Рабочий уровень','Свободно владею','Родной язык'];
    function makeLanguageRow(data={name:'Русский',level:(window.NextI18n?.dict?.[window.NextI18n.locale?.()||'ru']?.languageLevels?.[5] || 'Свободно владею')}) {
        const row=document.createElement('div'); row.className='language-row';
        row.innerHTML=`<input class="language-name" type="text" value="${escapeAttr(data.name||'')}" placeholder="Например: Русский"><select class="language-level">${LANGUAGE_LEVELS().map(l=>`<option ${l===(data.level||'Свободно владею')?'selected':''}>${l}</option>`).join('')}</select><button type="button" class="language-remove" aria-label="Удалить язык">×</button>`;
        row.querySelector('.language-remove').addEventListener('click',()=>{row.remove(); if(!document.querySelector('#languageList .language-row')) makeLanguageRow({name:'Русский',level:(window.NextI18n?.dict?.[window.NextI18n.locale?.()||'ru']?.languageLevels?.[5] || 'Свободно владею')}); scheduleUpdate();});
        row.querySelectorAll('input,select').forEach(el=>el.addEventListener('input',scheduleUpdate));
        row.querySelector('.language-level').addEventListener('change',scheduleUpdate);
        $('languageList').appendChild(row); return row;
    }
    function escapeAttr(v){return String(v??'').replace(/&/g,'&amp;').replace(/\"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    function collectLanguages(){return [...document.querySelectorAll('#languageList .language-row')].map(row=>({name:row.querySelector('.language-name')?.value.trim()||'',level:row.querySelector('.language-level')?.value||'Свободно владею'})).filter(x=>x.name);}
    function resetLanguages(){ $('languageList').innerHTML=''; makeLanguageRow({name:'Русский',level:(window.NextI18n?.dict?.[window.NextI18n.locale?.()||'ru']?.languageLevels?.[5] || 'Свободно владею')}); }

    function collectFormData() {
        const experience = [...document.querySelectorAll('#experienceList .experience-item')].map(item => ({
            company: item.querySelector('.exp-company')?.value.trim() || '',
            position: item.querySelector('.exp-position')?.value.trim() || '',
            startDate: item.querySelector('.exp-start-date')?.value || '',
            endDate: item.querySelector('.exp-end-date')?.value || '',
            current: item.querySelector('.exp-current')?.checked || false,
            description: item.querySelector('.exp-description')?.value.trim() || ''
        })).filter(x => x.company || x.position || x.description);

        const education = [...document.querySelectorAll('#educationList .education-item')].map(item => ({
            type: item.querySelector('.edu-type')?.value || 'university',
            institution: item.querySelector('.edu-institution')?.value.trim() || '',
            degree: item.querySelector('.edu-degree')?.value.trim() || '',
            year: item.querySelector('.edu-year')?.value || '',
            classes: item.querySelector('.edu-classes')?.value || ''
        })).filter(x => x.institution || x.degree || x.year || x.classes);

        return {
            version: 2,
            template: selectedTemplate,
            photo: photoData,
            firstName: $('firstName')?.value.trim() || '',
            lastName: $('lastName')?.value.trim() || '',
            middleName: $('middleName')?.value.trim() || '',
            birthDate: $('birthDate')?.value || '',
            gender: document.querySelector('input[name="gender"]:checked')?.value || '',
            phone: $('phone')?.value.trim() || '',
            email: $('email')?.value.trim() || '',
            city: $('city')?.value.trim() || '',
            linkUrl: $('linkUrl')?.value.trim() || '',
            relocation: $('relocation')?.value || '',
            businessTrips: $('businessTrips')?.value || '',
            maritalStatus: $('maritalStatus')?.value || '',
            desiredPosition: $('desiredPosition')?.value.trim() || '',
            salary: $('salary')?.value || '',
            currency: $('currency')?.value || 'RUB',
            hardSkills: $('skills')?.value.trim() || '',
            languages: collectLanguages(),
            experience, education,
            about: $('about')?.value.trim() || ''
        };
    }

    function hasResumeData(data) {
        return [data.firstName,data.lastName,data.desiredPosition,data.phone,data.email,data.about,data.hardSkills].some(Boolean)
            || data.experience.length || data.education.length;
    }

    function updatePreview() {
        if (currentStep !== 2) return;
        const data = collectFormData();
        if (!hasResumeData(data)) {
            preview.innerHTML = `<div class="resume-preview-stage"><div class="resume-sheet" style="display:grid;place-items:center;color:#94a3b8;font-family:Inter">Начните заполнять данные</div></div>`;
            return;
        }
        try {
            preview.innerHTML = `<div class="resume-preview-stage">${templates.render(selectedTemplate, data)}</div>`;
            const sheet=preview.querySelector('.resume-sheet');
            if(sheet){ requestAnimationFrame(()=>{ const sections=sheet.querySelectorAll('.r-section').length; const savedMin=sheet.style.minHeight; sheet.style.minHeight='0'; const naturalHeight=sheet.scrollHeight; sheet.style.minHeight=savedMin; const free=Math.max(0,1123-naturalHeight); const extra=sections&&free>70?Math.min(34,free/sections):0; const scale=naturalHeight<720?1.14:naturalHeight<850?1.08:naturalHeight<960?1.03:1; sheet.style.setProperty('--density-extra',`${extra}px`); sheet.style.setProperty('--density-scale',scale); }); }
            storage.saveResumeData(data);
            if (analytics?.trackFormProgress) analytics.trackFormProgress(data);
        } catch (error) {
            console.error(error);
            preview.innerHTML = `<div style="padding:40px;color:#ef4444">Не удалось обновить превью. Проверьте данные.</div>`;
        }
    }

    function scheduleUpdate() {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(updatePreview, 90);
    }

    function bindDynamicFields(scope=document) {
        scope.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.dataset.liveBound) return;
            el.dataset.liveBound = '1';
            el.addEventListener('input', scheduleUpdate);
            el.addEventListener('change', scheduleUpdate);
        });
    }

    function makeExperience() {
        const div = document.createElement('div');
        div.className = 'experience-item';
        div.innerHTML = `<div class="form-row-2">
            <div class="form-group"><label>Компания</label><input class="exp-company" placeholder="Компания"></div>
            <div class="form-group"><label>Должность</label><input class="exp-position" placeholder="Должность"></div>
        </div>
        <div class="form-row-2">
            <div class="form-group"><label>Начало</label><input class="exp-start-date" type="date"></div>
            <div class="form-group"><label>Окончание</label><input class="exp-end-date" type="date"></div>
        </div>
        <label style="display:flex;gap:8px;align-items:center;color:rgba(255,255,255,.5);font-size:12px"><input class="exp-current" type="checkbox"> По настоящее время</label>
        <div class="form-group" style="margin-top:10px"><label>Обязанности и достижения</label><textarea class="exp-description" rows="3" placeholder="Результаты и зона ответственности"></textarea></div>
        <button type="button" class="btn-remove remove-exp">×</button>`;
        div.querySelector('.remove-exp').addEventListener('click', () => { div.remove(); scheduleUpdate(); });
        bindDynamicFields(div);
        return div;
    }

    function makeEducation() {
        const div = document.createElement('div');
        div.className = 'education-item';
        div.innerHTML = `<div class="form-row-2 edu-top-row"><div class="form-group"><label>Тип образования</label><select class="edu-type"><option value="school">Школа</option><option value="college">Среднее специальное</option><option value="university" selected>Университет / вуз</option><option value="other">Другое</option></select></div><div class="form-group"><label>Год окончания</label><input class="edu-year" type="number" min="1950" max="2100" placeholder="2026"></div></div>
        <div class="form-group"><label class="edu-institution-label">Учебное заведение</label><input class="edu-institution" placeholder="Название университета"></div>
        <div class="form-row-2 edu-detail-row"><div class="form-group"><label class="edu-degree-label">Специальность</label><input class="edu-degree" placeholder="Специальность"></div><div class="form-group edu-classes-group" hidden><label>Классов окончено</label><input class="edu-classes" type="number" min="1" max="13" placeholder="11"></div></div>
        <button type="button" class="btn-remove remove-edu">×</button>`;
        div.querySelector('.remove-edu').addEventListener('click', () => { div.remove(); scheduleUpdate(); });
        updateEducationType(div);
        div.querySelector('.edu-type').addEventListener('change',()=>{updateEducationType(div);scheduleUpdate();});
        bindDynamicFields(div);
        return div;
    }

    function updateEducationType(item){
        const type=item.querySelector('.edu-type')?.value||'university';
        const classes=item.querySelector('.edu-classes-group'); const degree=item.querySelector('.edu-degree');
        const institutionLabel=item.querySelector('.edu-institution-label'); const degreeLabel=item.querySelector('.edu-degree-label');
        if(classes) classes.hidden=type!=='school';
        if(type==='school'){ if(institutionLabel) institutionLabel.textContent='Школа'; if(degreeLabel) degreeLabel.textContent='Профиль / направление'; if(degree) degree.placeholder='Например: общеобразовательный'; }
        else if(type==='college'){ if(institutionLabel) institutionLabel.textContent='Колледж / техникум'; if(degreeLabel) degreeLabel.textContent='Специальность'; if(degree) degree.placeholder='Например: системный администратор'; }
        else if(type==='university'){ if(institutionLabel) institutionLabel.textContent='Университет / вуз'; if(degreeLabel) degreeLabel.textContent='Специальность'; if(degree) degree.placeholder='Например: прикладная информатика'; }
        else { if(institutionLabel) institutionLabel.textContent='Учебное заведение'; if(degreeLabel) degreeLabel.textContent='Специальность / программа'; }
    }
    document.querySelectorAll('.education-item').forEach(item=>{ updateEducationType(item); item.querySelector('.edu-type')?.addEventListener('change',()=>{updateEducationType(item);scheduleUpdate();}); });

    $('addExperience').addEventListener('click', () => $('experienceList').appendChild(makeExperience()));
    $('addLanguage').addEventListener('click', () => makeLanguageRow({name:'',level:(window.NextI18n?.dict?.[window.NextI18n.locale?.()||'ru']?.languageLevels?.[3] || 'Средний')}));
    $('addEducation').addEventListener('click', () => $('educationList').appendChild(makeEducation()));

    const photoDropZone = $('photoDropZone'), photoInput = $('profilePhoto'), photoPreview = $('photoPreview'), photoImg = $('photoPreviewImg');
    photoDropZone.addEventListener('click', () => photoInput.click());
    photoDropZone.addEventListener('dragover', e => { e.preventDefault(); photoDropZone.style.borderColor='#7c6cff'; });
    photoDropZone.addEventListener('dragleave', () => photoDropZone.style.borderColor='');
    photoDropZone.addEventListener('drop', e => { e.preventDefault(); photoDropZone.style.borderColor=''; const f=e.dataTransfer.files[0]; if(f) readPhoto(f); });
    photoInput.addEventListener('change', e => { if(e.target.files[0]) readPhoto(e.target.files[0]); });
    $('removePhoto').addEventListener('click', () => { photoData=null; photoInput.value=''; photoPreview.style.display='none'; photoDropZone.style.display='block'; scheduleUpdate(); });

    function readPhoto(file) {
        if (!file.type.startsWith('image/')) return notify('Выберите изображение.', 'error');
        if (file.size > 5*1024*1024) return notify('Фото должно быть не больше 5 MB.', 'error');
        const reader = new FileReader();
        reader.onload = e => { photoData=e.target.result; photoImg.src=photoData; photoPreview.style.display='block'; photoDropZone.style.display='none'; scheduleUpdate(); };
        reader.readAsDataURL(file);
    }

    function notify(message, type='success') {
        document.querySelector('.notification')?.remove();
        const el=document.createElement('div'); el.className=`notification ${type==='error'?'error':''}`; el.textContent=message;
        document.body.appendChild(el); setTimeout(()=>el.remove(),3200);
    }

    function fillSaved(data) {
        if (!data) return;
        const fields=['firstName','lastName','middleName','birthDate','phone','email','city','relocation','businessTrips','maritalStatus','desiredPosition','salary','currency','about'];
        fields.forEach(id => { if($(id) && data[id] != null) $(id).value=data[id]; });
        if ($('skills')) $('skills').value=data.hardSkills || '';
        resetLanguages(); if(Array.isArray(data.languages)){ $('languageList').innerHTML=''; data.languages.forEach(x=>makeLanguageRow(typeof x==='string'?{name:x,level:(window.NextI18n?.dict?.[window.NextI18n.locale?.()||'ru']?.languageLevels?.[5] || 'Свободно владею')}:x)); }
        if (data.gender) document.querySelector(`input[name="gender"][value="${data.gender}"]`)?.click();
        if (data.photo) { photoData=data.photo; photoImg.src=data.photo; photoPreview.style.display='block'; photoDropZone.style.display='none'; }
        if (Array.isArray(data.experience) && data.experience.length) {
            $('experienceList').innerHTML='';
            data.experience.forEach(x => {
                const el=makeExperience();
                el.querySelector('.exp-company').value=x.company||''; el.querySelector('.exp-position').value=x.position||'';
                el.querySelector('.exp-start-date').value=x.startDate||''; el.querySelector('.exp-end-date').value=x.endDate||'';
                el.querySelector('.exp-current').checked=!!x.current; el.querySelector('.exp-description').value=x.description||'';
                $('experienceList').appendChild(el);
            });
        }
        if (Array.isArray(data.education) && data.education.length) {
            $('educationList').innerHTML='';
            data.education.forEach(x => {
                const el=makeEducation();
                el.querySelector('.edu-type').value=x.type||'university'; el.querySelector('.edu-institution').value=x.institution||''; el.querySelector('.edu-degree').value=x.degree||''; el.querySelector('.edu-year').value=x.year||''; el.querySelector('.edu-classes').value=x.classes||''; updateEducationType(el);
                $('educationList').appendChild(el);
            });
        }
    }

    async function generatePDF() {
        const data=collectFormData();
        if (!$('resumeForm').reportValidity()) { notify('Заполните обязательные поля.', 'error'); return; }
        if (!hasResumeData(data)) { notify('Добавьте данные для резюме.', 'error'); return; }
        submitBtn.disabled=true; submitBtn.textContent='Подготовка PDF…';
        try {
            // Client-side canvas PDF generation — no server round-trip, works everywhere the site is hosted.
            const blob=await NextResumeResumePDF.generate(data);
            if(!blob || blob.size<1000) throw new Error('PDF получился пустым.');
            const url=URL.createObjectURL(blob), a=document.createElement('a');
            const safe=(s)=>String(s||'resume').replace(/[\\/:*?"<>|]+/g,'_').trim()||'resume';
            a.href=url; a.download=`${safe(data.lastName)}_${safe(data.firstName)}_ДалееResume.pdf`; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(()=>URL.revokeObjectURL(url),3000); if (analytics?.trackDownload) analytics.trackDownload('pdf'); notify('PDF готов и скачан.');
        } catch(error) { console.error(error); notify(error.message || 'Не удалось создать PDF. Попробуйте ещё раз.', 'error'); }
        finally { submitBtn.disabled=false; submitBtn.textContent='↓  Скачать PDF'; }
    }

    submitBtn.addEventListener('click', () => {
        if(window.adManager) window.adManager.requireVideoThen(generatePDF);
        else generatePDF();
    });

    bindDynamicFields();
    resetLanguages();
    setSelectedTemplate(selectedTemplate);
    fillSaved(storage.getResumeData());
    bindDynamicFields();
    goToStep(1);
});
