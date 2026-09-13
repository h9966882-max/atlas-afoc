const faculties = [
  {code:'PHL',name:'哲学部',emoji:'🏛️',lb:'working',rb:'working',now:'PHL系を実装中'},
  {code:'REL',name:'宗教学部',emoji:'🕯️',lb:'done',rb:'working',now:'Reading Book実装中'},
  {code:'HIS',name:'歴史学部',emoji:'📜',lb:'working',rb:'locked',now:'Lecture Book実装中'},
  {code:'PSY',name:'心理学部',emoji:'🧠',lb:'working',rb:'locked',now:'Lecture Book実装中'},
  {code:'STR',name:'戦略学部',emoji:'♟️',lb:'working',rb:'locked',now:'Lecture Book実装中'},
  {code:'ECO',name:'経済学部',emoji:'📈',lb:'working',rb:'locked',now:'Lecture Book実装中'},
  {code:'BUS',name:'商学部',emoji:'🧾',lb:'working',rb:'locked',now:'Lecture Book実装中'},
];

const workers = [
  {id:'phl-lb',label:'哲学 LB',color:'#7b99b1',icon:'🐅'},
  {id:'phl-rb',label:'哲学 RB',color:'#87a28e',icon:'🐥'},
  {id:'rel-rb',label:'宗教 RB',color:'#b9a17b',icon:'🐥'},
  {id:'his-lb',label:'歴史 LB',color:'#a38d7d',icon:'🐅'},
  {id:'psy-lb',label:'心理 LB',color:'#9b8dac',icon:'🐅'},
  {id:'str-lb',label:'戦略 LB',color:'#718a83',icon:'🐅'},
  {id:'eco-lb',label:'経済 LB',color:'#8ba0a7',icon:'🐅'},
  {id:'bus-lb',label:'商学 LB',color:'#b38d82',icon:'🐅'},
];

const statusLabel = {working:'🔵 実装中',done:'✅ 完了',locked:'🔒 待機'};
const statusCopy = {
  working:['現在','教材実装を進行中'],
  done:['完了','Lecture Book実装完了'],
  locked:['前工程待ち','Lecture Bookの供給待ち']
};

const curriculum = document.getElementById('curriculum');
const desks = document.getElementById('desks');
const activity = document.getElementById('activity');
const office = document.getElementById('office');
const doneZone = document.getElementById('doneZone');
const stickyWall = document.getElementById('stickyWall');
const toast = document.getElementById('toast');

function lane(title,status){
  const [lead,copy] = statusCopy[status];
  const progress = status === 'done' ? '100%' : status === 'working' ? '48%' : '0%';
  return `
    <div class="lane">
      <div class="lane-top">
        <span class="lane-title">${title}</span>
        <span class="status ${status}">${statusLabel[status]}</span>
      </div>
      <div class="lane-copy"><b>${lead}</b><span>${copy}</span></div>
      <div class="track"><i style="--progress:${progress}"></i></div>
    </div>`;
}

function renderCurriculum(){
  curriculum.innerHTML = '';
  faculties.forEach(f => {
    const article = document.createElement('article');
    article.className = 'faculty';
    article.innerHTML = `
      <div class="faculty-head">
        <div class="faculty-name"><span class="faculty-icon">${f.emoji}</span>${f.name}</div>
        <span class="faculty-code">${f.code}</span>
      </div>
      <div class="lanes">${lane('Lecture Book',f.lb)}${lane('Reading Book',f.rb)}</div>`;
    curriculum.appendChild(article);
  });
}

function workerMarkup(w){
  return `
    <div class="desk"><div class="mug"></div><div class="laptop"></div><div class="desk-label">${w.label}</div></div>
    <div class="worker working" id="worker-${w.id}" style="--worker-color:${w.color}">
      <div class="speech">${w.icon} ﾓﾘﾓﾘ…</div>
      <div class="hair"></div><div class="head"></div><div class="body"></div>
      <div class="arm left"></div><div class="arm right"></div>
      <div class="leg left"></div><div class="leg right"></div>
      <div class="document"></div>
    </div>`;
}

function renderWorkers(){
  desks.innerHTML = '';
  workers.forEach(w => {
    const station = document.createElement('div');
    station.className = 'station';
    station.dataset.worker = w.id;
    station.innerHTML = workerMarkup(w);
    desks.appendChild(station);
  });
}

