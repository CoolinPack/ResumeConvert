document.addEventListener('DOMContentLoaded',()=>{
 const track=document.getElementById('homeTemplateTrack');
 if(track && window.ResumeTemplates){
   try{
     const templates=new ResumeTemplates();
     const sampleData={firstName:'Имя',lastName:'Фамилия',desiredPosition:'Специалист',city:'Ташкент',email:'you@example.com',phone:'+998 90 123 45 67',about:'Краткое описание опыта и ключевых достижений для вашей позиции.',hardSkills:'Навык 1, Навык 2, Навык 3',languages:[{name:'Русский',level:'Свободно владею'},{name:'Английский',level:'Рабочий уровень'}],experience:[{company:'Компания',position:'Должность',startDate:'2023-01-01',endDate:'',current:true,description:'Ключевые задачи и результаты на этой позиции.'}],education:[{institution:'Университет',degree:'Специальность',year:'2022'}]};
     const list=Object.entries(templates.names);
     const build=()=>list.map(([id,name])=>`<a class="home-template-mini" href="create-resume.html?template=${id}"><div class="home-template-mini-frame">${templates.render(Number(id),sampleData)}</div><div class="home-template-mini-label"><span class="mini-num">0${id}</span><strong>${name}</strong></div></a>`).join('');
     track.innerHTML=build()+build();
   }catch(e){console.error('Template carousel render failed:',e);}
 }
 const box=document.getElementById('homeReviews');
 if(box){try{const items=JSON.parse(localStorage.getItem('nextresume_reviews_v2')||'[]');if(items.length){const r=items[0];const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));box.innerHTML=`<div class="stars">★★★★★</div><p>${esc(r.text)}</p><span class="author">${esc(r.name||'Пользователь')} · ${new Date(r.date).toLocaleDateString('ru-RU')}</span>`;}}catch{}}
 const analytics=new Analytics();
 const updateStats=()=>{
   const el=document.getElementById('resumeCreatedCount'); if(el)el.textContent=Number(analytics.data.downloads||0).toLocaleString('ru-RU');
   const t=document.getElementById('templateCount'); if(t)t.textContent='7';
   const pdf=document.getElementById('pdfFormatCount'); if(pdf)pdf.textContent='A4';
 };
 updateStats();
 window.addEventListener('storage',updateStats);window.addEventListener('nextresume:conversion',updateStats);
});
