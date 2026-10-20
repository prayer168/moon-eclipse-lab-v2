import './style.css';
import {mountLayout,groupControls,pagedText,pagedEditor} from './layout';
import {SpaceScene,drawObservation} from './scene';
import {defaults,caseParams,snapshot,nextPhase,nextEvent,globalSolar,lunar,positions,unit,sub,mod,rad,synodic,C,type Params} from './model';
import {tasks} from './tasks';
const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const esc=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
interface Evidence {params:Params;speed:number;phase:string;k:number;solar:string;global:string;lunar:string;sunAlt:number;moonAlt:number;visible:string;}
interface Answer {prediction:string;explanation:string;choice:number;rubric:boolean[];evidence:Evidence[];hints:number;feedback:string;comparison?:string;}
const fresh=():Answer=>({prediction:'',explanation:'',choice:-1,rubric:[false,false,false],evidence:[],hints:0,feedback:''});
let p={...defaults},speed=1,playing=false,mode='phase',sky=false,layers=true,taskIndex=0,answers:Answer[]=tasks.map(fresh),windowStart=0,scene:SpaceScene|undefined;
const storageKey='moon-lab-v2';let storageOK=true;
try{const raw=localStorage.getItem(storageKey);if(raw){const d=JSON.parse(raw);if(d.version===2&&Array.isArray(d.answers)&&d.answers.length===8){answers=d.answers.map((x:Partial<Answer>)=>({...fresh(),...x,evidence:Array.isArray(x.evidence)?x.evidence:[]}));if(d.p&&Object.values(d.p).every(Number.isFinite))p={...defaults,...d.p};}}}catch{storageOK=false;}
mountLayout();groupControls();
let uiStep=0,recordPage=0,evidencePart=0,answerPart=0,reviewPart=0,activePane='scene',asidePane='observe';
document.body.dataset.mode=mode;document.body.dataset.pane=activePane;
function setPane(key:string){
 activePane=key;document.body.dataset.pane=key;if(key!=='scene')asidePane=key;
 document.querySelectorAll<HTMLElement>('[data-side]').forEach(el=>el.classList.toggle('active',el.dataset.side===asidePane));
 document.querySelectorAll<HTMLButtonElement>('button[data-pane]').forEach(el=>{const active=el.closest('.aside-tabs')?el.dataset.pane===asidePane:el.dataset.pane===activePane;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});
 requestAnimationFrame(()=>{scene?.resize();update();});
}
for(const button of document.querySelectorAll<HTMLButtonElement>('button[data-pane]'))button.onclick=()=>setPane(button.dataset.pane!);
function showMessage(title:string,text:string){$('#messageTitle').textContent=title;pagedText($('#messageContent'),text,110);$<HTMLDialogElement>('#messageDialog').showModal();}
$('#closeMessage').onclick=()=>$<HTMLDialogElement>('#messageDialog').close();
$('#statusDetails').onclick=()=>showMessage('訊息詳情',$('#status').textContent||'目前沒有其他訊息。');
setPane('scene');
function status(s:string){$('#status').textContent=s;}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({version:2,p,answers}));storageOK=true;}catch{storageOK=false;status('瀏覽器無法保存資料；仍可操作，請使用匯出按鈕下載作答。');}}
function stop(){playing=false;$('#play').textContent='▶ 播放';$('#scenePause').classList.add('hidden');}
function syncInputs(){
 if(p.t<windowStart||p.t>windowStart+35)windowStart=Math.floor(p.t/35)*35;
 const range=$<HTMLInputElement>('#time');range.min=String(windowStart);range.max=String(windowStart+35);range.value=String(p.t);
 $<HTMLInputElement>('#inclination').value=String(p.i);$<HTMLInputElement>('#node').value=String(p.node);if(document.activeElement!==$('#lat'))$<HTMLInputElement>('#lat').value=String(p.lat);if(document.activeElement!==$('#lon'))$<HTMLInputElement>('#lon').value=String(p.lon);
 $('#inclinationLabel').textContent=p.i.toFixed(3)+'°';$('#nodeLabel').textContent=p.node.toFixed(0)+'°';$('#windowLabel').textContent=`第 ${windowStart}～${windowStart+35} 天`;
}
function update(){
 const s=snapshot(p);syncInputs();$('#timeLabel').textContent=`第 ${p.t.toFixed(3)} 天`;$('#phaseName').textContent=s.phase.name;$('#lit').textContent=(s.phase.k*100).toFixed(1)+'%';$('#globalEvent').textContent=s.global.type;$('#lunarEvent').textContent=s.lunar.type;
 $('#revolutionLabel').textContent=`地球公轉約365.256天一圈，目前公轉角 ${(mod(p.t/C.year*360,360)).toFixed(1)}°。自轉軸傾角 23.44°（相對黃道面法線）。`;
 $('#distance').textContent=`案例地月距離 ${p.distance.toLocaleString()} km`;
 const alt=mode==='solar'?s.sunAlt:s.moonAlt,vis=alt>0?'位於地平線上':'當地不可見（地平線下）';
 $('#visibility').textContent=`當地幾何：${s.solar.type}｜${vis}。太陽高度 ${s.sunAlt.toFixed(1)}°；月球高度 ${s.moonAlt.toFixed(1)}°。地點 ${p.lat.toFixed(1)}°, ${p.lon.toFixed(1)}°`;
 $('#observerLabel').textContent=(mode==='solar'?'日食':'月面')+(sky?'・地面方向':'・放大');
 const canvas=$<HTMLCanvasElement>('#observation');canvas.setAttribute('aria-label',`${s.phase.name}，受光${(s.phase.k*100).toFixed(1)}%，${s.lunar.type}，當地${s.solar.type}，${vis}`);
 drawObservation(canvas,p,mode==='solar',sky);scene?.update(p,layers);
}
try{scene=new SpaceScene($('#space'));}catch{ $('#space').innerHTML='<div class="controls"><h3>此裝置無法使用 WebGL</h3><p>可繼續使用時間、傾角、觀測窗與文字結果探索。3D 旋轉暫不可用。</p><svg viewBox="0 0 400 150" role="img" aria-label="太陽照射地球與月球概念圖"><circle cx="60" cy="75" r="30" fill="#ffd17b"/><path d="M95 75H260" stroke="#ffd17b"/><circle cx="290" cy="75" r="20" fill="#75c7ba"/><circle cx="350" cy="75" r="9" fill="#ddd"/></svg></div>';status('WebGL 不可用：已啟用文字及2D觀察替代模式。');}
const a=()=>answers[taskIndex];
function evidenceReady(){const e=a().evidence;
 switch(taskIndex){
 case 0:return ['上弦月','下弦月'].every(n=>e.some(v=>v.phase===n&&Math.abs(v.k-.5)<=.02));
 case 1:return new Set(e.map(v=>v.phase)).size>=3&&e.filter(v=>v.lunar==='無月食').length>=2;
 case 2:return [0,5.145].every(i=>new Set(e.filter(v=>Math.abs(v.params.i-i)<.001&&v.phase==='新月'&&v.k<.01).map(v=>Math.round(v.params.t/synodic))).size>=3);
 case 3:return e.some(v=>v.lunar==='月全食');
 case 4:return e.some((x,i)=>e.some((y,j)=>i!==j&&JSON.stringify([x.params.t,x.params.i,x.params.node,x.params.distance])===JSON.stringify([y.params.t,y.params.i,y.params.node,y.params.distance])&&x.visible!==y.visible));
 case 5:return !!a().comparison;
 case 6:return new Set(e.map(v=>v.speed)).size>=2;
 case 7:return ['日全食','日環食'].every(n=>e.some(v=>v.solar===n&&v.sunAlt>0));
 default:return false;
 }
}
function renderTask(){
 const t=tasks[taskIndex],v=a();recordPage=Math.max(0,Math.min(recordPage,v.evidence.length-1));
 document.querySelectorAll<HTMLButtonElement>('[data-task]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.task)===taskIndex);b.setAttribute('aria-pressed',String(Number(b.dataset.task)===taskIndex));});$<HTMLSelectElement>('#taskPicker').value=String(taskIndex);
 const e=v.evidence[recordPage];
 $('#task').innerHTML=`<div class="task-heading"><span class="eyebrow">INQUIRY ${taskIndex+1} / 8</span><h2>${taskIndex+1}. ${t.title}</h2><p>${t.goal}</p></div>
 <div class="task-steps">${['預測','證據','解釋','檢核'].map((name,i)=>`<button data-step="${i}" class="${uiStep===i?'active':''}" aria-pressed="${uiStep===i}">${i+1}. ${name}</button>`).join('')}</div>
 <section class="task-step ${uiStep===0?'active':''}" data-stage="0"><h3>先預測，再動手</h3><label for="prediction">寫下預測，每段最多36字。</label><textarea id="prediction" placeholder="先寫下你的想法…"></textarea><p class="task-instruction">下一步到實驗模式調整時間、軌道或觀測地點，再返回這裡留下證據。切換畫面會保留作答。</p></section>
 <section class="task-step ${uiStep===1?'active':''}" data-stage="1"><div class="compact-subtabs"><button data-evidence="0" class="${evidencePart===0?'active':''}">操作</button><button data-evidence="1" class="${evidencePart===1?'active':''}">紀錄</button>${v.comparison?`<button data-evidence="2" class="${evidencePart===2?'active':''}">比較</button>`:''}</div><div class="evidence-part ${evidencePart===0?'active':''}" data-evidence-part="0"><div class="toolbar"><button id="backToLab">回到實驗</button><button id="record">記錄當下</button>${taskIndex===5?'<button id="compareYear">一年比較</button>':''}</div><p class="task-instruction">目前：第${p.t.toFixed(3)}天，傾角${p.i}°，${snapshot(p).phase.name}。</p>${v.comparison?'<button id="compareDetails">比較結果</button>':''}</div><div class="evidence-part ${evidencePart===1?'active':''}" data-evidence-part="1"><div class="record-list" id="records">${e?`<p>第${recordPage+1}筆：第${e.params.t.toFixed(3)}天／${e.params.i}°<br>${e.phase} ${(e.k*100).toFixed(1)}%・${e.lunar}<br>${esc(e.visible)}・${e.params.lat.toFixed(1)}°, ${e.params.lon.toFixed(1)}°</p>`:'<p>還沒有證據，先完成預測，再操作實驗並記錄。</p>'}</div><div class="pager"><button id="recordPrev" ${recordPage===0?'disabled':''}>上一筆</button><span>${v.evidence.length?recordPage+1:0} / ${v.evidence.length}筆</span>${e?'<button id="deleteRecord">刪除</button>':''}<button id="recordNext" ${recordPage>=v.evidence.length-1?'disabled':''}>下一筆</button></div></div>${v.comparison?`<div class="evidence-part ${evidencePart===2?'active':''}" data-evidence-part="2"><div id="comparison" class="comparison"></div></div>`:''}</section>
 <section class="task-step ${uiStep===2?'active':''}" data-stage="2"><div class="compact-subtabs"><button data-answer="0" class="${answerPart===0?'active':''}">選擇題</button><button data-answer="1" class="${answerPart===1?'active':''}">文字解釋</button></div><div class="answer-part ${answerPart===0?'active':''}" data-answer-part="0"><label for="choice">${t.question}</label><select id="choice"><option value="-1">請選擇…</option>${t.choices.map((c,i)=>`<option value="${i}" ${i===v.choice?'selected':''}>${c}</option>`).join('')}</select></div><div class="answer-part ${answerPart===1?'active':''}" data-answer-part="1"><label for="explanation">用主張、證據、原因解釋，每段最多36字。</label><textarea id="explanation" placeholder="我認為…，紀錄顯示…，因為…"></textarea></div></section>
 <section class="task-step ${uiStep===3?'active':''}" data-stage="3"><div class="compact-subtabs"><button data-review="0" class="${reviewPart===0?'active':''}">自評</button><button data-review="1" class="${reviewPart===1?'active':''}">回饋</button><button data-review="2" class="${reviewPart===2?'active':''}">參考</button></div><div class="review-part ${reviewPart===0?'active':''}" data-review-part="0"><div class="rubric">${['有主張','有證據','有推理'].map((c,i)=>`<label><input type="checkbox" data-rubric="${i}" ${v.rubric[i]?'checked':''}>${c}</label>`).join('')}</div><div class="toolbar"><button id="submit" class="primary">檢核作答</button><button id="hint">提示</button><button id="retry">重試</button></div></div><div class="review-part ${reviewPart===1?'active':''}" data-review-part="1"><div id="feedback" class="feedback" role="status"></div></div><div class="review-part ${reviewPart===2?'active':''}" data-review-part="2"><p class="task-instruction">解釋由學生自評與老師評閱，可自行揭示參考。</p><button id="teacherReference">教師參考解釋</button></div></section>
 <div class="wizard-nav"><button id="stepPrev" ${uiStep===0?'disabled':''}>上一步</button><span class="note">${uiStep+1} / 4</span><button id="stepNext" ${uiStep===3?'disabled':''}>下一步</button></div>`;
 pagedEditor($<HTMLTextAreaElement>('#prediction'),()=>a().prediction,text=>{a().prediction=text;save();});
 pagedEditor($<HTMLTextAreaElement>('#explanation'),()=>a().explanation,text=>{a().explanation=text;save();});
 pagedText($('#feedback'),v.feedback||'先預測，再留下觀察紀錄。開放解釋請依主張、證據、推理自評，交由老師討論。',55);
 if(v.comparison)pagedText($('#comparison'),v.comparison,45);
 document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button=>button.onclick=()=>{uiStep=Number(button.dataset.step);renderTask();});
 for(const [name,set] of [['evidence',(n:number)=>evidencePart=n],['answer',(n:number)=>answerPart=n],['review',(n:number)=>reviewPart=n]] as const){document.querySelectorAll<HTMLButtonElement>(`[data-${name}]`).forEach(button=>button.onclick=()=>{set(Number(button.getAttribute(`data-${name}`)));renderTask();});}
 if(v.comparison)$('#compareDetails').onclick=()=>showMessage('一年比較結果',v.comparison!);
 $('#stepPrev').onclick=()=>{uiStep=Math.max(0,uiStep-1);renderTask();};$('#stepNext').onclick=()=>{uiStep=Math.min(3,uiStep+1);renderTask();};
 $<HTMLSelectElement>('#choice').onchange=e=>{a().choice=Number((e.target as HTMLSelectElement).value);save();};
 document.querySelectorAll<HTMLInputElement>('[data-rubric]').forEach(el=>el.onchange=()=>{a().rubric[Number(el.dataset.rubric)]=el.checked;save();});
 $('#backToLab').onclick=()=>{setPane('scene');setMode('phase');};
 $('#recordPrev').onclick=()=>{recordPage--;renderTask();};$('#recordNext').onclick=()=>{recordPage++;renderTask();};
 if(e)$('#deleteRecord').onclick=()=>{a().evidence.splice(recordPage,1);save();renderTask();};
 $('#record').onclick=()=>{if(!a().prediction.trim()){uiStep=0;status('請先寫下預測，再記錄操作證據。');renderTask();return;}const s=snapshot(p);a().evidence.push({params:{...p},speed,phase:s.phase.name,k:s.phase.k,solar:s.solar.type,global:s.global.type,lunar:s.lunar.type,sunAlt:s.sunAlt,moonAlt:s.moonAlt,visible:s.sunAlt>0?s.solar.type:'太陽在地平線下'});recordPage=a().evidence.length-1;a().feedback=`已記錄第${a().evidence.length}筆，請比較結果並解釋原因。`;status(a().feedback);save();renderTask();};
 $('#submit').onclick=()=>{const objective=a().choice===t.answer,ready=evidenceReady();a().feedback=`概念判斷：${objective?'正確':'請再比較現象'}。操作證據：${ready?'達成':'尚未達成，請依任務補充紀錄'}。${!objective?'提示：'+t.hints[0]:''} ${a().explanation.trim()?'文字解釋已保存，請依三項規準自評，交由老師評閱。':'請補上主張、證據與推理。'}${objective&&ready&&a().prediction.trim()&&a().explanation.trim()&&a().rubric.every(Boolean)?' 本題客觀與操作檢核完成，推理仍需教師評閱。':''}`;reviewPart=1;save();renderTask();};
 $('#hint').onclick=()=>{a().feedback=t.hints[Math.min(a().hints++,t.hints.length-1)];save();renderTask();};$('#retry').onclick=()=>{a().choice=-1;a().feedback='已重開判斷，可修正預測與解釋；舊證據保留，可個別刪除。';a().rubric=[false,false,false];uiStep=0;save();renderTask();};
 $('#teacherReference').onclick=()=>showMessage('教師參考解釋',t.reference+' 評閱：主張是否回應問題？證據是否來自紀錄？推理是否連結相對位置、照明或視大小？');
 if(taskIndex===5)$('#compareYear').onclick=async()=>{stop();const b=$<HTMLButtonElement>('#compareYear');b.disabled=true;status('正在比較同一觀察窗內的事件段數…');await new Promise(r=>setTimeout(r,30));const results=[];for(const i of [0,5.145,10]){let solar=0,moon=0,wasS=false,wasL=false;for(let dt=0;dt<C.year;dt+=.02){const q={...p,i,t:p.t+dt};const s=globalSolar(q).type!=='無日食',l=lunar(q).type!=='無月食';if(s&&!wasS)solar++;if(l&&!wasL)moon++;wasS=s;wasL=l;}results.push(`${i}°：日食${solar}段、月食${moon}段`);}a().comparison=`第${p.t.toFixed(3)}天起365.256天；交點${p.node}°；距離${p.distance}km；0.02天取樣。${results.join('；')}（含觀察起點正在進行的事件）`;evidencePart=2;save();renderTask();status('一年比較完成，可逐段查看結果。');};
}
function download(format:'json'|'csv'){
 let text='';if(format==='json')text=JSON.stringify({version:2,model:'circular-fixed-node',p,answers},null,2);else{const rows:unknown[][]=[['任務','預測','解釋','選項','自評','回饋','一年比較','時間_天','傾角_度','交點_度','距離_km','緯度','經度','速度_天每秒','月相','亮面比例','全球日食','當地日食','月食','太陽高度','月球高度','可見性']];answers.forEach((a,i)=>{const prefix=[i+1,a.prediction,a.explanation,a.choice,a.rubric.join('/'),a.feedback,a.comparison||''];if(!a.evidence.length)rows.push(prefix);a.evidence.forEach(e=>rows.push([...prefix,e.params.t,e.params.i,e.params.node,e.params.distance,e.params.lat,e.params.lon,e.speed,e.phase,e.k,e.global,e.solar,e.lunar,e.sunAlt,e.moonAlt,e.visible]));});text='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');}
 const url=URL.createObjectURL(new Blob([text],{type:format==='json'?'application/json':'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`月相探究紀錄.${format}`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('已產生下載檔，請查看瀏覽器下載項目。');
}
// Public controls all mutate one model state.
let nextIntercept:number|null=null;
$('#play').onclick=()=>{playing=!playing;if(playing)nextIntercept=$<HTMLInputElement>('#pauseAtEvent').checked?nextEvent(p):null;$('#play').textContent=playing?'Ⅱ 暫停':'▶ 播放';$('#scenePause').classList.toggle('hidden',!playing);};
$<HTMLSelectElement>('#speed').onchange=e=>{speed=Number((e.target as HTMLSelectElement).value);};
$<HTMLInputElement>('#time').oninput=e=>{stop();p.t=Number((e.target as HTMLInputElement).value);update();save();};
$('#prevWindow').onclick=()=>{stop();windowStart-=35;p.t=windowStart;update();save();};$('#nextWindow').onclick=()=>{stop();windowStart+=35;p.t=windowStart;update();save();};
for(const id of ['inclination','node','lat','lon'])$<HTMLInputElement>('#'+id).oninput=e=>{stop();const el=e.target as HTMLInputElement;const value=el.valueAsNumber;if(!Number.isFinite(value))return;const n=Math.max(Number(el.min),Math.min(Number(el.max),value));p[id==='inclination'?'i':id as 'node'|'lat'|'lon']=n;update();save();};
$('#inclinationReset').onclick=()=>{stop();p.i=5.145;update();save();};$('#taiwan').onclick=()=>{stop();p.lat=23.5;p.lon=121;update();save();};
$('#nextPhase').onclick=()=>{stop();p.t=nextPhase(p);update();save();};
$('#nextEvent').onclick=async()=>{stop();const b=$<HTMLButtonElement>('#nextEvent');b.disabled=true;status('搜尋未來400天的食象…');await new Promise(r=>setTimeout(r,30));let start={...p};for(let k=0;k<200;k++){if(globalSolar(start).type==='無日食'&&lunar(start).type==='無月食')break;start.t+=.02;}const time=nextEvent(start);if(time!==null){p.t=time;update();save();status('已定位下一段食象起始附近，可微調時間觀察。');}else status('未來400天內沒有找到食象。');b.disabled=false;};
$<HTMLSelectElement>('#preset').onchange=e=>{const key=(e.target as HTMLSelectElement).value;if(!key)return;stop();p=caseParams(key);setReferenceFrame('earth');mode=['total','partial','annular','none'].includes(key)?'solar':'lunar';setMode(mode);setPane('scene');update();save();status('已載入幾何案例；所有分類由模型即時計算。');};
function setMode(m:string){mode=m;document.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach(b=>{b.classList.toggle('active',b.dataset.mode===m);b.setAttribute('aria-pressed',String(b.dataset.mode===m));});document.body.dataset.mode=m;requestAnimationFrame(()=>{scene?.resize();update();});update();}
for(const b of document.querySelectorAll<HTMLButtonElement>('button[data-mode]'))b.onclick=()=>setMode(b.dataset.mode!);
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-task]'))b.onclick=()=>{taskIndex=Number(b.dataset.task);uiStep=0;recordPage=0;evidencePart=0;answerPart=0;reviewPart=0;renderTask();};
$<HTMLSelectElement>('#taskPicker').onchange=e=>{taskIndex=Number((e.target as HTMLSelectElement).value);uiStep=0;recordPage=0;evidencePart=0;answerPart=0;reviewPart=0;renderTask();};
$<HTMLInputElement>('#sky').onchange=e=>{stop();sky=(e.target as HTMLInputElement).checked;update();};$<HTMLInputElement>('#layers').onchange=e=>{layers=(e.target as HTMLInputElement).checked;update();};
function setReferenceFrame(frame:'sun'|'earth'){
 $<HTMLSelectElement>('#referenceFrame').value=frame;scene?.setFrame(frame);$('#frameLabel').textContent=frame==='sun'?'太陽置中・公轉全景':'地球置中・月相近看';update();
}
$<HTMLSelectElement>('#referenceFrame').onchange=e=>setReferenceFrame((e.target as HTMLSelectElement).value as 'sun'|'earth');
$('#revolution').onclick=()=>{setReferenceFrame('sun');speed=100;$<HTMLSelectElement>('#speed').value='100';$<HTMLInputElement>('#pauseAtEvent').checked=false;nextIntercept=null;playing=true;$('#play').textContent='Ⅱ 暫停';$('#scenePause').classList.remove('hidden');setPane('scene');status('地球公轉展示：100天／秒，約3.65秒繞太陽一圈。可按暫停或調整速度。');};
$('#quarterYear').onclick=()=>{stop();p.t+=C.year/4;setReferenceFrame('sun');save();};
$<HTMLInputElement>('#pauseAtEvent').onchange=()=>{nextIntercept=playing&&$<HTMLInputElement>('#pauseAtEvent').checked?nextEvent(p):null;};
$('#axisClose').onclick=()=>{stop();setReferenceFrame('earth');scene?.view('axis');setPane('scene');status('自轉軸近看：青色為地球自轉軸，灰虛線為黃道面法線，夾角23.44°。');};
$('#scenePause').onclick=stop;
$('#top').onclick=()=>scene?.view('top');$('#side').onclick=()=>scene?.view('side');$('#cameraReset').onclick=()=>scene?.view('reset');$('#zoomIn').onclick=()=>scene?.zoom(.8);$('#zoomOut').onclick=()=>scene?.zoom(1.25);
$('#reset').onclick=()=>{stop();p={...defaults};windowStart=0;speed=1;sky=false;layers=true;$<HTMLSelectElement>('#speed').value='1';$<HTMLInputElement>('#sky').checked=false;$<HTMLInputElement>('#layers').checked=true;$<HTMLSelectElement>('#preset').value='';$<HTMLInputElement>('#pauseAtEvent').checked=true;setReferenceFrame('sun');setMode('phase');setPane('scene');save();status('實驗已重設，作答與證據保留。');};
$('#help').onclick=()=>{pagedText($('#helpContent'),'本教材為示意幾何模型，不是日期預報。手機使用3D實驗、觀測、設定、地點分區切換；桌面在右側切換。拖曳旋轉、雙指或滾輪縮放，也可用俯視、側視及縮放按鈕。公轉全景觀察地球繞日；看自轉軸可放大23.44°傾角。探究挑戰有預測、證據、解釋、檢核四步，內容自動保存。長文字可前後分段，證據可逐筆翻頁。地面可見性以高度文字為準。月食紅色僅為大氣折射概念著色。實際看太陽須使用合適安全觀測方法。',105);$<HTMLDialogElement>('#helpDialog').showModal();};$('#closeHelp').onclick=()=>$<HTMLDialogElement>('#helpDialog').close();
$('#clear').onclick=()=>$<HTMLDialogElement>('#clearDialog').showModal();$('#cancelClear').onclick=()=>$<HTMLDialogElement>('#clearDialog').close();$('#confirmClear').onclick=()=>{answers=tasks.map(fresh);save();renderTask();$<HTMLDialogElement>('#clearDialog').close();status('全部作答已清除。');};
$('#json').onclick=()=>download('json');$('#csv').onclick=()=>download('csv');
window.addEventListener('resize',()=>update());window.addEventListener('beforeunload',save);
let last=performance.now(),paint=0;const frameDurations:number[]=[];
function frame(now:number){const dt=Math.min((now-last)/1000,.1);frameDurations.push(now-last);if(frameDurations.length>600)frameDurations.shift();last=now;
 if(playing){const end=p.t+dt*speed;if(nextIntercept!==null&&end>=nextIntercept){p.t=nextIntercept;stop();update();status('已在食象開始附近自動暫停，避免快速播放略過事件。');}else p.t=end;}
 if(playing&&now-paint>33){update();paint=now;}scene?.render();requestAnimationFrame(frame);
}
// Read-only diagnostics used by reproducible browser acceptance tests.
Object.assign(window,{labDiagnostics:()=>({p:{...p},snapshot:snapshot(p),answers:JSON.parse(JSON.stringify(answers)),playing,storageOK,webgl:!!scene,ui:{mode,pane:activePane,step:uiStep},display:scene?{frame:scene.frame,layout:scene.layout,axisVisible:scene.axisGroup.visible,shadowWireframes:0}:null,renderScale:scene?.quality,drawCalls:scene?.renderer.info.render.calls,frames:frameDurations.length,fps:frameDurations.length?1000/(frameDurations.reduce((a,b)=>a+b,0)/frameDurations.length):0})});
renderTask();update();if(!storageOK)status('本機儲存無法使用，請匯出作答。');requestAnimationFrame(frame);
