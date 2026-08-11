/* Local-only analytics. No account, email or server endpoint is required. */
class Analytics {
 constructor(){this.key='nextresume_analytics_v2';this.data=this.load();}
 load(){try{return JSON.parse(localStorage.getItem(this.key))||{downloads:0,conversions:0,pdfConversions:0,features:{},pageViews:{}}}catch{return {downloads:0,conversions:0,pdfConversions:0,features:{},pageViews:{}}}}
 save(){localStorage.setItem(this.key,JSON.stringify(this.data));}
 trackDownload(){this.data.downloads=(this.data.downloads||0)+1;this.save()}
 trackPdfConversion(){this.data.pdfConversions=(this.data.pdfConversions||0)+1;this.save()}
 trackFormProgress(data){let keys=Object.keys(data).filter(k=>!['photo','experience','education','languages'].includes(k));let filled=keys.filter(k=>data[k]).length;this.data.formProgress=Math.round(filled/Math.max(keys.length,1)*100);this.save()}
 trackFeature(name){this.data.features[name]=(this.data.features[name]||0)+1;this.save()}
 trackPageView(name){this.data.pageViews[name]=(this.data.pageViews[name]||0)+1;this.save()}
}
