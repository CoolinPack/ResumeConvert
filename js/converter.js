/* NextResume converter: local-first, dependency-light conversions. */
class FileConverter {
  constructor(){
    this.supportedImages=['png','jpg','jpeg','webp','gif','bmp','svg'];
    this.supportedInputs=[...this.supportedImages,'txt','pdf','csv','json','xml','yaml','yml','html','htm','xlsx','docx','epub','fb2'];
    this.supportedOutputs=['pdf','png','jpg','jpeg','webp','txt','csv','json','xml','yaml','yml','xlsx','docx','epub'];
    this.job=0;
  }
  isConversionSupported(from,to){
    if(!this.supportedInputs.includes(from)||!this.supportedOutputs.includes(to)||from===to)return false;
    if(this.supportedImages.includes(from)) return this.supportedImages.includes(to)||to==='pdf';
    if(from==='pdf') return ['png','jpg','jpeg','txt'].includes(to);
    if(from==='txt') return ['pdf','csv','json','xml','yaml','yml','xlsx','docx','epub'].includes(to);
    if(from==='html'||from==='htm') return ['pdf','txt'].includes(to);
    if(from==='csv') return ['xlsx','json','xml','yaml','yml','txt','pdf'].includes(to);
    if(from==='json') return ['csv','xlsx','xml','yaml','yml','txt','pdf'].includes(to);
    if(from==='xml') return ['json','csv','xlsx','yaml','yml','txt','pdf'].includes(to);
    if(from==='yaml'||from==='yml') return ['json','xml','csv','xlsx','txt','pdf'].includes(to);
    if(from==='xlsx') return ['csv','json','xml','yaml','yml','txt','pdf'].includes(to);
    if(from==='docx') return ['txt','pdf'].includes(to);
    if(from==='epub') return ['txt','pdf'].includes(to);
    if(from==='fb2') return ['txt','pdf','epub'].includes(to);
    return false;
  }
  async convert(file,from,to,opts={}){
    if(!this.isConversionSupported(from,to)) throw new Error(`Формат ${from.toUpperCase()} → ${to.toUpperCase()} пока не поддерживается в браузере.`);
    const job=++this.job,start=performance.now();let blob;
    const f=new File([await file.arrayBuffer()],file.name,{type:file.type,lastModified:file.lastModified});
    try{
      if(this.supportedImages.includes(from)) blob=to==='pdf'?await this.imageToPdf(f):await this.imageToImage(f,to,opts);
      else if(from==='pdf') blob=await this.fromPdf(f,to);
      else if(from==='txt') blob=await this.fromText(f,to);
      else if(from==='csv') blob=await this.fromCsv(f,to);
      else if(from==='json') blob=await this.fromJson(f,to);
      else if(from==='xml') blob=await this.fromXml(f,to);
      else if(from==='yaml'||from==='yml') blob=await this.fromYaml(f,to);
      else if(from==='html'||from==='htm') blob=await this.fromHtml(f,to);
      else if(from==='xlsx') blob=await this.fromXlsx(f,to);
      else if(from==='docx') blob=await this.fromDocx(f,to);
      else if(from==='epub') blob=await this.fromEpub(f,to);
      else if(from==='fb2') blob=await this.fromFb2(f,to);
      else throw new Error('Этот формат нельзя обработать в браузере.');
      if(job!==this.job)throw new Error('Конвертация была заменена новой операцией.');
      if(!(blob instanceof Blob)||blob.size===0)throw new Error('Конвертация завершилась пустым файлом.');
      const duration=((performance.now()-start)/1000).toFixed(2);
      const analytics=new Analytics();analytics.data.conversions=(analytics.data.conversions||0)+1;if(String(to).toLowerCase()==='pdf')analytics.data.pdfConversions=(analytics.data.pdfConversions||0)+1;analytics.save();window.dispatchEvent(new CustomEvent('nextresume:conversion',{detail:{from,to}}));
      return {blob,size:blob.size,duration};
    }finally{
      // release references between jobs; File objects are local and become GC-eligible after this turn
    }
  }
  readText(file){return file.text();}
  readDataURL(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Не удалось прочитать файл'));r.readAsDataURL(file);});}
  loadImage(src){return new Promise((res,rej)=>{const img=new Image();img.onload=()=>res(img);img.onerror=()=>rej(new Error('Не удалось открыть изображение'));img.src=src;});}
  async imageToImage(file,to,opts){const img=await this.loadImage(await this.readDataURL(file));const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;c.getContext('2d').drawImage(img,0,0);const mime=to==='jpg'||to==='jpeg'?'image/jpeg':to==='svg'?'image/svg+xml':`image/${to}`;if(to==='svg'){const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}"><image href="${await this.readDataURL(file)}" width="100%" height="100%"/></svg>`;return new Blob([svg],{type:'image/svg+xml'});}return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('Не удалось создать изображение')),mime,opts.highQuality===false?.86:.94));}
  async imageToPdf(file){
    const src=await this.readDataURL(file),img=await this.loadImage(src);
    // A4 at 300 DPI. Keep the source aspect ratio and never downsample a small source.
    // The previous 1240px canvas was roughly 150 DPI and caused visible pixelation.
    const A4W=2480,A4H=3508;
    const sourceW=img.naturalWidth||img.width, sourceH=img.naturalHeight||img.height;
    const scale=Math.min(A4W/sourceW,A4H/sourceH);
    const drawW=Math.max(1,Math.round(sourceW*scale)), drawH=Math.max(1,Math.round(sourceH*scale));
    const c=document.createElement('canvas'); c.width=A4W; c.height=A4H;
    const ctx=c.getContext('2d',{alpha:false}); ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
    ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,Math.round((A4W-drawW)/2),Math.round((A4H-drawH)/2),drawW,drawH);
    // High-quality JPEG is used only at the PDF boundary; source pixels are preserved at up to 300 DPI.
    const quality=0.94;
    return NextResumePDF.buildPdf([{dataUrl:c.toDataURL('image/jpeg',quality),width:c.width,height:c.height}]);
  }
  async fromPdf(file,to){
    if(to==='txt')return new Blob([await NextResumePDF.pdfText(file)],{type:'text/plain;charset=utf-8'});
    const imgs=await NextResumePDF.pdfImages(file,to==='png'?'png':'jpg');
    if(!imgs.length)throw new Error('Не удалось извлечь страницы PDF.');
    if(imgs.length===1)return imgs[0];
    const zip=new JSZip();for(let i=0;i<imgs.length;i++)zip.file(`page-${String(i+1).padStart(3,'0')}.${to==='png'?'png':'jpg'}`,imgs[i]);
    return zip.generateAsync({type:'blob',mimeType:'application/zip'});
  }
  async fromText(file,to){const text=await this.readText(file);return this.fromPlainText(text,to,file.name.replace(/\.[^.]+$/,''));}
  async fromPlainText(text,to,name){if(to==='txt')return new Blob([text],{type:'text/plain;charset=utf-8'});if(to==='pdf')return NextResumePDF.textPdf(text,name);if(to==='docx')return this.textToDocx(text);if(to==='epub')return this.textToEpub(text,name);if(to==='csv')return new Blob([text],{type:'text/csv;charset=utf-8'});if(to==='json')return new Blob([JSON.stringify(text.split(/\r?\n/),null,2)],{type:'application/json'});if(to==='xml')return new Blob([`<?xml version="1.0" encoding="UTF-8"?><document>${escapeXml(text)}</document>`],{type:'application/xml'});if(to==='yaml'||to==='yml')return new Blob([text.split(/\r?\n/).map(x=>`- ${x}`).join('\n')],{type:'text/yaml'});throw new Error('Неподдерживаемое направление.');}
  async fromCsv(file,to){const text=await this.readText(file);const rows=parseCsv(text);if(to==='xlsx')return this.rowsToXlsx(rows);if(to==='json')return new Blob([JSON.stringify(rowsToObjects(rows),null,2)],{type:'application/json'});if(to==='xml')return new Blob([rowsToXml(rows)],{type:'application/xml'});if(to==='yaml'||to==='yml')return new Blob([rowsToYaml(rows)],{type:'text/yaml'});if(to==='txt')return new Blob([text],{type:'text/plain;charset=utf-8'});if(to==='pdf')return NextResumePDF.textPdf(text,file.name);throw new Error('CSV: направление не поддерживается.');}
  async fromJson(file,to){const text=await this.readText(file),data=JSON.parse(text);if(to==='csv')return new Blob([objectsToCsv(Array.isArray(data)?data:[data])],{type:'text/csv;charset=utf-8'});if(to==='xlsx')return this.rowsToXlsx(objectsToRows(Array.isArray(data)?data:[data]));if(to==='xml')return new Blob([jsonToXml(data)],{type:'application/xml'});if(to==='yaml'||to==='yml')return new Blob([jsonToYaml(data)],{type:'text/yaml'});if(to==='txt')return new Blob([JSON.stringify(data,null,2)],{type:'text/plain;charset=utf-8'});if(to==='pdf')return NextResumePDF.textPdf(JSON.stringify(data,null,2),file.name);throw new Error('JSON: направление не поддерживается.');}
  async fromXml(file,to){const text=await this.readText(file);if(to==='json'){return new Blob([JSON.stringify(xmlToObject(text),null,2)],{type:'application/json'});}if(to==='yaml'||to==='yml')return new Blob([jsonToYaml(xmlToObject(text))],{type:'text/yaml'});if(to==='txt')return new Blob([stripXml(text)],{type:'text/plain;charset=utf-8'});if(to==='pdf')return NextResumePDF.textPdf(stripXml(text),file.name);if(to==='csv'){const obj=xmlToObject(text);return new Blob([objectsToCsv(flattenRows(obj))],{type:'text/csv;charset=utf-8'});}throw new Error('XML: направление не поддерживается.');}
  async fromYaml(file,to){const text=await this.readText(file);const data=yamlToJson(text);if(to==='json')return new Blob([JSON.stringify(data,null,2)],{type:'application/json'});if(to==='xml')return new Blob([jsonToXml(data)],{type:'application/xml'});if(to==='txt')return new Blob([JSON.stringify(data,null,2)],{type:'text/plain;charset=utf-8'});if(to==='pdf')return NextResumePDF.textPdf(JSON.stringify(data,null,2),file.name);if(to==='csv')return new Blob([objectsToCsv(Array.isArray(data)?data:[data])],{type:'text/csv;charset=utf-8'});if(to==='xlsx')return this.rowsToXlsx(objectsToRows(Array.isArray(data)?data:[data]));throw new Error('YAML: направление не поддерживается.');}
  async fromHtml(file,to){const text=await this.readText(file);const doc=new DOMParser().parseFromString(text,'text/html');const plain=doc.body?.innerText||stripXml(text);if(to==='txt')return new Blob([plain],{type:'text/plain;charset=utf-8'});if(to==='pdf')return NextResumePDF.textPdf(plain,file.name);throw new Error('HTML: направление не поддерживается.');}
  async fromDocx(file,to){const text=await this.extractDocxText(file);if(to==='txt')return new Blob([text],{type:'text/plain;charset=utf-8'});if(to==='pdf')return NextResumePDF.textPdf(text,file.name);throw new Error('DOCX: направление не поддерживается.');}
  async extractDocxText(file){const zip=await JSZip.loadAsync(await file.arrayBuffer());const xml=await zip.file('word/document.xml')?.async('text');if(!xml)throw new Error('DOCX повреждён или не содержит document.xml.');const doc=new DOMParser().parseFromString(xml,'application/xml');return [...doc.getElementsByTagName('w:p')].map(p=>[...p.getElementsByTagName('w:t')].map(t=>t.textContent).join('')).join('\n');}
  async fromXlsx(file,to){const rows=await this.xlsxToRows(file);if(to==='csv')return new Blob([rowsToCsv(rows)],{type:'text/csv;charset=utf-8'});if(to==='json')return new Blob([JSON.stringify(rowsToObjects(rows),null,2)],{type:'application/json'});if(to==='xml')return new Blob([rowsToXml(rows)],{type:'application/xml'});if(to==='yaml'||to==='yml')return new Blob([rowsToYaml(rows)],{type:'text/yaml'});if(to==='pdf')return NextResumePDF.textPdf(rowsToCsv(rows),file.name);throw new Error('XLSX: направление не поддерживается.');}
  async xlsxToRows(file){const zip=await JSZip.loadAsync(await file.arrayBuffer());const shared=zip.file('xl/sharedStrings.xml');let strings=[];if(shared){const xml=await shared.async('text');const doc=new DOMParser().parseFromString(xml,'application/xml');strings=[...doc.getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join(''));}const sheet=zip.file('xl/worksheets/sheet1.xml');if(!sheet)throw new Error('XLSX не содержит первого листа.');const xml=await sheet.async('text'),doc=new DOMParser().parseFromString(xml,'application/xml');const rows=[];for(const row of [...doc.getElementsByTagName('row')]){const vals=[];for(const cell of [...row.getElementsByTagName('c')]){const ref=cell.getAttribute('r')||'';const col=(ref.match(/[A-Z]+/)||['A'])[0];const idx=colToNum(col);while(vals.length<idx)vals.push('');const v=cell.getElementsByTagName('v')[0]?.textContent||'';vals[idx]=cell.getAttribute('t')==='s'?(strings[Number(v)]??v):v;}rows.push(vals);}return rows;}
  rowsToXlsx(rows){const zip=new JSZip();const esc=s=>escapeXml(s);const maxCols=Math.max(1,...rows.map(r=>r.length));const cols=Array.from({length:maxCols},(_,i)=>numToCol(i));const sheetRows=rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>`<c r="${cols[ci]}${ri+1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`).join('')}</row>`).join('');const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`);zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);zip.file('xl/worksheets/sheet1.xml',sheet);return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});}
  async fromEpub(file,to){const zip=await JSZip.loadAsync(await file.arrayBuffer());let all='';for(const name of Object.keys(zip.files)){if(/\.(xhtml|html|htm)$/i.test(name)){const t=await zip.files[name].async('text');const d=new DOMParser().parseFromString(t,'text/html');all+=(d.body?.innerText||'')+'\n\n';}}if(!all.trim())throw new Error('EPUB не содержит читаемых HTML/XHTML глав.');if(to==='txt')return new Blob([all],{type:'text/plain;charset=utf-8'});if(to==='pdf')return NextResumePDF.textPdf(all,file.name);throw new Error('EPUB: направление не поддерживается.');}
  async fromFb2(file,to){const text=await this.readText(file),plain=stripXml(text);if(to==='txt')return new Blob([plain],{type:'text/plain;charset=utf-8'});if(to==='pdf')return NextResumePDF.textPdf(plain,file.name);if(to==='epub')return this.textToEpub(plain,file.name);throw new Error('FB2: направление не поддерживается.');}
  textToDocx(text){const zip=new JSZip();const paras=String(text).split(/\r?\n/).map(x=>`<w:p><w:r><w:t xml:space="preserve">${escapeXml(x)}</w:t></w:r></w:p>`).join('');zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);zip.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);zip.file('word/document.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr></w:body></w:document>`);return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});}
  textToEpub(text,title){const zip=new JSZip();zip.file('mimetype','application/epub+zip',{compression:'STORE'});zip.file('META-INF/container.xml',`<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);zip.file('OEBPS/content.xhtml',`<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(title)}</title></head><body>${String(text).split(/\r?\n/).map(x=>`<p>${escapeXml(x)}</p>`).join('')}</body></html>`);zip.file('OEBPS/content.opf',`<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${escapeXml(title)}</dc:title><dc:language>ru</dc:language><dc:identifier id="id">nextresume-${Date.now()}</dc:identifier></metadata><manifest><item id="content" href="content.xhtml" media-type="application/xhtml+xml"/></manifest><spine toc="content"><itemref idref="content"/></spine></package>`);return zip.generateAsync({type:'blob',mimeType:'application/epub+zip'});}
  getHistory(){return [];}
}
function escapeXml(s){return String(s??'').replace(/[<>&'"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]));}
function parseCsv(t){const rows=[];let row=[],cell='',q=false;for(let i=0;i<t.length;i++){const ch=t[i],n=t[i+1];if(ch==='"'&&q&&n==='"'){cell+='"';i++;continue}if(ch==='"'){q=!q;continue}if(ch===','&&!q){row.push(cell);cell='';continue}if((ch==='\n'||ch==='\r')&&!q){if(ch==='\r'&&n==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';continue}cell+=ch;}if(cell||row.length){row.push(cell);rows.push(row);}return rows;}
function rowsToCsv(rows){return rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');}
function rowsToObjects(rows){if(!rows.length)return[];const h=rows[0].map((x,i)=>x||`column_${i+1}`);return rows.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])));}
function objectsToRows(arr){if(!arr.length)return [[]];const h=[...new Set(arr.flatMap(o=>Object.keys(o||{})))];return [h,...arr.map(o=>h.map(k=>typeof o[k]==='object'?JSON.stringify(o[k]):o[k]??''))];}
function objectsToCsv(arr){return rowsToCsv(objectsToRows(arr));}
function rowsToXml(rows){return `<?xml version="1.0" encoding="UTF-8"?><table>${rows.map(r=>`<row>${r.map((v,i)=>`<cell index="${i+1}">${escapeXml(v)}</cell>`).join('')}</row>`).join('')}</table>`;}
function rowsToYaml(rows){return rowsToObjects(rows).map(o=>`- ${Object.entries(o).map(([k,v])=>`${k}: ${JSON.stringify(v)}`).join(', ')}`).join('\n');}
function jsonToXml(v,name='root'){if(Array.isArray(v))return `<${name}>${v.map(x=>jsonToXml(x,'item')).join('')}</${name}>`;if(v&&typeof v==='object')return `<${name}>${Object.entries(v).map(([k,x])=>jsonToXml(x,k.replace(/[^\w.-]/g,'_'))).join('')}</${name}>`;return `<${name}>${escapeXml(v)}</${name}>`;}
function xmlToObject(text){const d=new DOMParser().parseFromString(text,'application/xml');if(d.querySelector('parsererror'))throw new Error('Некорректный XML.');const walk=e=>{const kids=[...e.children];if(!kids.length)return e.textContent;const o={};for(const k of kids){const v=walk(k);if(o[k.tagName]===undefined)o[k.tagName]=v;else o[k.tagName]=Array.isArray(o[k.tagName])?[...o[k.tagName],v]:[o[k.tagName],v];}return o;};return walk(d.documentElement);}
function jsonToYaml(v,indent=0){const pad=' '.repeat(indent);if(Array.isArray(v))return v.map(x=>`${pad}- ${typeof x==='object'?'\n'+jsonToYaml(x,indent+2):JSON.stringify(x)}`).join('\n');if(v&&typeof v==='object')return Object.entries(v).map(([k,x])=>`${pad}${k}:${typeof x==='object'?'\n'+jsonToYaml(x,indent+2):' '+JSON.stringify(x)}`).join('\n');return pad+JSON.stringify(v);}
function yamlToJson(text){const lines=text.split(/\r?\n/).filter(x=>x.trim()&&!x.trim().startsWith('#'));if(lines.every(x=>x.trim().startsWith('- ')))return lines.map(x=>x.trim().slice(2).replace(/^['"]|['"]$/g,''));const o={};for(const l of lines){const m=l.match(/^\s*([^:]+):\s*(.*)$/);if(m){let v=m[2];try{v=JSON.parse(v)}catch{}o[m[1].trim()]=v;}}return o;}
function stripXml(t){return String(t).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function flattenRows(o){if(Array.isArray(o))return objectsToRows(o);if(o&&typeof o==='object')return objectsToRows([o]);return [['value'],[o]];}
function colToNum(col){let n=0;for(const c of col)n=n*26+(c.charCodeAt(0)-64);return n-1;}function numToCol(n){let s='';n++;while(n){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26);}return s;}
