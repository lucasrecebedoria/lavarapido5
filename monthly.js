import { auth, onAuthStateChanged, colRelatoriosMensais, query, where, getDocs } from './firebase.js';

onAuthStateChanged(auth, (user)=>{ if(!user) location.href='index.html'; });

function prefixBadgeHtml(prefix){
  const n = parseInt(prefix,10);
  let cls='prefix-default';
  if(n>=55001 && n<=55184){ cls='prefix-green-flag'; }
  else if(n>=55185 && n<=55363){ cls='prefix-red'; }
  else if(n>=55364 && n<=55559){ cls='prefix-blue'; }
  else if(n>=55900){ cls='prefix-purple'; }
  return `<span class="prefix-badge ${cls}">${prefix}</span>`;
}

function toBR(dateStr){
  if(!dateStr) return '';
  const p = dateStr.split('-'); return `${p[2]}/${p[1]}/${p[0]}`;
}

async function loadMonthly(){
  const el = document.getElementById('mesInput');
  if(!el.value) el.value = new Date().toISOString().slice(0,7);
  const ym = el.value;
  const q = query(colRelatoriosMensais, where('ym','==', ym));
  const snap = await getDocs(q);

  // aggregate counts and days
  const byPrefix = {};
  snap.forEach(docSnap=>{
    const d = docSnap.data();
    const px = d.prefixo;
    byPrefix[px] = byPrefix[px] || { qtd:0, dias: new Set() };
    byPrefix[px].qtd++;
    if(d.data) byPrefix[px].dias.add(d.data);
  });

  const tbody = document.querySelector('#tabelaMensal tbody');
  tbody.innerHTML = '';
  Object.keys(byPrefix).sort().forEach(px=>{
    const info = byPrefix[px];
    const dias = Array.from(info.dias).sort().map(s=>{
      const p = s.split('-'); return `${p[2]}/${p[1]}/${p[0]}`;
    }).join(', ');
    const tr = document.createElement('tr');
    if(info.qtd < 7) tr.classList.add('row-low');
    tr.innerHTML = `<td>${prefixBadgeHtml(px)}</td><td>${info.qtd}</td><td>${dias}</td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('mesInput').addEventListener('change', loadMonthly);
loadMonthly();
document.getElementById('btnLogout')?.addEventListener('click', ()=> import('./firebase.js').then(m=> m.signOut(m.auth)));


// --- Added: export buttons for monthly ---
document.getElementById('btnMonthlyPdf')?.addEventListener('click', ()=> exportTableToPDF('#tabelaMensal', 'relatorio-mensal.pdf'));
document.getElementById('btnMonthlyExcel')?.addEventListener('click', ()=> exportTableToExcel('#tabelaMensal', 'relatorio-mensal.xlsx'));

// export helpers (duplicated small helpers to avoid extra imports)
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


// === Added: Monthly filters ===
function applyMonthlyFilters(){
  const val = (document.getElementById('filtroMensalPrefixo')?.value || '').trim();
  const minCount = Number(document.getElementById('filtroMensalMinCount')?.value || 0);
  const rows = document.querySelectorAll('#tabelaMensal tbody tr');
  rows.forEach(tr=>{
    const px = tr.children[0]?.textContent?.trim() || '';
    const cnt = Number(tr.children[1]?.textContent?.trim() || 0);
    const okPx = !val || px.includes(val);
    const okCnt = cnt >= minCount;
    tr.style.display = (okPx && okCnt) ? '' : 'none';
  });
}

document.getElementById('filtroMensalPrefixo')?.addEventListener('input', applyMonthlyFilters);
document.getElementById('filtroMensalMinCount')?.addEventListener('input', applyMonthlyFilters);
