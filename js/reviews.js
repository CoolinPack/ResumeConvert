document.addEventListener('DOMContentLoaded', () => {
    const form=document.getElementById('reviewForm'), list=document.getElementById('reviewsList'), count=document.getElementById('reviewCount');
    const KEY='nextresume_reviews_v2';
    let reviews=[];
    try{reviews=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{reviews=[]}

    const escapeHtml=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function render(){
        count.textContent=reviews.length ? `${reviews.length} ${reviews.length===1?'отзыв':'отзывов'}` : '';
        if(!reviews.length){list.innerHTML='<div class="reviews-empty"><strong>Пока нет отзывов</strong><span>Ваш отзыв может стать первым.</span></div>';return;}
        list.innerHTML=reviews.map(r=>`<article class="review-card"><div class="review-card-top"><span class="review-avatar">${escapeHtml((r.name||'•').trim()[0].toUpperCase())}</span><time>${new Date(r.date).toLocaleDateString('ru-RU')}</time></div><p>${escapeHtml(r.text)}</p><strong class="review-author">${escapeHtml(r.name||'Пользователь')}</strong></article>`).join('');
    }
    form.addEventListener('submit',e=>{
        e.preventDefault();
        if(!form.reportValidity())return;
        const name=document.getElementById('reviewName').value.trim();
        const text=document.getElementById('reviewText').value.trim();
        if(name.length<2){alert('Укажите имя.');return;}
        if(text.length<10){alert('Напишите отзыв минимум из 10 символов.');return;}
        reviews.unshift({id:Date.now(),name,text,date:new Date().toISOString()});
        localStorage.setItem(KEY,JSON.stringify(reviews.slice(0,50)));
        form.reset(); render();
        const n=document.createElement('div');n.className='notification';n.textContent='Спасибо! Email не сохранён.';document.body.appendChild(n);setTimeout(()=>n.remove(),3000);
    });
    render();
});