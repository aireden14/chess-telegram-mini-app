import"./modulepreload-polyfill-B5Qt9EMX.js";const j=1120,F=720,H=48,fe=548,pe=360,b=3,he=900,be=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]],Y=["ironOre","copperOre","coal","stone","crude","ironPlate","copperPlate","gear","circuit","science"],Z={ironOre:{label:"Железо",short:"Fe",color:"#8f9aa3"},copperOre:{label:"Медь",short:"Cu",color:"#c97845"},coal:{label:"Уголь",short:"Co",color:"#2c3034"},stone:{label:"Камень",short:"St",color:"#8a8175"},crude:{label:"Нефть",short:"Oil",color:"#303248"},ironPlate:{label:"Плиты Fe",short:"Fe+",color:"#b8c1ca"},copperPlate:{label:"Плиты Cu",short:"Cu+",color:"#e08a4c"},gear:{label:"Шестерни",short:"Gr",color:"#7aa6b8"},circuit:{label:"Схемы",short:"Ci",color:"#47a66a"},science:{label:"Наука",short:"Sc",color:"#c24b5f"}},v={iron:{label:"железо",fill:"#7f8d98",stroke:"#c8d1da",resource:"ironOre"},copper:{label:"медь",fill:"#a75f39",stroke:"#ffc08d",resource:"copperOre"},coal:{label:"уголь",fill:"#2a2f32",stroke:"#7d858a",resource:"coal"},stone:{label:"камень",fill:"#786f63",stroke:"#d5c4a5",resource:"stone"},oil:{label:"нефть",fill:"#25284c",stroke:"#93a2ff",resource:"crude"},water:{label:"вода",fill:"#2d86a7",stroke:"#9ee7ff"},empty:{label:"плато",fill:"#59645a",stroke:"#b8c5ac"}},f={drill:{label:"Бур",mark:"DR",cost:{ironPlate:2,gear:1},hint:"руда"},pump:{label:"Помпа",mark:"PU",cost:{ironPlate:3,circuit:1},hint:"нефть/вода"},furnace:{label:"Печь",mark:"FU",cost:{stone:4,ironOre:2},hint:"плиты"},assembler:{label:"Сборщик",mark:"AS",cost:{ironPlate:4,gear:2,circuit:1},hint:"детали"},lab:{label:"Лаба",mark:"LA",cost:{ironPlate:5,copperPlate:4,gear:2,circuit:3},hint:"прогресс"},power:{label:"ТЭЦ",mark:"PW",cost:{stone:5,ironPlate:3},hint:"энергия"},solar:{label:"Солар",mark:"SO",cost:{copperPlate:3,circuit:2},hint:"энергия"},depot:{label:"Узел",mark:"DP",cost:{ironPlate:4,stone:4},hint:"склад"}},w={ironPlate:1,gear:1},me=["belt","drill","pump","furnace","assembler","lab","power","solar","depot"],$e=["player","aurora","zenith"],V="hexforge-save-v1",J=document.querySelector("#hexforge");if(!J)throw new Error("HexForge root is missing");const d=J;var U;const c=(U=window.Telegram)==null?void 0:U.WebApp;var G,A,D,_,z;try{(G=c==null?void 0:c.ready)==null||G.call(c),(A=c==null?void 0:c.expand)==null||A.call(c),(D=c==null?void 0:c.disableVerticalSwipes)==null||D.call(c);const e=((_=c==null?void 0:c.contentSafeAreaInset)==null?void 0:_.top)??((z=c==null?void 0:c.safeAreaInset)==null?void 0:z.top)??0;document.documentElement.style.setProperty("--tg-content-safe-area-inset-top",`${Math.max(0,e)}px`)}catch{}let o=Q(),y=null;function L(e,t){return`${e},${t}`}function ge(e){const[t,n]=e.split(",").map(Number);return[t??0,n??0]}function K(e,t){return(Math.abs(e)+Math.abs(t)+Math.abs(e+t))/2}function ye(e,t){return{x:fe+H*Math.sqrt(3)*(e+t/2),y:pe+H*1.5*t}}function X(e,t){let n=e*92837111^t*689287499^2654435769;return n=(n^n>>>13)*1274126177,Math.abs(n^n>>>16)}function ve(e,t){if(e===0&&t===0||e===-3&&t===1||e===3&&t===-1)return"empty";const n=X(e,t)%100,r=K(e,t);return r>=3&&n<16?"oil":r>=3&&n>=16&&n<25?"water":n<22?"iron":n<42?"copper":n<60?"coal":n<78?"stone":"empty"}function P(){return Object.fromEntries(Y.map(e=>[e,0]))}function p(e,t,n){e[t]=Math.max(0,(e[t]??0)+n)}function Q(){const e=[],t=new Map;for(let s=-b;s<=b;s+=1)for(let l=-b;l<=b;l+=1){if(K(s,l)>b)continue;const a=ye(s,l),i={id:L(s,l),q:s,r:l,x:a.x,y:a.y,deposit:ve(s,l),richness:1+X(s,l)%4,owner:null,building:null,level:1,progress:0,lastRate:0};e.push(i),t.set(i.id,i)}const n=[];for(const s of e)for(const[l,a]of be.slice(0,3)){const i=t.get(L(s.q+l,s.r+a));i&&n.push({id:W(s.id,i.id),a:s.id,b:i.id,x1:s.x,y1:s.y,x2:i.x,y2:i.y,owner:null,level:1,flow:0})}const r={player:{id:"player",label:"Твой завод",short:"YOU",color:"#49b86f",storage:{...P(),ironOre:8,copperOre:5,coal:12,stone:8,ironPlate:8,copperPlate:4,gear:4,circuit:2},automation:0,plan:"Развернуть первую линию",lastAction:"Центральный узел запущен"},aurora:{id:"aurora",label:"Aurora Works",short:"AUR",color:"#58a6ff",storage:{...P(),ironPlate:10,gear:5,coal:8,stone:6},automation:8,plan:"Медь -> схемы",lastAction:"Готовит линию меди"},zenith:{id:"zenith",label:"Zenith Grid",short:"ZEN",color:"#f29d49",storage:{...P(),ironPlate:10,gear:5,coal:8,stone:6},automation:8,plan:"Уголь -> энергия",lastAction:"Ставит бур у угля"}};return E(e,"player","0,0","depot"),E(e,"aurora","-3,1","depot"),E(e,"zenith","3,-1","depot"),T(n,"aurora","-3,1","-2,1"),T(n,"zenith","3,-1","2,-1"),{hexes:e,edges:n,factions:r,selected:"belt",inspectedHexId:"0,0",paused:!1,speed:1,tick:0,cycle:1,powerMade:2,powerNeed:0,powerRatio:1,message:"Поставь конвейер от центрального узла к ближайшей залежи.",events:["Смена открыта: центральный узел принимает ресурсы","Aurora и Zenith уже разворачивают линии"],completed:[]}}function E(e,t,n,r){const s=e.find(l=>l.id===n);s&&(s.owner=t,s.building=r,s.level=1)}function T(e,t,n,r){const s=e.find(l=>l.id===W(n,r));s&&(s.owner=t,s.flow=.5)}function W(e,t){return[e,t].sort().join("|")}function h(e){return o.hexes.find(t=>t.id===e)}function we(e){return o.edges.find(t=>t.id===e)}function M(e){return o.edges.filter(t=>t.a===e||t.b===e)}function x(e){const t=o.hexes.filter(s=>s.owner===e&&s.building==="depot").map(s=>s.id),n=new Set(t),r=[...t];for(;r.length;){const s=r.shift();if(s)for(const l of M(s)){if(l.owner!==e)continue;const a=l.a===s?l.b:l.a;n.has(a)||(n.add(a),r.push(a))}}return n}function k(e,t){const n=o.factions[e].storage;return Object.entries(t).every(([r,s])=>(n[r]??0)>=(s??0))}function B(e,t){const n=o.factions[e].storage;for(const[r,s]of Object.entries(t))n[r]-=s??0}function ee(e,t){if(e.owner||!k(t,w))return!1;const n=x(t);return n.has(e.a)||n.has(e.b)}function xe(e,t){return t.building&&t.owner==="player"?!1:e==="drill"?["iron","copper","coal","stone"].includes(t.deposit):e==="pump"?t.deposit==="oil"||t.deposit==="water":t.deposit!=="water"}function R(e,t,n){if(e.owner&&e.owner!==n||!xe(t,e)||!k(n,f[t].cost))return!1;const r=x(n);return r.has(e.id)?!0:M(e.id).some(s=>s.owner===n&&(r.has(s.a)||r.has(s.b)))}function ke(e){return e==="belt"?new Set:new Set(o.hexes.filter(t=>R(t,e,"player")).map(t=>t.id))}function Se(){return new Set(o.edges.filter(e=>ee(e,"player")).map(e=>e.id))}function te(e,t){return ee(e,t)?(B(t,w),e.owner=t,e.level=1,e.flow=.35,g(t,`${o.factions[t].short}: конвейер ${I(e.a)} -> ${I(e.b)}`),t==="player"&&(o.message="Линия подключена. Теперь ставь добычу или переработку на подсвеченный гекс."),!0):!1}function ne(e,t,n){return R(e,t,n)?(B(n,f[t].cost),e.owner=n,e.building=t,e.level=1,e.progress=0,e.lastRate=0,o.inspectedHexId=e.id,g(n,`${o.factions[n].short}: ${f[t].label} на ${v[e.deposit].label}`),n==="player"&&(t!=="depot"&&(o.selected="belt"),o.message=re(),C("success")),!0):!1}function Pe(e){if(e.owner!=="player"||!e.building||e.level>=3)return;const t={ironPlate:2*e.level,gear:1*e.level,circuit:e.level>=2?1:0};if(!k("player",t)){Xe("Не хватает деталей на апгрейд");return}B("player",t),e.level+=1,g("player",`YOU: ${f[e.building].label} уровень ${e.level}`),o.message="Апгрейд применён. Линия стала плотнее.",u()}function Ee(e){e.owner!=="player"||e.building==="depot"||(e.owner=null,e.building=null,e.level=1,e.progress=0,e.lastRate=0,o.inspectedHexId=null,g("player","YOU: площадка очищена"),u())}function g(e,t){const n=e==="player"?"●":e==="aurora"?"◆":"■";o.events.unshift(`${n} ${t}`),o.events=o.events.slice(0,9),o.factions[e].lastAction=t.replace(/^.*?:\s*/,"")}function I(e){const[t,n]=ge(e);return`${t}:${n}`}function oe(){if(o.paused)return;const e=o.speed;for(let t=0;t<e;t+=1)o.tick+=1,o.tick%8===0&&(o.cycle+=1),O("player"),O("aurora"),O("zenith"),o.tick%5===0&&N("aurora"),o.tick%7===0&&N("zenith"),Ce();u()}function O(e){const t=o.factions[e],n=x(e),r=o.hexes.filter(i=>i.owner===e&&i.building&&n.has(i.id));let s=2,l=0;for(const i of r)i.lastRate=0,i.building==="solar"&&(s+=1.4*i.level),i.building==="power"&&t.storage.coal>=.18&&(t.storage.coal-=.18,s+=4.2*i.level),i.building&&!["depot","solar","power"].includes(i.building)&&(l+=i.building==="lab"?1.8:1);const a=l>0?Math.min(1,s/l):1;e==="player"&&(o.powerMade=s,o.powerNeed=l,o.powerRatio=a);for(const i of r)i.building&&Oe(i,t,a);e!=="player"&&(t.automation=$(t.automation+Be(e),0,100));for(const i of o.edges)i.owner===e&&(i.flow=$(.18+Math.sin((o.tick+i.x1+i.y1)/8)*.14+a*.48,.08,1))}function Oe(e,t,n){const r=e.level*n;switch(e.building){case"drill":{const s=v[e.deposit].resource;if(!s||e.deposit==="oil")return;const l=(.18+e.richness*.045)*r;p(t.storage,s,l),e.lastRate=l;break}case"pump":{if(e.deposit!=="oil")return;const s=(.12+e.richness*.035)*r;p(t.storage,"crude",s),e.lastRate=s;break}case"furnace":e.lastRate=He(e,t.storage,r);break;case"assembler":e.lastRate=Ie(e,t.storage,r);break;case"lab":e.lastRate=Me(e,t,r);break}}function He(e,t,n){const s=t.ironPlate<t.copperPlate+8||t.ironOre>t.copperOre?"iron":"copper",l=s==="iron"?"ironOre":"copperOre",a=s==="iron"?"ironPlate":"copperPlate",i=.16*n;return t[l]<i||t.coal<i*.35?0:(t[l]-=i,t.coal-=i*.35,p(t,a,i*.86),e.progress=(e.progress+i*12)%100,i*.86)}function Ie(e,t,n){const r=.12*n;return t.gear>=6&&t.circuit>=4&&t.copperPlate>=2?(t.gear-=r,t.circuit-=r*.65,t.copperPlate-=r*.45,p(t,"science",r*.55),e.progress=(e.progress+r*16)%100,r*.55):t.ironPlate>=r*2&&t.copperPlate>=r?(t.ironPlate-=r*.85,t.copperPlate-=r*.75,p(t,"circuit",r*.7),e.progress=(e.progress+r*12)%100,r*.7):t.ironPlate>=r*1.4?(t.ironPlate-=r*1.4,p(t,"gear",r),e.progress=(e.progress+r*10)%100,r):0}function Me(e,t,n){const r=.13*n;return t.storage.science<r?0:(t.storage.science-=r,t.automation=$(t.automation+r*2.7,0,100),e.progress=(e.progress+r*20)%100,r)}function Be(e){return .012+o.hexes.filter(n=>n.owner===e&&n.building&&n.building!=="depot").length*.004}function N(e){const t=o.factions[e],n=x(e),r=o.edges.filter(a=>!a.owner&&(n.has(a.a)||n.has(a.b)));if(r.length&&k(e,w)){const a=Re(r,e);te(a,e),t.plan=e==="aurora"?"добирает медь":"тянет угольную линию";return}const s=o.hexes.filter(a=>a.owner&&a.owner!==e?!1:M(a.id).some(i=>i.owner===e&&(n.has(i.a)||n.has(i.b)))),l=e==="aurora"?["drill","furnace","assembler","lab","solar","power"]:["drill","power","furnace","assembler","lab","solar"];for(const a of l){const i=s.find(S=>R(S,a,e));if(i){ne(i,a,e),t.plan=a==="lab"?"наука":`${f[a].label.toLowerCase()} линия`;return}}p(t.storage,"ironPlate",.45),p(t.storage,"gear",.18),t.lastAction="копит детали"}function Re(e,t){const n=t==="aurora"?["copper","iron","coal","stone","oil"]:["coal","iron","stone","copper","oil"];return[...e].sort((r,s)=>{const l=q(r,n),a=q(s,n);return l-a||r.id.localeCompare(s.id)})[0]??e[0]}function q(e,t){const n=h(e.a),r=h(e.b);return Math.min(t.indexOf((n==null?void 0:n.deposit)??"empty"),t.indexOf((r==null?void 0:r.deposit)??"empty"))}function Ce(){const e=o.factions.player.storage,t=[["Первая руда",e.ironOre+e.copperOre>=25],["Плавка",e.ironPlate+e.copperPlate>=16],["Сборка",e.gear>=8||e.circuit>=5],["Наука",e.science>=3||o.factions.player.automation>=10],["Поток 100%",o.factions.player.automation>=100]];for(const[n,r]of t)!r||o.completed.includes(n)||(o.completed.push(n),g("player",`YOU: закрыта цель «${n}»`),n!=="Поток 100%"&&(o.message=re()))}function re(){const e=o.factions.player.storage,t=o.hexes.filter(n=>n.owner==="player"&&n.building).map(n=>n.building);return o.edges.some(n=>n.owner==="player")?t.includes("drill")?t.includes("furnace")?t.includes("assembler")?t.includes("lab")?e.coal<3&&o.powerRatio<.75?"Энергии мало: добавь ТЭЦ или солар.":"Расширяй линии и гони поток к 100%.":"Подключи лабораторию: она превращает науку в прогресс.":"Протяни линию к сборщику для шестерён, схем и науки.":"Протяни площадку под печь: руда начнёт превращаться в плиты.":"Поставь бур на железо, медь, уголь или камень.":"Протяни конвейер от узла к залежи."}function je(e){const t=h(e);t&&(o.inspectedHexId=e,o.selected!=="belt"&&(ne(t,o.selected,"player")||(o.message=t.owner&&t.owner!=="player"?"Гекс занят соперником.":"Нужны ресурсы, подключение или совместимая залежь.",C("warning"))),u())}function Fe(e){const t=we(e);if(t){if(o.selected!=="belt"){o.message="Для рёбер выбери конвейер.",u();return}te(t,"player")||(o.message="Конвейер строится только от твоей сети и при наличии деталей.",C("warning")),u()}}function se(e){o.selected=e,o.message=e==="belt"?"Подсвечены рёбра, куда можно тянуть конвейер.":`${f[e].label}: подсвечены подходящие гексы.`,u()}function ae(){ce(),o=Q(),ie(),le(),u()}function Le(){o.paused=!o.paused,u()}function Te(){o.speed=o.speed===1?2:o.speed===2?4:1,u()}function ie(){try{localStorage.setItem(V,JSON.stringify(o))}catch{}}function Ne(){var e;try{const t=localStorage.getItem(V);if(!t)return!1;const n=JSON.parse(t);return!Array.isArray(n.hexes)||!Array.isArray(n.edges)||!((e=n.factions)!=null&&e.player)?!1:(o=n,!0)}catch{return!1}}function le(){ce(),y=window.setInterval(()=>{oe(),o.tick%4===0&&ie()},he)}function ce(){y!==null&&window.clearInterval(y),y=null}function u(){d.innerHTML=qe(),Ke()}function qe(){const e=o.factions.player,t=[...$e].sort((n,r)=>o.factions[r].automation-o.factions[n].automation)[0];return`
    <main class="hf-stage">
      <section class="hf-map-shell" aria-label="HexForge automation map">
        ${Ue()}
        <div class="hf-chrome hf-top-left">
          <div class="hf-titlebar">
            <button class="hf-icon-btn" id="exitBtn" title="В меню" aria-label="В меню">←</button>
            <div>
              <span>HexForge</span>
              <strong>${Math.floor(e.automation)}% automation</strong>
            </div>
          </div>
          <div class="hf-metrics">
            <span><b>${o.cycle}</b><em>цикл</em></span>
            <span><b>${Math.round(o.powerMade*10)/10}/${Math.max(1,Math.round(o.powerNeed*10)/10)}</b><em>энергия</em></span>
            <span><b>${o.speed}x</b><em>скорость</em></span>
          </div>
          <div class="hf-progress" aria-label="Automation progress"><i style="width:${$(e.automation,0,100)}%"></i></div>
        </div>

        <div class="hf-chrome hf-top-right">
          <div class="hf-palette-head">
            <span>Постройки</span>
            <div class="hf-run">
              <button class="hf-small ${o.paused?"is-paused":""}" id="pauseBtn">${o.paused?"Run":"Pause"}</button>
              <button class="hf-small" id="speedBtn">${o.speed}x</button>
            </div>
          </div>
          <div class="hf-build-grid">${me.map(Ye).join("")}</div>
        </div>

        <div class="hf-chrome hf-left-rail">
          <span class="hf-panel-label">Склад</span>
          <div class="hf-res-grid">${Y.map(Ze).join("")}</div>
        </div>

        <div class="hf-chrome hf-inspector">
          ${Ve()}
        </div>

        <div class="hf-chrome hf-bots">
          <span class="hf-panel-label">Соперники</span>
          ${["aurora","zenith"].map(n=>Je(n)).join("")}
        </div>

        <div class="hf-chrome hf-objectives">
          ${m("Первая руда")}
          ${m("Плавка")}
          ${m("Сборка")}
          ${m("Наука")}
          ${m("Поток 100%")}
        </div>

        <div class="hf-chrome hf-feed">
          <div class="hf-feed-head">
            <span>${o.message}</span>
            <button class="hf-small" id="resetBtn">Reset</button>
          </div>
          ${o.events.slice(0,4).map(n=>`<p>${Qe(n)}</p>`).join("")}
        </div>

        <div class="hf-winner ${t==="player"&&e.automation>=100?"show":""}">
          <strong>Поток собран</strong>
          <span>Лаборатория вышла на 100% автоматизации.</span>
        </div>
      </section>
    </main>
  `}function Ue(){const e=ke(o.selected),t=o.selected==="belt"?Se():new Set;return`
    <svg class="hf-map" viewBox="0 0 ${j} ${F}" role="img" aria-label="hex automation board">
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#071015" flood-opacity=".22"/>
        </filter>
        <linearGradient id="beltMetal" x1="0" x2="1">
          <stop offset="0" stop-color="#6f7d84"/>
          <stop offset=".5" stop-color="#d7e0e4"/>
          <stop offset="1" stop-color="#536169"/>
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${j}" height="${F}" fill="#10171a"/>
      <path d="M0 100 C180 42 360 84 520 60 C760 24 940 70 1120 34 L1120 0 L0 0 Z" fill="#152126"/>
      <g class="hf-grid-lines">${o.edges.map(Ge).join("")}</g>
      <g class="hf-hexes">${o.hexes.map(n=>De(n,e.has(n.id))).join("")}</g>
      <g class="hf-belts">${o.edges.map(n=>Ae(n,t.has(n.id))).join("")}</g>
      <g class="hf-labels">${o.hexes.filter(n=>n.building).map(_e).join("")}</g>
    </svg>
  `}function Ge(e){return`<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="rgba(255,255,255,.045)" stroke-width="3" />`}function Ae(e,t){const n=e.owner?o.factions[e.owner].color:t?"#d9f99d":"transparent",r=e.owner?.92:t?.65:0,s=e.owner?12+e.level*2:10,l=e.owner?`${8+e.flow*12} 12`:"5 12";return`
    <g class="hf-edge ${t?"legal interactive":""}" data-edge="${e.id}">
      <line class="hf-edge-hit" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" />
      <line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${n}" stroke-width="${s}" stroke-linecap="round" opacity="${r}" />
      ${e.owner?`<line class="hf-flow" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="#f7fbff" stroke-width="3" stroke-linecap="round" stroke-dasharray="${l}" opacity=".72" />`:""}
    </g>
  `}function De(e,t){const n=v[e.deposit],r=e.owner?o.factions[e.owner]:null,s=ze(e.x,e.y,H).map(([S,de])=>`${S},${de}`).join(" "),l=o.inspectedHexId===e.id,a=["hf-tile",t?"legal":"",l?"selected":"",e.owner?"owned":""].filter(Boolean).join(" "),i=(r==null?void 0:r.color)??n.stroke;return`
    <g class="${a}" data-hex="${e.id}" style="--owner:${i}">
      <polygon points="${s}" fill="${n.fill}" stroke="${i}" stroke-width="${e.owner?4:2}" filter="url(#softShadow)" />
      <polygon points="${s}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1" />
      <text x="${e.x}" y="${e.y-15}" text-anchor="middle" class="hf-deposit">${n.label}</text>
      <text x="${e.x}" y="${e.y+8}" text-anchor="middle" class="hf-rich">×${e.richness}</text>
      ${t?`<circle cx="${e.x}" cy="${e.y}" r="35" fill="none" stroke="#d9f99d" stroke-width="3" stroke-dasharray="7 9" />`:""}
    </g>
  `}function _e(e){if(!e.building||!e.owner)return"";const t=f[e.building],n=o.factions[e.owner].color,r=e.lastRate>0?`+${e.lastRate.toFixed(1)}`:"idle";return`
    <g class="hf-building" data-hex="${e.id}">
      <rect x="${e.x-28}" y="${e.y-24}" width="56" height="48" rx="14" fill="#f7fbff" stroke="${n}" stroke-width="3" />
      <text x="${e.x}" y="${e.y-2}" text-anchor="middle" class="hf-building-mark">${t.mark}</text>
      <text x="${e.x}" y="${e.y+15}" text-anchor="middle" class="hf-building-rate">${e.level} · ${r}</text>
      ${e.progress>0?`<rect x="${e.x-22}" y="${e.y+21}" width="${44*(e.progress/100)}" height="4" rx="2" fill="${n}" />`:""}
    </g>
  `}function ze(e,t,n){const r=[];for(let s=0;s<6;s+=1){const l=Math.PI/180*(60*s-30);r.push([e+n*Math.cos(l),t+n*Math.sin(l)])}return r}function Ye(e){const t=o.selected===e;if(e==="belt")return`<button class="hf-build ${t?"active":""}" data-mode="belt"><b>CV</b><span>Конвейер</span><em>${ue(w)}</em></button>`;const n=f[e];return`<button class="hf-build ${t?"active":""}" data-mode="${e}"><b>${n.mark}</b><span>${n.label}</span><em>${n.hint}</em></button>`}function Ze(e){const t=Z[e],n=o.factions.player.storage[e]??0,r=n>=100?Math.floor(n).toString():n>=10?n.toFixed(0):n.toFixed(1);return`<div class="hf-res" style="--res:${t.color}"><b>${t.short}</b><span>${r}</span><em>${t.label}</em></div>`}function Ve(){const e=o.inspectedHexId?h(o.inspectedHexId):null;if(!e)return'<span class="hf-panel-label">Инспектор</span><strong>Выбери гекс</strong><p>Состояние узла появится здесь.</p>';const t=v[e.deposit],n=e.owner?o.factions[e.owner].label:"свободно",r=e.building?f[e.building]:null,s=e.building&&e.level<3?{ironPlate:2*e.level,gear:e.level,circuit:e.level>=2?1:0}:null;return`
    <span class="hf-panel-label">Инспектор</span>
    <div class="hf-inspector-main">
      <strong>${r?r.label:t.label}</strong>
      <em>${I(e.id)} · ${n}</em>
    </div>
    <div class="hf-inspector-grid">
      <span>Залежь <b>${t.label}</b></span>
      <span>Богатство <b>×${e.richness}</b></span>
      <span>Уровень <b>${e.level}</b></span>
      <span>Выход <b>${e.lastRate>0?e.lastRate.toFixed(2):"0"}</b></span>
    </div>
    <div class="hf-inspector-actions">
      <button class="hf-small" id="upgradeBtn" ${!e.building||e.owner!=="player"||e.level>=3?"disabled":""}>Upgrade</button>
      <button class="hf-small danger" id="demolishBtn" ${!e.building||e.owner!=="player"||e.building==="depot"?"disabled":""}>Clear</button>
    </div>
    ${s?`<p class="hf-costline">Upgrade: ${ue(s)}</p>`:""}
  `}function Je(e){const t=o.factions[e];return`
    <div class="hf-bot" style="--bot:${t.color}">
      <div><strong>${t.short}</strong><span>${t.plan}</span></div>
      <b>${Math.floor(t.automation)}%</b>
      <i style="width:${$(t.automation,0,100)}%"></i>
    </div>
  `}function m(e){const t=o.completed.includes(e);return`<span class="${t?"done":""}">${t?"✓":"·"} ${e}</span>`}function ue(e){return Object.entries(e).filter(([,t])=>(t??0)>0).map(([t,n])=>`${Z[t].short}${n}`).join(" ")}function Ke(){var e,t,n,r,s,l;d.querySelectorAll("[data-mode]").forEach(a=>{a.addEventListener("click",()=>se(a.dataset.mode))}),d.querySelectorAll("[data-hex]").forEach(a=>{a.addEventListener("click",()=>je(a.dataset.hex??""))}),d.querySelectorAll("[data-edge]").forEach(a=>{a.addEventListener("click",()=>Fe(a.dataset.edge??""))}),(e=d.querySelector("#pauseBtn"))==null||e.addEventListener("click",Le),(t=d.querySelector("#speedBtn"))==null||t.addEventListener("click",Te),(n=d.querySelector("#resetBtn"))==null||n.addEventListener("click",ae),(r=d.querySelector("#exitBtn"))==null||r.addEventListener("click",()=>{var a;(a=window.parent)==null||a.postMessage("hexland:exit","*")}),(s=d.querySelector("#upgradeBtn"))==null||s.addEventListener("click",()=>{const a=o.inspectedHexId?h(o.inspectedHexId):null;a&&Pe(a)}),(l=d.querySelector("#demolishBtn"))==null||l.addEventListener("click",()=>{const a=o.inspectedHexId?h(o.inspectedHexId):null;a&&Ee(a)})}function Xe(e){o.message=e,u()}function C(e){var t,n;try{(n=(t=c==null?void 0:c.HapticFeedback)==null?void 0:t.notificationOccurred)==null||n.call(t,e)}catch{}}function $(e,t,n){return Math.max(t,Math.min(n,e))}function Qe(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}Ne();u();le();window.HexForgeGame={snapshot:()=>o,reset:ae,tick:oe,setMode:se};
