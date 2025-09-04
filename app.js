import {  
  auth, db, onAuthStateChanged, signOut, updatePassword, colUsuarios, colRelatorios, colRelatoriosMensais,
  addDoc, setDoc, getDoc, doc, query, where, getDocs, serverTimestamp, deleteDoc  
} from './firebase.js';

const ADMINS = new Set(['12','6266','1778']);

function isAdminUser(){ 
  try{ 
    if(window.CURRENT_USER){ 
      return !!(CURRENT_USER.isAdmin || ADMINS.has(CURRENT_USER.matricula)); 
    } 
  }catch(e){} 
  return ADMINS.has(window.currentUserMatricula || ''); 
}

function todayIso(){ return new Date().toISOString().slice(0,10); }
function toBR(dateStr){ if(!dateStr) return ''; const parts = dateStr.split('-'); return `${parts[2]}/${parts[1]}/${parts[0]}`; }
function formatTimeFromTimestamp(ts){
  if(!ts) return '';
  try{
    if(typeof ts.toDate === 'function') ts = ts.toDate();
    const d = new Date(ts);
    return d.toLocaleTimeString('pt-BR',{hour12:false});
  }catch(e){ return ''; }
}

function prefixBadgeHtml(prefix){
  const n = parseInt(prefix,10);
  let cls='prefix-default', label=prefix;
  if(n>=55001 && n<=55184){ cls='prefix-green-flag'; }
  else if(n>=55185 && n<=55363){ cls='prefix-red'; }
  else if(n>=55364 && n<=55559){ cls='prefix-blue'; }
  else if(n>=55900){ cls='prefix-purple'; }
  return `<span class="prefix-badge ${cls}">${label}</span>`;
}

function horaBadgeHtml(horaStr){
  if(!horaStr) return horaStr;
  const [h] = horaStr.split(':').map(x=>parseInt(x,10));
  let cls='badge-default';
  if(h>=6 && h<12) cls='badge-azul-bebe';
  else if(h>=12 && h<18) cls='badge-laranja-claro';
  else if(h>=18 && h<=23) cls='badge-azul-escuro';
  else cls='badge-roxo';
  return `<span class="${cls}">${horaStr}</span>`;
}

let CURRENT_USER = null;
onAuthStateChanged(auth, async (user)=>{
  if(!user){ location.href='index.html'; return; }
  const snap = await getDoc(doc(colUsuarios, user.uid));
  if(snap.exists()){ CURRENT_USER = snap.data(); }
  else { CURRENT_USER = { matricula: user.email.split('@')[0], isAdmin: ADMINS.has(user.email.split('@')[0]) }; }

  document.getElementById('btnLogout').addEventListener('click', ()=> signOut(auth));
  document.getElementById('btnChangePwd').addEventListener('click', changePasswordHandler);

  await loadWeekly();
  await loadMonthlyTotals();
});

async function changePasswordHandler(){
  const nova = prompt('Digite a nova senha (mín 6 caracteres):');
  if(!nova) return;
  try{
    await updatePassword(auth.currentUser, nova);
    alert('Senha alterada com sucesso');
  }catch(err){
    alert('Erro ao alterar senha: ' + err.message);
  }
}

function getWeekBounds(date){
  const d = new Date(date);
  const day = (d.getDay()+6)%7; 
  const monday = new Date(d); monday.setDate(d.getDate()-day);
  const sunday = new Date(monday); sunday.setDate(monday.getDate()+6);
  const toISO = (x)=> x.toISOString().slice(0,10);
  return { from: toISO(monday), to: toISO(sunday) };
}

let lastWeekRows = [];

async function loadWeekly(){
  const tbody = document.querySelector('#tabelaSemanal tbody');
  tbody.innerHTML = '';
  const { from, to } = getWeekBounds(new Date());
  const q1 = query(colRelatorios, where('data','>=',from), where('data','<=',to));
  const snap = await getDocs(q1);
  const rows = [];
  snap.forEach(docsnap=>{
    const d = docsnap.data();
    const created = d.created_at ? (typeof d.created_at.toDate === 'function' ? d.created_at.toDate() : new Date(d.created_at)) : new Date();
    rows.push({ id: docsnap.id, data: d.data, hora: formatTimeFromTimestamp(created), prefixo: d.prefixo, tipo: d.tipo, user: d.user_matricula });
  });
  rows.sort((a,b)=> (a.data+a.hora).localeCompare(b.data+b.hora));
  lastWeekRows = rows;

  for(const r of rows){
    const dateBR = toBR(r.data);
    const prefHTML = prefixBadgeHtml(r.prefixo);
    const horaHTML = horaBadgeHtml(r.hora);
    const tipoHTML = r.tipo === 'Lavagem Simples' ? '<span class="badge badge-yellow">Simples</span>' : 
                     (r.tipo==='Higienização'?'<span class="badge badge-lightgreen">Higienização</span>':'<span class="badge badge-pink">Exceções</span>');
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${dateBR}</td><td>${horaHTML}</td><td>${prefHTML}</td><td>${tipoHTML}</td><td>${r.user}</td>`;
    
    if(isAdminUser()){
      const tdAction = document.createElement('td');
      tdAction.innerHTML = `<button class="btn-delete" data-id="${r.id}">🗑️</button>`;
      tr.appendChild(tdAction);
    } else {
      tr.innerHTML += `<td>-</td>`;
    }
    tbody.appendChild(tr);
  }

  if(isAdminUser()){
    tbody.querySelectorAll('.btn-delete').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.target.getAttribute('data-id');
        if(confirm('Deseja excluir este lançamento?')){
          await deleteDoc(doc(colRelatorios, id));
          await loadWeekly();
        }
      });
    });
  }
}

async function loadMonthlyTotals(){
  const ym = new Date().toISOString().slice(0,7);
  const q1 = query(colRelatoriosMensais, where('ym','==', ym));
  const snap = await getDocs(q1);
  let simples=0,hig=0,exc=0;
  snap.forEach(d=>{
    const t = d.data().tipo;
    if(t==='Lavagem Simples') simples++;
    else if(t==='Higienização') hig++;
    else exc++;
  });
  document.getElementById('cntSimples').textContent = simples;
  document.getElementById('cntHig').textContent = hig;
  document.getElementById('cntExc').textContent = exc;
}

// Exportações PDF/Excel
document.getElementById('btnWeeklyPdf')?.addEventListener('click', ()=> exportTableToPDF('#tabelaSemanal', 'relatorio-semanal.pdf'));
document.getElementById('btnWeeklyExcel')?.addEventListener('click', ()=> exportTableToExcel('#tabelaSemanal', 'relatorio-semanal.xlsx'));

async function exportTableToPDF(tableSelector, filename){
  const el = document.querySelector(tableSelector);
  if(!el) return;
  const { jsPDF } = window.jspdf;
  const canvas = await html2canvas(el);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgWidth = pageWidth - 40;
  const imgHeight = canvas.height * imgWidth / canvas.width;
  pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
  pdf.save(filename);
}

function exportTableToExcel(tableSelector, filename){
  const el = document.querySelector(tableSelector);
  if(!el) return;
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(el);
  XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
  XLSX.writeFile(wb, filename);
}