function addEvent(kind,title,detail,time='NOW'){
  const row = document.createElement('div');
  row.className = `event ${kind||''}`;
  row.innerHTML = `<time>${time}</time><i class="dot"></i><div><b>${title}</b><span>${detail}</span></div>`;
  activity.prepend(row);
  while(activity.children.length > 7) activity.lastElementChild.remove();
}

function seedEvents(){
  addEvent('', '教材開発8室が稼働中', '現状データをAFOCへ反映', 'STATE');
  addEvent('done', '宗教学部 Lecture Book', '実装完了', 'STATE');
  addEvent('', '哲学部 Reading Book', '実装中', 'STATE');
  addEvent('', '宗教学部 Reading Book', '実装中', 'STATE');
}

function showToast(message){
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(()=>toast.classList.remove('show'),2200);
}

const wait = ms => new Promise(r => setTimeout(r,ms));
let currentWorkerIndex = 0;
let demoRunning = false;

async function demoComplete(index=currentWorkerIndex){
  if(demoRunning) return;
  demoRunning = true;
  const w = workers[index];
  const actor = document.getElementById(`worker-${w.id}`);
  const station = actor.closest('.station');
  const startActorRect = actor.getBoundingClientRect();
  const officeRect = office.getBoundingClientRect();
  const doneRect = doneZone.getBoundingClientRect();

  const startX = startActorRect.left - officeRect.left;
  const startY = startActorRect.top - officeRect.top;
  const targetX = doneRect.left - officeRect.left + doneRect.width/2 - startActorRect.width/2;
  const targetY = doneRect.top - officeRect.top + 15;
  const dx = targetX - startX;
  const dy = targetY - startY;

  actor.classList.remove('working');
  actor.classList.add('carrying');
  actor.querySelector('.speech').textContent = '📄 完了！';
  await wait(500);

  actor.classList.add('walking');
  actor.style.zIndex = 20;
  const go = actor.animate([
    {transform:'translateX(-50%) translate(0,0)'},
    {transform:`translateX(-50%) translate(${dx*.48}px,${dy*.08}px)`},
    {transform:`translateX(-50%) translate(${dx}px,${dy}px)`}
  ],{duration:1800,easing:'cubic-bezier(.38,.02,.19,.99)',fill:'forwards'});
  await go.finished;
  actor.classList.remove('walking');
  actor.querySelector('.speech').textContent = 'ｽﾎﾟｯ';
  await wait(450);
  actor.classList.remove('carrying');
  await wait(260);

  const sticky = document.createElement('div');
  sticky.className = 'sticky';
  sticky.textContent = `✓ ${w.label}`;
  stickyWall.appendChild(sticky);
  if(stickyWall.querySelectorAll('.sticky').length > 3){
    stickyWall.querySelectorAll('.sticky')[0].remove();
  }
  actor.querySelector('.speech').textContent = '🟨 ﾍﾟﾀｯ';
  addEvent('demo', `${w.label} が1件完了`, '完了BOXへ格納 → DONE付箋を追加', new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'}));
  await wait(650);

  actor.classList.add('walking');
  actor.querySelector('.speech').textContent = 'ﾄｺﾄｺ…';
  const back = actor.animate([
    {transform:`translateX(-50%) translate(${dx}px,${dy}px)`},
    {transform:`translateX(-50%) translate(${dx*.48}px,${dy*.08}px)`},
    {transform:'translateX(-50%) translate(0,0)'}
  ],{duration:1800,easing:'cubic-bezier(.38,.02,.19,.99)',fill:'forwards'});
  await back.finished;
  back.cancel();
  go.cancel();
  actor.classList.remove('walking');
  actor.style.zIndex = 5;
  actor.querySelector('.speech').textContent = `${w.icon} 次ﾉ仕事！`;
  actor.classList.add('working');
  showToast(`${w.label}：完了 → 次の仕事へ ✨`);
  await wait(900);
  actor.querySelector('.speech').textContent = `${w.icon} ﾓﾘﾓﾘ…`;
  demoRunning = false;
}

document.getElementById('demoBtn').addEventListener('click',()=>demoComplete(currentWorkerIndex));
document.getElementById('randomBtn').addEventListener('click',()=>{
  if(demoRunning) return;
  let next = currentWorkerIndex;
  while(next === currentWorkerIndex) next = Math.floor(Math.random()*workers.length);
  currentWorkerIndex = next;
  const w = workers[currentWorkerIndex];
  showToast(`次は ${w.label} を実演するよ 👀`);
});

renderCurriculum();
renderWorkers();
seedEvents();
