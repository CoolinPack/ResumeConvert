/* NextResume PDF utilities: dependency-light browser PDF creation. */
window.NextResumePDF = (() => {
  function escPdfText(s){ return String(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[\r\n]+/g,' '); }
  function base64ToBytes(dataUrl){
    const b64=dataUrl.split(',')[1]||''; const bin=atob(b64); const out=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out;
  }
  function bytesToBinary(bytes){ let s=''; const chunk=0x8000; for(let i=0;i<bytes.length;i+=chunk) s+=String.fromCharCode(...bytes.subarray(i,i+chunk)); return s; }
  function buildPdf(pages){
    const enc=new TextEncoder(), objects=[];
    const add=o=>{objects.push(o);return objects.length;};
    const catalog=add(null), pagesObj=add(null), pageRefs=[];
    pages.forEach((p,idx)=>{
      const img=base64ToBytes(p.dataUrl);
      const imgObj=add({dict:`<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>`,stream:img});
      const content=enc.encode(`q\n595.28 0 0 841.89 0 0 cm\n/Im${idx+1} Do\nQ\n`);
      const contentObj=add({dict:`<< /Length ${content.length} >>`,stream:content});
      const pageObj=add({dict:`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im${idx+1} ${imgObj} 0 R >> >> /Contents ${contentObj} 0 R >>`});
      pageRefs.push(pageObj);
    });
    objects[catalog-1]={dict:`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`};
    objects[pagesObj-1]={dict:`<< /Type /Pages /Kids [${pageRefs.map(x=>x+' 0 R').join(' ')}] /Count ${pageRefs.length} >>`};
    const chunks=[enc.encode('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')]; let offset=chunks[0].length, offsets=[0];
    const pushBytes=b=>{chunks.push(b);offset+=b.length}; const pushText=t=>pushBytes(enc.encode(t));
    objects.forEach((obj,i)=>{offsets[i+1]=offset;pushText(`${i+1} 0 obj\n${obj.dict}\n`);if(obj.stream){pushBytes(enc.encode('stream\n'));pushBytes(obj.stream);pushBytes(enc.encode('\nendstream\n'));}pushText('endobj\n');});
    const xref=offset;pushText(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`);for(let i=1;i<offsets.length;i++)pushText(String(offsets[i]).padStart(10,'0')+' 00000 n \n');pushText(`trailer\n<< /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks,{type:'application/pdf'});
  }
  function canvasPage(canvas,quality=.94){ return {dataUrl:canvas.toDataURL('image/jpeg',quality),width:canvas.width,height:canvas.height}; }
  async function domToPdf(element){
    const rect=element.getBoundingClientRect();
    const clone=element.cloneNode(true); clone.style.transform='none'; clone.style.margin='0'; clone.style.boxShadow='none';
    const width=Math.round(rect.width), height=Math.round(element.scrollHeight||rect.height), scale=2;
    clone.style.width=width+'px'; clone.style.height=height+'px';
    let css=''; for(const sheet of [...document.styleSheets]){ try{ css += [...sheet.cssRules].map(r=>r.cssText).join('\n'); }catch(e){} }
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width*scale}" height="${height*scale}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml"><style>${css.replace(/<\/style/gi,'<\\/style')}</style>${clone.outerHTML}</div></foreignObject></svg>`;
    const img=new Image(); img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
    await new Promise((res,rej)=>{img.onload=res;img.onerror=()=>rej(new Error('Не удалось подготовить PDF-превью.'))});
    const canvas=document.createElement('canvas'); canvas.width=width*scale; canvas.height=height*scale; canvas.getContext('2d').drawImage(img,0,0);
    const pageH=Math.round(canvas.width*(297/210)); const pages=[];
    for(let y=0;y<canvas.height;y+=pageH){ const h=Math.min(pageH,canvas.height-y); const c=document.createElement('canvas'); c.width=canvas.width;c.height=h;c.getContext('2d').drawImage(canvas,0,y,canvas.width,h,0,0,canvas.width,h); pages.push(canvasPage(c)); }
    return buildPdf(pages);
  }
  function textPdf(text,title='Document'){
    const canvas=document.createElement('canvas'); canvas.width=1240; canvas.height=1754; const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#111827';ctx.font='28px Arial';
    const lines=String(text||'').split(/\r?\n/), max=62, pages=[]; let y=60;
    for(const raw of lines){ const chunks=[]; let s=raw||' '; while(s.length>max){let cut=s.lastIndexOf(' ',max);if(cut<1)cut=max;chunks.push(s.slice(0,cut));s=s.slice(cut+1);}chunks.push(s); for(const line of chunks){ if(y>1680){pages.push(canvasPage(canvas)); const n=document.createElement('canvas'); n.width=1240;n.height=1754;canvas.width=n.width;canvas.height=n.height;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#111827';ctx.font='28px Arial';y=60;} ctx.fillText(line,70,y);y+=40; }}
    pages.push(canvasPage(canvas)); return buildPdf(pages);
  }

  async function pdfEmbeddedJpeg(file){
    const bytes=new Uint8Array(await file.arrayBuffer()); const text=new TextDecoder('latin1').decode(bytes);
    const matches=[]; let pos=0;
    while((pos=text.indexOf('/DCTDecode',pos))>=0){
      const streamStart=text.indexOf('stream',pos); if(streamStart<0) break;
      let dataStart=streamStart+6; if(text[dataStart]==='\r'&&text[dataStart+1]==='\n')dataStart+=2;else if(text[dataStart]==='\n')dataStart++;
      const end=text.indexOf('endstream',dataStart); if(end<0) break;
      const b=bytes.slice(dataStart,end); matches.push(new Blob([b],{type:'image/jpeg'})); pos=end+9;
    }
    return matches;
  }
  async function loadPdfJs(){
    if(window.pdfjsLib) return window.pdfjsLib;
    const sources=[
      ['https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js','https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'],
      ['https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js','https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js']
    ];
    for(const [src,worker] of sources){
      try{ await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);}); if(window.pdfjsLib){window.pdfjsLib.GlobalWorkerOptions.workerSrc=worker;return window.pdfjsLib;}}catch(e){}
    }
    throw new Error('PDF.js не загрузился. Для PDF-конвертаций нужен доступ к библиотеке PDF.js. Проверьте интернет-соединение и повторите попытку.');
  }
  async function pdfText(file){const pdfjs=await loadPdfJs();const data=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjs.getDocument({data}).promise;let out='';for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),c=await p.getTextContent();out+=`--- Страница ${i} ---\n${c.items.map(x=>x.str).join(' ')}\n\n`;}return out;}
  async function pdfImages(file,format){const embedded=await pdfEmbeddedJpeg(file);if(embedded.length)return embedded;const pdfjs=await loadPdfJs();const data=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjs.getDocument({data}).promise;const out=[];for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i),v=p.getViewport({scale:2}),c=document.createElement('canvas');c.width=v.width;c.height=v.height;await p.render({canvasContext:c.getContext('2d'),viewport:v}).promise;const mime=format==='png'?'image/png':'image/jpeg';out.push(await new Promise((r,j)=>c.toBlob(b=>b?r(b):j(new Error('Не удалось создать изображение')),mime,.94)));}return out;}
  return {buildPdf,canvasPage,domToPdf,textPdf,loadPdfJs,pdfText,pdfImages,pdfEmbeddedJpeg};
})();
