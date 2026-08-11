/* NextResume advertising layer: two banner slots per page + timed video + mandatory gate before downloads. */
class AdManager {
    constructor(){
        this.intervalMs = 3 * 60 * 1000;
        this.duration = 20;
        this.skipAfter = 5;
        this.timer = null;
        this.injectBanners();
        this.ensureModal();
        this.startTimer();
    }

    injectBanners(){
        if(document.querySelectorAll('.ad-banner').length >= 2) return;
        const main = document.querySelector('main');
        if(!main) return;
        const make = (label) => {
            const wrap=document.createElement('section');
            wrap.className='ad-banner';
            wrap.innerHTML=`<div class="ad-content"><span class="ad-label">Реклама</span><div class="ad-placeholder"><strong>Рекламный блок</strong><p>Здесь можно подключить Google AdSense, Яндекс Директ или другую рекламную сеть.</p></div></div>`;
            return wrap;
        };
        main.prepend(make('top'));
        main.appendChild(make('bottom'));
    }

    ensureModal(){
        if(document.getElementById('adVideoModal')) return;
        const modal=document.createElement('div');
        modal.id='adVideoModal'; modal.className='ad-video-modal'; modal.hidden=true;
        modal.innerHTML=`<div class="ad-video-content" role="dialog" aria-modal="true" aria-labelledby="adVideoTitle">
            <button class="ad-close-modal" id="adCloseModal" type="button" aria-label="Закрыть">×</button>
            <h3 id="adVideoTitle">Небольшой рекламный ролик</h3>
            <p class="ad-video-copy">Видео можно пропустить после нескольких секунд.</p>
            <div class="ad-video-container"><video id="adVideoPlayer" class="ad-video-player" playsinline preload="metadata" controls>
                <source src="assets/nextresume-ad.mp4" type="video/mp4">
            </video></div>
            <div class="ad-timer" id="adTimer">20</div>
            <div class="ad-progress-bar"><div class="ad-progress-fill" id="adProgressFill"></div></div>
            <button class="btn-skip-ad" id="adSkipBtn" type="button" disabled>Пропустить через 5 с</button>
        </div>`;
        document.body.appendChild(modal);
        const close=()=>{ if(!document.getElementById('adSkipBtn').disabled) this.finishGate(); };
        document.getElementById('adSkipBtn').addEventListener('click',close);
        document.getElementById('adCloseModal').addEventListener('click',close);
        document.getElementById('adVideoPlayer').addEventListener('ended',close);
    }

    startTimer(){
        clearTimeout(this.timer);
        this.timer=setTimeout(()=>{this.showVideoAd('timer');},this.intervalMs);
    }

    showVideoAd(reason='timer', callback){
        this.ensureModal();
        const modal=document.getElementById('adVideoModal');
        const video=document.getElementById('adVideoPlayer');
        const timer=document.getElementById('adTimer');
        const fill=document.getElementById('adProgressFill');
        const skip=document.getElementById('adSkipBtn');
        modal.hidden=false; document.body.classList.add('ad-modal-open');
        let elapsed=0;
        skip.disabled=true;
        document.getElementById('adCloseModal').disabled=true;
        skip.textContent=`Пропустить через ${this.skipAfter} с`;
        timer.textContent=String(this.duration);
        fill.style.width='0%';
        video.currentTime=0;
        video.play().catch(()=>{});
        clearInterval(this._tick);
        this._callback=typeof callback==='function'?callback:null;
        this._tick=setInterval(()=>{
            elapsed=Math.min(this.duration,elapsed+0.1);
            const remain=Math.max(0,Math.ceil(this.duration-elapsed));
            timer.textContent=String(remain);
            fill.style.width=`${Math.min(100,elapsed/this.duration*100)}%`;
            if(elapsed>=this.skipAfter){skip.disabled=false;document.getElementById('adCloseModal').disabled=false;skip.textContent='Пропустить';}
            if(elapsed>=this.duration){this.finishGate();}
        },100);
    }

    finishGate(){
        clearInterval(this._tick);
        const modal=document.getElementById('adVideoModal');
        const video=document.getElementById('adVideoPlayer');
        if(video) video.pause();
        if(modal) modal.hidden=true;
        document.body.classList.remove('ad-modal-open');
        const cb=this._callback; this._callback=null;
        this.startTimer();
        if(cb) cb();
    }

    requireVideoThen(callback){ this.showVideoAd('download',callback); }
}

window.adManager = new AdManager();
