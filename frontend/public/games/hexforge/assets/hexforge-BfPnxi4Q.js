import"./modulepreload-polyfill-B5Qt9EMX.js";const _=1120,Y=720,I=48,$e=548,we=360,$=3,xe=900,ve=[[1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1]],ne=["ironOre","copperOre","coal","stone","crude","ironPlate","copperPlate","gear","circuit","science"],re={ironOre:{label:"Железо",short:"Fe",color:"#9bb7c7"},copperOre:{label:"Медь",short:"Cu",color:"#f08a4b"},coal:{label:"Уголь",short:"Co",color:"#39424a"},stone:{label:"Камень",short:"St",color:"#b9aa86"},crude:{label:"Нефть",short:"Oil",color:"#6657d9"},ironPlate:{label:"Плиты Fe",short:"Fe+",color:"#d9e5ec"},copperPlate:{label:"Плиты Cu",short:"Cu+",color:"#ffb36c"},gear:{label:"Шестерни",short:"Gr",color:"#75d0e3"},circuit:{label:"Схемы",short:"Ci",color:"#53d681"},science:{label:"Наука",short:"Sc",color:"#ff637f"}},S={iron:{label:"железо",fill:"#7f8d98",stroke:"#c8d1da",resource:"ironOre"},copper:{label:"медь",fill:"#a75f39",stroke:"#ffc08d",resource:"copperOre"},coal:{label:"уголь",fill:"#2a2f32",stroke:"#7d858a",resource:"coal"},stone:{label:"камень",fill:"#786f63",stroke:"#d5c4a5",resource:"stone"},oil:{label:"нефть",fill:"#25284c",stroke:"#93a2ff",resource:"crude"},water:{label:"вода",fill:"#2d86a7",stroke:"#9ee7ff"},empty:{label:"плато",fill:"#59645a",stroke:"#b8c5ac"}},b={drill:{label:"Бур",mark:"DR",cost:{ironPlate:2,gear:1},hint:"руда"},pump:{label:"Помпа",mark:"PU",cost:{ironPlate:3,circuit:1},hint:"нефть/вода"},furnace:{label:"Печь",mark:"FU",cost:{stone:4,ironOre:2},hint:"плиты"},assembler:{label:"Сборщик",mark:"AS",cost:{ironPlate:4,gear:2,circuit:1},hint:"детали"},lab:{label:"Лаба",mark:"LA",cost:{ironPlate:5,copperPlate:4,gear:2,circuit:3},hint:"прогресс"},power:{label:"ТЭЦ",mark:"PW",cost:{stone:5,ironPlate:3},hint:"энергия"},solar:{label:"Солар",mark:"SO",cost:{copperPlate:3,circuit:2},hint:"энергия"},depot:{label:"Узел",mark:"DP",cost:{ironPlate:4,stone:4},hint:"склад"}},L={ironPlate:1,gear:1},ke=["belt","drill","pump","furnace","assembler","lab","power","solar","depot"],Re=["player","aurora","zenith"],oe="hexforge-save-v1",Se={iron:new URL(""+new URL("hf-hex-iron-uRSxb9uz.png",import.meta.url).href,import.meta.url).href,copper:new URL(""+new URL("hf-hex-copper-BsoFIGnB.png",import.meta.url).href,import.meta.url).href,coal:new URL(""+new URL("hf-hex-coal-CND1OK8w.png",import.meta.url).href,import.meta.url).href,stone:new URL(""+new URL("hf-hex-stone-Ckaf3Jkj.png",import.meta.url).href,import.meta.url).href,oil:new URL(""+new URL("hf-hex-oil-BKL41p9f.png",import.meta.url).href,import.meta.url).href,water:new URL(""+new URL("hf-hex-water-DYqBLNT_.png",import.meta.url).href,import.meta.url).href,empty:new URL(""+new URL("hf-hex-empty-Bd0tfdMe.png",import.meta.url).href,import.meta.url).href},Le={ironOre:new URL(""+new URL("hf-res-iron-ore-Date7Yf5.png",import.meta.url).href,import.meta.url).href,copperOre:new URL(""+new URL("hf-res-copper-ore-CjH7l94X.png",import.meta.url).href,import.meta.url).href,coal:new URL(""+new URL("hf-res-coal-BDaECg9_.png",import.meta.url).href,import.meta.url).href,stone:new URL(""+new URL("hf-res-stone-CtheRhEj.png",import.meta.url).href,import.meta.url).href,crude:new URL(""+new URL("hf-res-crude-fBocw5jm.png",import.meta.url).href,import.meta.url).href,ironPlate:new URL(""+new URL("hf-res-iron-plate-D5AAAUA9.png",import.meta.url).href,import.meta.url).href,copperPlate:new URL(""+new URL("hf-res-copper-plate-FKecWh5h.png",import.meta.url).href,import.meta.url).href,gear:new URL(""+new URL("hf-res-gear-BWdXuCHB.png",import.meta.url).href,import.meta.url).href,circuit:new URL(""+new URL("hf-res-circuit-BM327DH3.png",import.meta.url).href,import.meta.url).href,science:new URL(""+new URL("hf-res-science-DBGhSyT0.png",import.meta.url).href,import.meta.url).href},ae=document.querySelector("#hexforge");if(!ae)throw new Error("HexForge root is missing");const p=ae;var J;const u=(J=window.Telegram)==null?void 0:J.WebApp;var V,Q,W,ee,te;try{(V=u==null?void 0:u.ready)==null||V.call(u),(Q=u==null?void 0:u.expand)==null||Q.call(u),(W=u==null?void 0:u.disableVerticalSwipes)==null||W.call(u);const e=((ee=u==null?void 0:u.contentSafeAreaInset)==null?void 0:ee.top)??((te=u==null?void 0:u.safeAreaInset)==null?void 0:te.top)??0;document.documentElement.style.setProperty("--tg-content-safe-area-inset-top",`${Math.max(0,e)}px`)}catch{}let r=le(),k=null;function Z(e,t){return`${e},${t}`}function Oe(e){const[t,n]=e.split(",").map(Number);return[t??0,n??0]}function ie(e,t){return(Math.abs(e)+Math.abs(t)+Math.abs(e+t))/2}function Ee(e,t){return{x:$e+I*Math.sqrt(3)*(e+t/2),y:we+I*1.5*t}}function se(e,t){let n=e*92837111^t*689287499^2654435769;return n=(n^n>>>13)*1274126177,Math.abs(n^n>>>16)}function Ue(e,t){if(e===0&&t===0||e===-3&&t===1||e===3&&t===-1)return"empty";const n=se(e,t)%100,o=ie(e,t);return o>=3&&n<16?"oil":o>=3&&n>=16&&n<25?"water":n<22?"iron":n<42?"copper":n<60?"coal":n<78?"stone":"empty"}function P(){return Object.fromEntries(ne.map(e=>[e,0]))}function m(e,t,n){e[t]=Math.max(0,(e[t]??0)+n)}function le(){const e=[],t=new Map;for(let a=-$;a<=$;a+=1)for(let s=-$;s<=$;s+=1){if(ie(a,s)>$)continue;const l=Ee(a,s),i={id:Z(a,s),q:a,r:s,x:l.x,y:l.y,deposit:Ue(a,s),richness:1+se(a,s)%4,owner:null,building:null,level:1,progress:0,lastRate:0};e.push(i),t.set(i.id,i)}const n=[];for(const a of e)for(const[s,l]of ve.slice(0,3)){const i=t.get(Z(a.q+s,a.r+l));i&&n.push({id:ce(a.id,i.id),a:a.id,b:i.id,x1:a.x,y1:a.y,x2:i.x,y2:i.y,owner:null,level:1,flow:0})}const o={player:{id:"player",label:"Твой завод",short:"YOU",color:"#49b86f",storage:{...P(),ironOre:8,copperOre:5,coal:12,stone:8,ironPlate:8,copperPlate:4,gear:4,circuit:2},automation:0,plan:"Развернуть первую линию",lastAction:"Центральный узел запущен"},aurora:{id:"aurora",label:"Aurora Works",short:"AUR",color:"#58a6ff",storage:{...P(),ironPlate:10,gear:5,coal:8,stone:6},automation:8,plan:"Медь -> схемы",lastAction:"Готовит линию меди"},zenith:{id:"zenith",label:"Враг: Zenith Grid",short:"ВРАГ",color:"#ff5d4d",storage:{...P(),ironPlate:12,gear:6,coal:10,stone:7},automation:10,plan:"давит углём и энергией",lastAction:"Ставит бур у угля"}};return B(e,"player","0,0","depot"),B(e,"aurora","-3,1","depot"),B(e,"zenith","3,-1","depot"),X(n,"aurora","-3,1","-2,1"),X(n,"zenith","3,-1","2,-1"),{hexes:e,edges:n,factions:o,selected:"belt",inspectedHexId:"0,0",tutorialOpen:!0,paused:!1,speed:1,tick:0,cycle:1,powerMade:2,powerNeed:0,powerRatio:1,message:"Поставь конвейер от центрального узла к ближайшей залежи.",events:["Смена открыта: центральный узел принимает ресурсы","Aurora и Zenith уже разворачивают линии"],completed:[]}}function B(e,t,n,o){const a=e.find(s=>s.id===n);a&&(a.owner=t,a.building=o,a.level=1)}function X(e,t,n,o){const a=e.find(s=>s.id===ce(n,o));a&&(a.owner=t,a.flow=.5)}function ce(e,t){return[e,t].sort().join("|")}function h(e){return r.hexes.find(t=>t.id===e)}function Pe(e){return r.edges.find(t=>t.id===e)}function T(e){return r.edges.filter(t=>t.a===e||t.b===e)}function O(e){const t=r.hexes.filter(a=>a.owner===e&&a.building==="depot").map(a=>a.id),n=new Set(t),o=[...t];for(;o.length;){const a=o.shift();if(a)for(const s of T(a)){if(s.owner!==e)continue;const l=s.a===a?s.b:s.a;n.has(l)||(n.add(l),o.push(l))}}return n}function E(e,t){const n=r.factions[e].storage;return Object.entries(t).every(([o,a])=>(n[o]??0)>=(a??0))}function D(e,t){const n=r.factions[e].storage;for(const[o,a]of Object.entries(t))n[o]-=a??0}function F(e,t){if(e.owner||!E(t,L))return!1;const n=O(t);return n.has(e.a)||n.has(e.b)}function Be(e,t){return t.building&&t.owner==="player"?!1:e==="drill"?["iron","copper","coal","stone"].includes(t.deposit):e==="pump"?t.deposit==="oil"||t.deposit==="water":t.deposit!=="water"}function v(e,t,n){if(e.owner&&e.owner!==n||!Be(t,e)||!E(n,b[t].cost))return!1;const o=O(n);return o.has(e.id)?!0:T(e.id).some(a=>a.owner===n&&(o.has(a.a)||o.has(a.b)))}function Me(e){return e==="belt"?new Set:new Set(r.hexes.filter(t=>v(t,e,"player")).map(t=>t.id))}function He(){return new Set(r.edges.filter(e=>F(e,"player")).map(e=>e.id))}function ue(e,t){return F(e,t)?(D(t,L),e.owner=t,e.level=1,e.flow=.35,g(t,`${r.factions[t].short}: конвейер ${C(e.a)} -> ${C(e.b)}`),t==="player"&&(r.message="Линия подключена. Теперь ставь добычу или переработку на подсвеченный гекс."),!0):!1}function de(e,t,n){return v(e,t,n)?(D(n,b[t].cost),e.owner=n,e.building=t,e.level=1,e.progress=0,e.lastRate=0,r.inspectedHexId=e.id,g(n,`${r.factions[n].short}: ${b[t].label} на ${S[e.deposit].label}`),n==="player"&&(t!=="depot"&&(r.selected="belt"),r.message=pe(),z("success")),!0):!1}function Ie(e){if(e.owner!=="player"||!e.building||e.level>=3)return;const t={ironPlate:2*e.level,gear:1*e.level,circuit:e.level>=2?1:0};if(!E("player",t)){dt("Не хватает деталей на апгрейд");return}D("player",t),e.level+=1,g("player",`YOU: ${b[e.building].label} уровень ${e.level}`),r.message="Апгрейд применён. Линия стала плотнее.",d()}function Ce(e){e.owner!=="player"||e.building==="depot"||(e.owner=null,e.building=null,e.level=1,e.progress=0,e.lastRate=0,r.inspectedHexId=null,g("player","YOU: площадка очищена"),d())}function g(e,t){const n=e==="player"?"●":e==="aurora"?"◆":"▲";r.events.unshift(`${n} ${t}`),r.events=r.events.slice(0,9),r.factions[e].lastAction=t.replace(/^.*?:\s*/,"")}function C(e){const[t,n]=Oe(e);return`${t}:${n}`}function fe(){if(r.paused)return;const e=r.speed;for(let t=0;t<e;t+=1)r.tick+=1,r.tick%8===0&&(r.cycle+=1),M("player"),M("aurora"),M("zenith"),r.tick%5===0&&K("aurora"),r.tick%7===0&&K("zenith"),qe();d()}function M(e){const t=r.factions[e],n=O(e),o=r.hexes.filter(i=>i.owner===e&&i.building&&n.has(i.id));let a=2,s=0;for(const i of o)i.lastRate=0,i.building==="solar"&&(a+=1.4*i.level),i.building==="power"&&t.storage.coal>=.18&&(t.storage.coal-=.18,a+=4.2*i.level),i.building&&!["depot","solar","power"].includes(i.building)&&(s+=i.building==="lab"?1.8:1);const l=s>0?Math.min(1,a/s):1;e==="player"&&(r.powerMade=a,r.powerNeed=s,r.powerRatio=l);for(const i of o)i.building&&je(i,t,l);e!=="player"&&(t.automation=x(t.automation+ze(e),0,100));for(const i of r.edges)i.owner===e&&(i.flow=x(.18+Math.sin((r.tick+i.x1+i.y1)/8)*.14+l*.48,.08,1))}function je(e,t,n){const o=e.level*n;switch(e.building){case"drill":{const a=S[e.deposit].resource;if(!a||e.deposit==="oil")return;const s=(.18+e.richness*.045)*o;m(t.storage,a,s),e.lastRate=s;break}case"pump":{if(e.deposit!=="oil")return;const a=(.12+e.richness*.035)*o;m(t.storage,"crude",a),e.lastRate=a;break}case"furnace":e.lastRate=Te(e,t.storage,o);break;case"assembler":e.lastRate=De(e,t.storage,o);break;case"lab":e.lastRate=Fe(e,t,o);break}}function Te(e,t,n){const a=t.ironPlate<t.copperPlate+8||t.ironOre>t.copperOre?"iron":"copper",s=a==="iron"?"ironOre":"copperOre",l=a==="iron"?"ironPlate":"copperPlate",i=.16*n;return t[s]<i||t.coal<i*.35?0:(t[s]-=i,t.coal-=i*.35,m(t,l,i*.86),e.progress=(e.progress+i*12)%100,i*.86)}function De(e,t,n){const o=.12*n;return t.gear>=6&&t.circuit>=4&&t.copperPlate>=2?(t.gear-=o,t.circuit-=o*.65,t.copperPlate-=o*.45,m(t,"science",o*.55),e.progress=(e.progress+o*16)%100,o*.55):t.ironPlate>=o*2&&t.copperPlate>=o?(t.ironPlate-=o*.85,t.copperPlate-=o*.75,m(t,"circuit",o*.7),e.progress=(e.progress+o*12)%100,o*.7):t.ironPlate>=o*1.4?(t.ironPlate-=o*1.4,m(t,"gear",o),e.progress=(e.progress+o*10)%100,o):0}function Fe(e,t,n){const o=.13*n;return t.storage.science<o?0:(t.storage.science-=o,t.automation=x(t.automation+o*2.7,0,100),e.progress=(e.progress+o*20)%100,o)}function ze(e){return .012+r.hexes.filter(n=>n.owner===e&&n.building&&n.building!=="depot").length*.004}function K(e){const t=r.factions[e];e==="zenith"&&r.tick>0&&r.tick%21===0&&(t.plan="ускоряет поток",t.automation>=r.factions.player.automation+6&&(r.message="Zenith обгоняет темпом: ставь печь, сборщик или лабу ближе к сети.",g("zenith","ВРАГ: ускоряет автоматизацию")));const n=O(e),o=r.edges.filter(l=>!l.owner&&(n.has(l.a)||n.has(l.b)));if(o.length&&E(e,L)){const l=Ae(o,e);ue(l,e),t.plan=e==="aurora"?"добирает медь":"режет карту углём";return}const a=r.hexes.filter(l=>l.owner&&l.owner!==e?!1:T(l.id).some(i=>i.owner===e&&(n.has(i.a)||n.has(i.b)))),s=e==="aurora"?["drill","furnace","assembler","lab","solar","power"]:["drill","power","furnace","assembler","lab","solar"];for(const l of s){const i=a.find(f=>v(f,l,e));if(i){de(i,l,e),t.plan=e==="zenith"&&l==="lab"?"гонится к победе":l==="lab"?"наука":`${b[l].label.toLowerCase()} линия`;return}}m(t.storage,"ironPlate",.45),m(t.storage,"gear",.18),e==="zenith"&&m(t.storage,"coal",.12),t.lastAction=e==="zenith"?"копит детали для рывка":"копит детали"}function Ae(e,t){const n=t==="aurora"?["copper","iron","coal","stone","oil"]:["coal","iron","stone","copper","oil"];return[...e].sort((o,a)=>{const s=R(o,n),l=R(a,n);return s-l||o.id.localeCompare(a.id)})[0]??e[0]}function R(e,t){const n=h(e.a),o=h(e.b);return Math.min(t.indexOf((n==null?void 0:n.deposit)??"empty"),t.indexOf((o==null?void 0:o.deposit)??"empty"))}function qe(){const e=r.factions.player.storage,t=[["Первая руда",e.ironOre+e.copperOre>=25],["Плавка",e.ironPlate+e.copperPlate>=16],["Сборка",e.gear>=8||e.circuit>=5],["Наука",e.science>=3||r.factions.player.automation>=10],["Поток 100%",r.factions.player.automation>=100]];for(const[n,o]of t)!o||r.completed.includes(n)||(r.completed.push(n),g("player",`YOU: закрыта цель «${n}»`),n!=="Поток 100%"&&(r.message=pe()))}function pe(){const e=r.factions.player.storage,t=r.hexes.filter(n=>n.owner==="player"&&n.building).map(n=>n.building);return r.edges.some(n=>n.owner==="player")?t.includes("drill")?t.includes("furnace")?t.includes("assembler")?t.includes("lab")?e.coal<3&&r.powerRatio<.75?"Энергии мало: добавь ТЭЦ или солар.":"Расширяй линии и гони поток к 100%.":"Подключи лабораторию: она превращает науку в прогресс.":"Протяни линию к сборщику для шестерён, схем и науки.":"Протяни площадку под печь: руда начнёт превращаться в плиты.":"Поставь бур на железо, медь, уголь или камень.":"Протяни конвейер от узла к залежи."}function Ge(){return new Set(r.hexes.filter(e=>e.owner==="player"&&e.building).map(e=>e.building).filter(e=>!!e))}function H(e){return r.hexes.some(t=>v(t,e,"player"))}function U(){const e=Ge(),t=r.edges.some(o=>o.owner==="player"),n=6;return t?e.has("drill")?e.has("furnace")?e.has("assembler")?e.has("lab")?{index:6,total:n,title:"Держи поток",body:"Теперь расширяй сеть, следи за энергией и не дай Zenith быстрее собрать 100%.",mode:"belt",cta:"Свободный режим",done:!0}:H("lab")?{index:5,total:n,title:"Подключи лабораторию",body:"Лаба ест науку и поднимает automation. Это твой путь к победе в потоке.",mode:"lab",cta:"Лаба",done:!1}:{index:5,total:n,title:"Выведи линию к лабе",body:"Лаборатории нужен свой подключённый гекс. Добавь конвейер от текущей сети.",mode:"belt",cta:"Конвейер",done:!1}:H("assembler")?{index:4,total:n,title:"Собери детали",body:"Сборщик превращает плиты в шестерни, схемы и первые научные пакеты.",mode:"assembler",cta:"Сборщик",done:!1}:{index:4,total:n,title:"Расширь сеть",body:"Сборщик ставится на свободную подключённую площадку. Протяни ещё один конвейер.",mode:"belt",cta:"Конвейер",done:!1}:H("furnace")?{index:3,total:n,title:"Запусти плавку",body:"Теперь выбери подсвеченную площадку под печь: руда начнёт превращаться в плиты.",mode:"furnace",cta:"Печь",done:!1}:{index:3,total:n,title:"Подведи площадку",body:"Печь нужна рядом с сетью. Протяни конвейер к свободному гексу, потом поставь печь.",mode:"belt",cta:"Конвейер",done:!1}:{index:2,total:n,title:"Поставь добычу",body:"Выбери бур и нажми подсвеченный гекс с железом, медью, углём или камнем.",mode:"drill",cta:"Бур",done:!1}:{index:1,total:n,title:"Протяни первую линию",body:"Выбран конвейер. Жми светящееся ребро от центрального узла к ближайшей залежи.",mode:"belt",cta:"Конвейер",done:!1}}function Ne(){if(!r.tutorialOpen)return'<button class="hf-chrome hf-tutorial-reopen" id="tutorialReopen" title="Обучение" aria-label="Открыть обучение">?</button>';const e=U();return`
    <div class="hf-chrome hf-tutorial ${e.done?"done":""}">
      <span>Обучение ${e.index}/${e.total}</span>
      <strong>${e.title}</strong>
      <p>${e.body}</p>
      <div>
        <button class="hf-small" id="tutorialAction">${e.cta}</button>
        <button class="hf-small" id="tutorialClose">${e.done?"Готово":"Скрыть"}</button>
      </div>
    </div>
  `}function _e(){var a;if(!r.tutorialOpen)return null;const e=U();if(e.mode!=="belt")return null;const t=r.edges.filter(s=>F(s,"player"));if(!t.length)return null;const o=e.index===1?["iron","copper","coal","stone","oil","empty","water"]:["empty","stone","iron","copper","coal","oil","water"];return((a=[...t].sort((s,l)=>{var A,q,G,N;const i=R(s,o),f=R(l,o);if(i!==f)return i-f;const c=Math.max(((A=h(s.a))==null?void 0:A.richness)??0,((q=h(s.b))==null?void 0:q.richness)??0);return Math.max(((G=h(l.a))==null?void 0:G.richness)??0,((N=h(l.b))==null?void 0:N.richness)??0)-c||s.id.localeCompare(l.id)})[0])==null?void 0:a.id)??null}function Ye(){var l;if(!r.tutorialOpen)return null;const e=U();if(e.mode==="belt")return null;const t=e.mode,n=r.hexes.filter(i=>v(i,t,"player"));if(!n.length)return null;const s=t==="drill"?["iron","copper","coal","stone","oil","empty","water"]:["empty","stone","iron","copper","coal","oil","water"];return((l=[...n].sort((i,f)=>{const c=s.indexOf(i.deposit),y=s.indexOf(f.deposit);return c!==y?c-y:f.richness-i.richness||i.id.localeCompare(f.id)})[0])==null?void 0:l.id)??null}function Ze(e){const t=h(e);t&&(r.inspectedHexId=e,r.selected!=="belt"&&(de(t,r.selected,"player")||(r.message=t.owner&&t.owner!=="player"?"Гекс занят соперником.":"Нужны ресурсы, подключение или совместимая залежь.",z("warning"))),d())}function Xe(e){const t=Pe(e);if(t){if(r.selected!=="belt"){r.message="Для рёбер выбери конвейер.",d();return}ue(t,"player")||(r.message="Конвейер строится только от твоей сети и при наличии деталей.",z("warning")),d()}}function j(e){r.selected=e,r.message=e==="belt"?"Подсвечены рёбра, куда можно тянуть конвейер.":`${b[e].label}: подсвечены подходящие гексы.`,d()}function he(){ge(),r=le(),me(),be(),d()}function Ke(){r.paused=!r.paused,d()}function Je(){r.speed=r.speed===1?2:r.speed===2?4:1,d()}function me(){try{localStorage.setItem(oe,JSON.stringify(r))}catch{}}function Ve(){var e;try{const t=localStorage.getItem(oe);if(!t)return!1;const n=JSON.parse(t);return!Array.isArray(n.hexes)||!Array.isArray(n.edges)||!((e=n.factions)!=null&&e.player)?!1:(typeof n.tutorialOpen!="boolean"&&(n.tutorialOpen=!0),n.factions.zenith&&(n.factions.zenith.label="Враг: Zenith Grid",n.factions.zenith.short="ВРАГ",n.factions.zenith.color="#ff5d4d"),r=n,!0)}catch{return!1}}function be(){ge(),k=window.setInterval(()=>{fe(),r.tick%4===0&&me()},xe)}function ge(){k!==null&&window.clearInterval(k),k=null}function d(){p.innerHTML=Qe(),ut()}function Qe(){const e=r.factions.player,t=r.factions.zenith,n=[...Re].sort((o,a)=>r.factions[a].automation-r.factions[o].automation)[0];return`
    <main class="hf-stage">
      <section class="hf-map-shell" aria-label="HexForge automation map">
        ${We()}
        <div class="hf-chrome hf-top-left">
          <div class="hf-titlebar">
            <button class="hf-icon-btn" id="exitBtn" title="В меню" aria-label="В меню">←</button>
            <div>
              <span>HexForge</span>
              <strong>${Math.floor(e.automation)}% automation</strong>
            </div>
          </div>
          <div class="hf-metrics">
            <span><b>${r.cycle}</b><em>цикл</em></span>
            <span><b>${Math.round(r.powerMade*10)/10}/${Math.max(1,Math.round(r.powerNeed*10)/10)}</b><em>энергия</em></span>
            <span><b>${r.speed}x</b><em>скорость</em></span>
            <span class="enemy"><b>${Math.floor(t.automation)}%</b><em>враг</em></span>
          </div>
          <div class="hf-progress" aria-label="Automation progress"><i style="width:${x(e.automation,0,100)}%"></i></div>
        </div>

        <div class="hf-chrome hf-top-right">
          <div class="hf-palette-head">
            <span>Постройки</span>
            <div class="hf-run">
              <button class="hf-small ${r.paused?"is-paused":""}" id="pauseBtn">${r.paused?"Run":"Pause"}</button>
              <button class="hf-small" id="speedBtn">${r.speed}x</button>
            </div>
          </div>
          <div class="hf-build-grid">${ke.map(it).join("")}</div>
        </div>

        <div class="hf-chrome hf-left-rail">
          <span class="hf-panel-label">Склад</span>
          <div class="hf-res-grid">${ne.map(st).join("")}</div>
        </div>

        <div class="hf-chrome hf-inspector">
          ${lt()}
        </div>

        <div class="hf-chrome hf-bots">
          <span class="hf-panel-label">Соперники</span>
          ${["aurora","zenith"].map(o=>ct(o)).join("")}
        </div>

        <div class="hf-chrome hf-objectives">
          ${w("Первая руда")}
          ${w("Плавка")}
          ${w("Сборка")}
          ${w("Наука")}
          ${w("Поток 100%")}
        </div>

        ${Ne()}

        <div class="hf-chrome hf-feed">
          <div class="hf-feed-head">
            <span>${r.message}</span>
            <button class="hf-small" id="resetBtn">Reset</button>
          </div>
          ${r.events.slice(0,4).map(o=>`<p>${ft(o)}</p>`).join("")}
        </div>

        <div class="hf-winner ${n==="player"&&e.automation>=100?"show":""}">
          <strong>Поток собран</strong>
          <span>Лаборатория вышла на 100% автоматизации.</span>
        </div>
      </section>
    </main>
  `}function We(){const e=Me(r.selected),t=r.selected==="belt"?He():new Set,n=Ye(),o=_e();return`
    <svg class="hf-map" viewBox="0 0 ${_} ${Y}" role="img" aria-label="hex automation board">
      <defs>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#071015" flood-opacity=".22"/>
        </filter>
        <linearGradient id="beltMetal" x1="0" x2="1">
          <stop offset="0" stop-color="#6f7d84"/>
          <stop offset=".5" stop-color="#d7e0e4"/>
          <stop offset="1" stop-color="#536169"/>
        </linearGradient>
        ${et()}
      </defs>
      <rect x="0" y="0" width="${_}" height="${Y}" fill="#0c1719"/>
      <path d="M0 100 C180 42 360 84 520 60 C760 24 940 70 1120 34 L1120 0 L0 0 Z" fill="#17343b"/>
      <g class="hf-grid-lines">${r.edges.map(tt).join("")}</g>
      <g class="hf-hexes">${r.hexes.map(a=>rt(a,e.has(a.id),n===a.id)).join("")}</g>
      <g class="hf-belts">${r.edges.map(a=>nt(a,t.has(a.id),o===a.id)).join("")}</g>
      <g class="hf-labels">${r.hexes.filter(a=>a.building).map(ot).join("")}</g>
    </svg>
  `}function et(){return Object.entries(Se).map(([e,t],n)=>`
      <pattern id="tex-${e}" patternUnits="userSpaceOnUse" width="172" height="172" patternTransform="rotate(${n%2?-9:13})">
        <image href="${t}" x="0" y="0" width="172" height="172" preserveAspectRatio="xMidYMid slice"/>
      </pattern>
    `).join("")}function tt(e){return`<line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="rgba(255,255,255,.045)" stroke-width="3" />`}function nt(e,t,n){const o=e.owner?r.factions[e.owner].color:t?"#d9f99d":"transparent",a=e.owner?.92:t?.65:0,s=e.owner?12+e.level*2:10,l=e.owner?`${8+e.flow*12} 12`:"5 12";return`
    <g class="hf-edge ${t?"legal interactive":""} ${n?"recommended":""}" data-edge="${e.id}">
      <line class="hf-edge-hit" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" />
      ${n&&!e.owner?`<line class="hf-recommend-line" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" />`:""}
      <line x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="${o}" stroke-width="${s}" stroke-linecap="round" opacity="${a}" />
      ${e.owner?`<line class="hf-flow" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" stroke="#f7fbff" stroke-width="3" stroke-linecap="round" stroke-dasharray="${l}" opacity=".72" />`:""}
    </g>
  `}function rt(e,t,n){const o=S[e.deposit],a=e.owner?r.factions[e.owner]:null,s=at(e.x,e.y,I).map(([c,y])=>`${c},${y}`).join(" "),l=r.inspectedHexId===e.id,i=["hf-tile",t?"legal":"",n?"recommended":"",l?"selected":"",e.owner?"owned":""].filter(Boolean).join(" "),f=(a==null?void 0:a.color)??o.stroke;return`
    <g class="${i}" data-hex="${e.id}" style="--owner:${f}">
      <polygon points="${s}" fill="url(#tex-${e.deposit})" stroke="${f}" stroke-width="${e.owner?4:2}" filter="url(#softShadow)" />
      <polygon points="${s}" fill="${o.fill}" opacity=".24" stroke="rgba(255,255,255,.24)" stroke-width="1" />
      <polygon points="${s}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1" />
      <text x="${e.x}" y="${e.y-15}" text-anchor="middle" class="hf-deposit">${o.label}</text>
      <text x="${e.x}" y="${e.y+8}" text-anchor="middle" class="hf-rich">×${e.richness}</text>
      ${t?`<circle cx="${e.x}" cy="${e.y}" r="35" fill="none" stroke="#d9f99d" stroke-width="3" stroke-dasharray="7 9" />`:""}
      ${n?`<circle class="hf-recommend-ring" cx="${e.x}" cy="${e.y}" r="42" fill="none" />`:""}
    </g>
  `}function ot(e){if(!e.building||!e.owner)return"";const t=b[e.building],n=r.factions[e.owner].color,o=e.lastRate>0?`+${e.lastRate.toFixed(1)}`:"idle";return`
    <g class="hf-building" data-hex="${e.id}">
      <rect x="${e.x-28}" y="${e.y-24}" width="56" height="48" rx="14" fill="#f7fbff" stroke="${n}" stroke-width="3" />
      <text x="${e.x}" y="${e.y-2}" text-anchor="middle" class="hf-building-mark">${t.mark}</text>
      <text x="${e.x}" y="${e.y+15}" text-anchor="middle" class="hf-building-rate">${e.level} · ${o}</text>
      ${e.progress>0?`<rect x="${e.x-22}" y="${e.y+21}" width="${44*(e.progress/100)}" height="4" rx="2" fill="${n}" />`:""}
    </g>
  `}function at(e,t,n){const o=[];for(let a=0;a<6;a+=1){const s=Math.PI/180*(60*a-30);o.push([e+n*Math.cos(s),t+n*Math.sin(s)])}return o}function it(e){const t=r.selected===e;if(e==="belt")return`<button class="hf-build ${t?"active":""}" data-mode="belt"><b>CV</b><span>Конвейер</span><em>${ye(L)}</em></button>`;const n=b[e];return`<button class="hf-build ${t?"active":""}" data-mode="${e}"><b>${n.mark}</b><span>${n.label}</span><em>${n.hint}</em></button>`}function st(e){const t=re[e],n=r.factions.player.storage[e]??0,o=n>=100?Math.floor(n).toString():n>=10?n.toFixed(0):n.toFixed(1);return`<div class="hf-res" style="--res:${t.color}; --res-texture:url('${Le[e]}')"><b>${t.short}</b><span>${o}</span><em>${t.label}</em></div>`}function lt(){const e=r.inspectedHexId?h(r.inspectedHexId):null;if(!e)return'<span class="hf-panel-label">Инспектор</span><strong>Выбери гекс</strong><p>Состояние узла появится здесь.</p>';const t=S[e.deposit],n=e.owner?r.factions[e.owner].label:"свободно",o=e.building?b[e.building]:null,a=e.building&&e.level<3?{ironPlate:2*e.level,gear:e.level,circuit:e.level>=2?1:0}:null;return`
    <span class="hf-panel-label">Инспектор</span>
    <div class="hf-inspector-main">
      <strong>${o?o.label:t.label}</strong>
      <em>${C(e.id)} · ${n}</em>
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
    ${a?`<p class="hf-costline">Upgrade: ${ye(a)}</p>`:""}
  `}function ct(e){const t=r.factions[e],n=e==="zenith";return`
    <div class="hf-bot ${n?"enemy":""}" style="--bot:${t.color}">
      <div><strong>${t.short}</strong><span>${n?t.label.replace("Враг: ",""):t.plan}</span></div>
      <b>${Math.floor(t.automation)}%</b>
      <i style="width:${x(t.automation,0,100)}%"></i>
    </div>
  `}function w(e){const t=r.completed.includes(e);return`<span class="${t?"done":""}">${t?"✓":"·"} ${e}</span>`}function ye(e){return Object.entries(e).filter(([,t])=>(t??0)>0).map(([t,n])=>`${re[t].short}${n}`).join(" ")}function ut(){var e,t,n,o,a,s,l,i,f;p.querySelectorAll("[data-mode]").forEach(c=>{c.addEventListener("click",()=>j(c.dataset.mode))}),p.querySelectorAll("[data-hex]").forEach(c=>{c.addEventListener("click",()=>Ze(c.dataset.hex??""))}),p.querySelectorAll("[data-edge]").forEach(c=>{c.addEventListener("click",()=>Xe(c.dataset.edge??""))}),(e=p.querySelector("#pauseBtn"))==null||e.addEventListener("click",Ke),(t=p.querySelector("#speedBtn"))==null||t.addEventListener("click",Je),(n=p.querySelector("#resetBtn"))==null||n.addEventListener("click",he),(o=p.querySelector("#tutorialAction"))==null||o.addEventListener("click",()=>{const c=U();if(c.done){r.tutorialOpen=!1,d();return}j(c.mode)}),(a=p.querySelector("#tutorialClose"))==null||a.addEventListener("click",()=>{r.tutorialOpen=!1,d()}),(s=p.querySelector("#tutorialReopen"))==null||s.addEventListener("click",()=>{r.tutorialOpen=!0,d()}),(l=p.querySelector("#exitBtn"))==null||l.addEventListener("click",()=>{var c;(c=window.parent)==null||c.postMessage("hexland:exit","*")}),(i=p.querySelector("#upgradeBtn"))==null||i.addEventListener("click",()=>{const c=r.inspectedHexId?h(r.inspectedHexId):null;c&&Ie(c)}),(f=p.querySelector("#demolishBtn"))==null||f.addEventListener("click",()=>{const c=r.inspectedHexId?h(r.inspectedHexId):null;c&&Ce(c)})}function dt(e){r.message=e,d()}function z(e){var t,n;try{(n=(t=u==null?void 0:u.HapticFeedback)==null?void 0:t.notificationOccurred)==null||n.call(t,e)}catch{}}function x(e,t,n){return Math.max(t,Math.min(n,e))}function ft(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}Ve();d();be();window.HexForgeGame={snapshot:()=>r,reset:he,tick:fe,setMode:j};
