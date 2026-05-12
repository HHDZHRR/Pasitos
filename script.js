const SUPABASE_URL = 'https://kaimrmambwoalnessigl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthaW1ybWFtYndvYWxuZXNzaWdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTkzNTAsImV4cCI6MjA5MzMzNTM1MH0.KsNZE7u4MO0wXWe2x4YKQ2soqP27gqdBfZngIffHxyk';

function cambiarModo(m){
  if(m === 'admin' && !supabaseUser) {
    document.getElementById('login-modal-bg').classList.add('open');
    return;
  }
  document.getElementById('pagina-publica').style.display=m==='admin'?'none':'block';
  document.getElementById('panel-admin').style.display=m==='admin'?'block':'none';
  const btnAdmin = document.getElementById('btn-admin'); if(btnAdmin) btnAdmin.style.display=m==='admin'?'none':'flex';
  const btnPub = document.getElementById('btn-publica'); if(btnPub) btnPub.style.display=m==='admin'?'flex':'none';
  if(m==='admin'){
    renderCal();
    fetchDataFromSupabase();
  }
  window.scrollTo(0,0);
}

function cerrarLoginModal() {
  document.getElementById('login-modal-bg').classList.remove('open');
}

const HOY=new Date();
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function fmtISO(y,m,d){return y+'-'+(m<9?'0':'')+(m+1)+'-'+(d<10?'0':'')+d;}
const fd=HOY.getDate()+' de '+MESES[HOY.getMonth()]+' de '+HOY.getFullYear();
const e1=document.getElementById('fecha-txt');if(e1)e1.textContent=fd;
const e2=document.getElementById('fecha-tabla');if(e2)e2.textContent=fd;

function toggleFaq(el){el.closest('.faq-item').classList.toggle('open');}
async function enviarContacto(){
  const nombre = document.getElementById('c-nombre')?.value || '';
  const tel = document.getElementById('c-tel')?.value || '';
  const suc = document.getElementById('c-sucursal')?.value || '';
  const edad = document.getElementById('c-edad')?.value || '';
  const msg = document.getElementById('c-mensaje')?.value || '';
  if(!nombre || !tel) { toast('⚠️ Por favor ingresa nombre y teléfono'); return; }
  
  if(supabase) {
    const { error } = await supabase.from('contactos').insert([{nombre, telefono: tel, sucursal: suc, edad, mensaje: msg}]);
    if(error) { toast('⚠️ Error al enviar: ' + error.message); return; }
  }
  
  if(document.getElementById('c-nombre')) document.getElementById('c-nombre').value = '';
  if(document.getElementById('c-tel')) document.getElementById('c-tel').value = '';
  if(document.getElementById('c-mensaje')) document.getElementById('c-mensaje').value = '';
  
  toast('✅ ¡Mensaje enviado! Te contactaremos pronto al 844-139-0293');
}
function verSuc(id,btn){
  document.querySelectorAll('.suc-panel').forEach(p=>p.classList.remove('visible'));
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('on'));
  document.getElementById('suc-'+id).classList.add('visible');
  btn.classList.add('on');
}
function irAdmin(sec,btn){
  document.querySelectorAll('.asec').forEach(s=>s.classList.remove('visible'));
  document.querySelectorAll('.nav-abtn').forEach(b=>b.classList.remove('activo'));
  document.getElementById('asec-'+sec).classList.add('visible');
  btn.classList.add('activo');
  
  // Actualizar contenido al entrar a la pestaña
  if(sec==='resumen') renderResumen();
  if(sec==='alumnos') renderAlumnos();
  if(sec==='entradas') renderAsistencias();
  if(sec==='pagos') renderPagos();
  if(sec==='calendario') renderCal();
  if(sec==='avisos') renderAvisos();
}
function filtrarTabla(inp,id){const q=inp.value.toLowerCase();document.querySelectorAll('#'+id+' tr').forEach(tr=>{tr.style.display=tr.textContent.toLowerCase().includes(q)?'':'none';});}
function filtrarPagos(estado,btn){document.querySelectorAll('.filtro-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');document.querySelectorAll('#lista-pagos .pago-card').forEach(c=>{c.style.display=(estado==='todos'||c.dataset.estado===estado)?'flex':'none';});}
function marcarPagado(btn){
  const card=btn.closest('.pago-card');
  card.classList.remove('pendiente','vencido');card.classList.add('pagado');card.dataset.estado='pagado';
  const chip=card.querySelector('.chip');chip.className='chip pagado';chip.textContent='✅ Pagado';
  btn.remove();
  const el=document.getElementById('num-adeudos');el.textContent=Math.max(0,parseInt(el.textContent)-1);
  toast('✅ Pago registrado correctamente');
}

// --- Supabase integration ---------------------------------
let supabase = null;
let supabaseUser = null;

async function initSupabase(url,key){
  if(!url||!key) return;
  try{
    const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
    supabase = mod.createClient(url,key);
    console.log('Supabase initialized');
    bindSupabaseAuth();
    await fetchDataFromSupabase();
    
    // Suscripción a cambios en tiempo real
    supabase.channel('public:*')
      .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
        console.log('Cambio en Supabase:', payload);
        fetchDataFromSupabase();
      })
      .subscribe();
      
  }catch(err){console.error('Supabase init failed',err);} 
}

function bindSupabaseAuth(){
  if(!supabase) return;
  supabase.auth.getSession().then(({data})=>{
    supabaseUser=data?.session?.user || null;
  }).catch(console.error);
  supabase.auth.onAuthStateChange((_event, session)=>{
    supabaseUser=session?.user || null;
  });
}

async function signInWithEmailPassword(){
  if(!supabase){toast('Configura Supabase primero');return;}
  const email=document.getElementById('login-email')?.value?.trim();
  const password=document.getElementById('login-pass')?.value || '';
  if(!email || !password){toast('⚠️ Escribe correo y contraseña');return;}
  const { error } = await supabase.auth.signInWithPassword({email,password});
  if(error){toast('⚠️ '+error.message);return;}
  toast('✅ Sesión iniciada');
  cerrarLoginModal();
  cambiarModo('admin');
  fetchDataFromSupabase();
}

async function signOutSupabase(){
  if(!supabase) return;
  const { error } = await supabase.auth.signOut();
  if(error){toast('⚠️ '+error.message);return;}
  supabaseUser=null;
  toast('Sesión cerrada');
  cambiarModo('publica');
}

async function fetchDataFromSupabase(){
  if(!supabase) return;
  try{
    // Fetch Alumnos
    const { data: alumnosData, error: alumnosError } = await supabase.from('alumnos').select('*');
    if(alumnosError) console.error("Error alumnos:", alumnosError);
    else if(alumnosData) {
      alumnos = alumnosData;
      saveLocalData();
    }

    // Fetch Asistencias
    const { data: asistenciasData, error: asistenciasError } = await supabase.from('asistencias').select('*, alumnos(nombre)').order('fecha', { ascending:true });
    if(asistenciasError) console.error("Error asistencias:", asistenciasError);
    else if(asistenciasData) {
      asistencias = asistenciasData;
      saveLocalData();
    }

    // Fetch Citas
    const { data: citasData, error: citasError } = await supabase.from('citas').select('*').order('fecha', { ascending:true });
    if(citasError) console.error("Error citas:", citasError);
    else if(citasData) {
      citas = citasData;
      saveLocalData();
    }
    
    // Fetch Pagos
    const { data: pagosData, error: pagosError } = await supabase.from('pagos').select('*, alumnos(nombre)').order('fecha_registro', { ascending:true });
    if(pagosError) console.error("Error pagos:", pagosError);
    else if(pagosData) {
      pagos = pagosData;
      saveLocalData();
    }

    // Fetch Avisos
    const { data: avisosData, error: avisosError } = await supabase.from('avisos').select('*').order('created_at', { ascending:false });
    if(avisosError) console.error("Error avisos:", avisosError);
    else if(avisosData) {
      avisos = avisosData;
      saveLocalData();
    }
    
    let syncCount = 0;
    if(!alumnosError) { renderAlumnos(); syncCount++; }
    if(!asistenciasError) { renderAsistencias(); syncCount++; }
    if(!citasError && !pagosError) { renderCal(); syncCount++; }
    if(!avisosError) { renderAvisos(); syncCount++; }
    
    if(typeof renderResumen === 'function') renderResumen();
    if(typeof renderPagos === 'function') renderPagos();
    
    if(syncCount > 0) {
      if(document.getElementById('panel-admin') && document.getElementById('panel-admin').style.display === 'block') {
        toast('✅ Datos sincronizados con Supabase');
      }
    }
  }catch(err){console.error(err);} 
}

async function saveCitaToSupabase(cita){
  if(!supabase) return false;
  if(!supabaseUser){toast('🔒 Inicia sesión para guardar en Supabase'); return false;}
  try{
    const { data, error } = await supabase.from('citas').insert([cita]);
    if(error){console.error(error); toast('⚠️ Error en Supabase: ' + error.message); return false;} 
    return true;
  }catch(err){console.error(err); toast('⚠️ Error: ' + err.message); return false;}
}

async function savePagoToSupabase(pago){
  if(!supabase) return false;
  if(!supabaseUser){toast('🔒 Inicia sesión para guardar en Supabase'); return false;}
  try{
    const { data, error } = await supabase.from('pagos').insert([pago]);
    if(error){console.error(error); toast('⚠️ Error en Supabase: ' + error.message); return false;} 
    return true;
  }catch(err){console.error(err); toast('⚠️ Error: ' + err.message); return false;}
}

async function saveAlumnoToSupabase(alumno){
  if(!supabase) return false;
  if(!supabaseUser){toast('🔒 Inicia sesión para guardar en Supabase'); return false;}
  try{
    const { data, error } = await supabase.from('alumnos').insert([alumno]);
    if(error){console.error(error); toast('⚠️ Error en Supabase: ' + error.message); return false;} 
    return true;
  }catch(err){console.error(err); toast('⚠️ Error: ' + err.message); return false;}
}

async function saveAsistenciaToSupabase(asis){
  if(!supabase) return false;
  if(!supabaseUser){toast('🔒 Inicia sesión para guardar en Supabase'); return false;}
  try{
    const { data, error } = await supabase.from('asistencias').insert([asis]);
    if(error){console.error(error); toast('⚠️ Error en Supabase: ' + error.message); return false;} 
    return true;
  }catch(err){console.error(err); toast('⚠️ Error: ' + err.message); return false;}
}

async function deleteFromSupabase(table, item) {
  if(!supabase || !supabaseUser) { toast('🔒 Inicia sesión para eliminar'); return false; }
  try {
    let q = supabase.from(table).delete();
    if(item.id) {
      q = q.eq('id', item.id);
    } else {
      for(let key in item) {
        if(key !== 'id' && key !== 'created_at') {
          q = q.eq(key, item[key]);
        }
      }
    }
    const { error } = await q;
    if(error) { console.error('Error deleting:', error); toast('⚠️ Error al eliminar: ' + error.message); return false; }
    return true;
  } catch(err) { console.error(err); toast('⚠️ Error: ' + err.message); return false; }
}

async function saveAvisoToSupabase(aviso){
  if(!supabase) return false;
  if(!supabaseUser){toast('🔒 Inicia sesión para guardar en Supabase'); return false;}
  try{
    const { data, error } = await supabase.from('avisos').insert([aviso]);
    if(error){console.error(error); toast('⚠️ Error en Supabase: ' + error.message); return false;} 
    return true;
  }catch(err){console.error(err); toast('⚠️ Error: ' + err.message); return false;}
}

// Auto-init con las credenciales locales
initSupabase(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Manejo de Datos Locales y Calendario ---
let calMes=HOY.getMonth(),calAnio=HOY.getFullYear();

let alumnos = JSON.parse(localStorage.getItem('pasitos_alumnos')||'null') || [];
let asistencias = JSON.parse(localStorage.getItem('pasitos_asistencias')||'null') || [];
let citas = JSON.parse(localStorage.getItem('pasitos_citas')||'null') || [];
let pagos = JSON.parse(localStorage.getItem('pasitos_pagos')||'null') || [];
let avisos = JSON.parse(localStorage.getItem('pasitos_avisos')||'null') || [];

function saveLocalData(){
  localStorage.setItem('pasitos_alumnos',JSON.stringify(alumnos));
  localStorage.setItem('pasitos_asistencias',JSON.stringify(asistencias));
  localStorage.setItem('pasitos_citas',JSON.stringify(citas));
  localStorage.setItem('pasitos_pagos',JSON.stringify(pagos));
  localStorage.setItem('pasitos_avisos',JSON.stringify(avisos));
}

function obtenerNombreNino(item) {
  if (item.alumno_id) {
    const al = alumnos.find(a => a.id === item.alumno_id);
    if (al) return al.nombre;
  }
  if (item.alumnos) {
    if (Array.isArray(item.alumnos)) return item.alumnos[0]?.nombre || item.nino || 'Alumno';
    return item.alumnos.nombre || item.nino || 'Alumno';
  }
  return item.nino || 'Alumno';
}

function renderAsistencias(){
  const listaEntradas = document.getElementById('lista-entradas');
  const listaSalidas = document.getElementById('lista-salidas');
  const tbody = document.getElementById('tabla-hist');
  if(!listaEntradas || !listaSalidas || !tbody) return;

  listaEntradas.innerHTML = '';
  listaSalidas.innerHTML = '';
  tbody.innerHTML = '';

  const hoyStr = fmtISO(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
  
  // Render Panels
  const entradasHoy = asistencias.filter(a => a.fecha === hoyStr && a.tipo === 'Entrada');
  const salidasHoy = asistencias.filter(a => a.fecha === hoyStr && a.tipo === 'Salida');

  if(entradasHoy.length === 0) listaEntradas.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris3)">No hay entradas hoy</div>';
  else {
    entradasHoy.forEach(a => {
      const nombre = obtenerNombreNino(a);
      listaEntradas.innerHTML += '<div class="nino-row"><div class="avatar-n av-verde">👶</div><div style="flex:1"><div class="nino-nombre">'+nombre+'</div><div class="nino-hora">'+a.hora+'</div></div><span class="chip dentro">Dentro</span></div>';
    });
  }

  if(salidasHoy.length === 0) listaSalidas.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris3)">No hay salidas hoy</div>';
  else {
    salidasHoy.forEach(a => {
      const nombre = obtenerNombreNino(a);
      listaSalidas.innerHTML += '<div class="nino-row"><div class="avatar-n av-rojo">👶</div><div style="flex:1"><div class="nino-nombre">'+nombre+'</div><div class="nino-hora">'+a.hora+'</div></div><span class="chip fuera">Salió</span></div>';
    });
  }

  // Render Table (History)
  let filtradas = asistencias;
  const mesFiltro = document.getElementById('filtro-mes-asis')?.value;
  if(mesFiltro) {
    filtradas = asistencias.filter(a => a.fecha && a.fecha.startsWith(mesFiltro));
  }
  
  if(filtradas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gris3)">No hay registros</td></tr>';
  } else {
    filtradas.slice().reverse().forEach((a) => {
      const realIdx = asistencias.indexOf(a);
      const nombre = obtenerNombreNino(a);
      let tipoStr = a.tipo === 'Entrada' ? '<b style="color:var(--verde-d)">🟢 Entrada</b>' : (a.tipo === 'Salida' ? '<b style="color:var(--rojo)">🔴 Salida</b>' : '📝 Diario');
      tbody.innerHTML += '<tr><td><b>'+nombre+'</b></td><td>'+a.fecha+'</td><td>'+a.hora+'</td><td>'+tipoStr+'</td><td>'+a.notas+'</td><td><button class="btn btn-gris" style="padding:4px 8px;font-size:0.75rem;margin-right:5px" onclick="openModal(\'asistencia\', '+realIdx+')">Editar</button><button class="btn btn-gris" style="padding:4px 8px;font-size:0.75rem" onclick="eliminarAsistencia('+realIdx+')">Eliminar</button></td></tr>';
    });
  }
}

async function eliminarAsistencia(idx) {
  if(!confirm('¿Estás seguro de eliminar este registro?')) return;
  const item = asistencias[idx];
  if(supabase) {
    const ok = await deleteFromSupabase('asistencias', item);
    if(!ok) { toast('⚠️ Error al eliminar de Supabase'); return; }
  }
  asistencias.splice(idx, 1);
  saveLocalData();
  renderAsistencias();
}

function renderAlumnos(filtroSucursal = 'todos'){
  const tbody = document.getElementById('tabla-alumnos');
  if(!tbody) return;
  tbody.innerHTML = '';
  
  const filtrados = (filtroSucursal === 'todos') ? alumnos : alumnos.filter(a => a.sucursal === filtroSucursal);
  
  if(filtrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gris3)">No se encontraron alumnos</td></tr>';
    return;
  }
  
  filtrados.forEach((a) => {
    const i = alumnos.indexOf(a);
    const tr = document.createElement('tr');
    // Limpiar el teléfono para el link de WhatsApp
    const waPhone = a.telefono.replace(/\D/g, '');
    tr.innerHTML = `
      <td><b>${a.nombre}</b></td>
      <td>${a.edad}</td>
      <td>${a.sucursal}</td>
      <td>${a.tutor}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px">
          ${a.telefono}
          <a href="https://wa.me/52${waPhone}" target="_blank" class="btn-wa-sm" title="Contactar por WhatsApp">
            <img src="img/whatsapp.png" alt="WA" style="width:24px;height:24px;object-fit:contain" />
          </a>
        </div>
      </td>
      <td>
        <button class="btn btn-gris" style="padding:4px 8px;font-size:0.75rem;margin-right:5px" onclick="openModal('alumno', ${i})">Editar</button>
        <button class="btn btn-gris" style="padding:4px 8px;font-size:0.75rem" onclick="eliminarAlumno(${i})">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filtrarAlumnos(sucursal, btn){
  document.querySelectorAll('#asec-alumnos .filtro-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  renderAlumnos(sucursal);
}

async function eliminarAlumno(idx) {
  if(!confirm('¿Estás seguro de eliminar este alumno?')) return;
  const item = alumnos[idx];
  if(supabase) {
    const ok = await deleteFromSupabase('alumnos', item);
    if(!ok) { toast('⚠️ Error al eliminar de Supabase'); return; }
  }
  alumnos.splice(idx, 1);
  saveLocalData();
  renderAlumnos();
}


function getUnifiedEvents() {
  const evCitas = citas.map((c, i) => ({fecha: c.fecha, tipo: 'cita', desc: c.descripcion, hora: c.hora, idx: i}));
  const evPagos = pagos.map(p => {
    const nombre = obtenerNombreNino(p);
    return {fecha: p.fecha_registro, tipo: 'pago', desc: 'Cobro: ' + nombre + (p.monto > 0 ? ' - $'+p.monto : ''), hora: '00:00'};
  });
  return [...evCitas, ...evPagos];
}

function renderCal(){
  document.getElementById('cal-titulo').textContent=MESES[calMes]+' '+calAnio;
  const pD=new Date(calAnio,calMes,1).getDay(),dM=new Date(calAnio,calMes+1,0).getDate(),dA=new Date(calAnio,calMes,0).getDate();
  const grid=document.getElementById('cal-grid');grid.innerHTML='';
  
  const unifiedEvents = getUnifiedEvents();
  
  for(let i=pD-1;i>=0;i--){const d=document.createElement('div');d.className='cal-dia otro-mes';d.innerHTML='<div class="num-dia">'+(dA-i)+'</div>';grid.appendChild(d);}
  for(let d=1;d<=dM;d++){
    const cell=document.createElement('div');const fs=fmtISO(calAnio,calMes,d);
    const esH=(calAnio===HOY.getFullYear()&&calMes===HOY.getMonth()&&d===HOY.getDate());
    cell.className='cal-dia'+(esH?' hoy':'');let html='<div class="num-dia">'+d+'</div>';
    unifiedEvents.filter(e=>e.fecha===fs).forEach(e=>{html+='<span class="evento-puntito '+(e.tipo==='cita'?'ep-cita':'ep-pago')+'">'+(e.tipo==='cita'?'📌':'💰')+' '+e.desc+'</span>';});
    cell.innerHTML=html;cell.onclick=()=>verDia(fs,d);grid.appendChild(cell);
  }
  const rest=42-(pD+dM);
  for(let i=1;i<=rest;i++){const d2=document.createElement('div');d2.className='cal-dia otro-mes';d2.innerHTML='<div class="num-dia">'+i+'</div>';grid.appendChild(d2);}
  renderMes(unifiedEvents);
}

function verDia(fs,d){
  const ev=getUnifiedEvents().filter(e=>e.fecha===fs);
  const tit=document.getElementById('eventos-titulo'),lista=document.getElementById('lista-eventos');
  if(!ev.length){tit.textContent='📌 Sin eventos el día '+d;lista.innerHTML='<div style="color:var(--gris3);font-size:.9rem;padding:10px">No hay eventos para este día.</div>';return;}
  tit.textContent='📌 Eventos del '+d+' de '+MESES[calMes];lista.innerHTML='';
  ev.forEach(e=>{
    let delStr = e.tipo === 'cita' ? '<button class="btn btn-gris" style="padding:2px 6px;margin-left:8px;font-size:0.75rem" onclick="eliminarCita('+e.idx+')">Eliminar</button>' : '';
    lista.innerHTML+='<div class="evento-item"><span class="evento-hora">'+e.hora+'</span><span class="evento-desc">'+e.desc+delStr+'</span><span class="evento-tag '+(e.tipo==='cita'?'et-cita':'et-pago')+'">'+(e.tipo==='cita'?'Cita':'Pago')+'</span></div>';
  });
}

function renderMes(unifiedEvents){
  const pref=calAnio+'-'+(calMes<9?'0':'')+(calMes+1);
  const ev=unifiedEvents.filter(e=>e.fecha.startsWith(pref));
  const tit=document.getElementById('eventos-titulo'),lista=document.getElementById('lista-eventos');
  tit.textContent='📌 Actividad de '+MESES[calMes];lista.innerHTML='';
  if(!ev.length){lista.innerHTML='<div style="color:var(--gris3);padding:10px;font-size:.9rem">No hay eventos este mes.</div>';return;}
  ev.forEach(e=>{
    let editStr = '<button class="btn btn-gris" style="padding:2px 6px;margin-left:8px;font-size:0.75rem" onclick="openModal(\''+e.tipo+'\', '+e.idx+')">Editar</button>';
    let delStr = '<button class="btn btn-gris" style="padding:2px 6px;margin-left:8px;font-size:0.75rem" onclick="eliminarCita('+e.idx+')">Eliminar</button>';
    if(e.tipo !== 'cita') { editStr = ''; delStr = ''; }
    lista.innerHTML+='<div class="evento-item"><span class="evento-hora">'+e.hora+'</span><span class="evento-desc">'+e.fecha.split('-')[2]+' – '+e.desc+editStr+delStr+'</span><span class="evento-tag '+(e.tipo==='cita'?'et-cita':'et-pago')+'">'+(e.tipo==='cita'?'📌 Cita':'💰 Pago')+'</span></div>';
  });
}

async function eliminarCita(idx) {
  if(!confirm('¿Estás seguro de eliminar esta cita?')) return;
  const item = citas[idx];
  if(supabase) {
    const ok = await deleteFromSupabase('citas', item);
    if(!ok) { toast('⚠️ Error al eliminar de Supabase'); return; }
  }
  citas.splice(idx, 1);
  saveLocalData();
  renderCal();
  toast('🗑️ Cita eliminada');
}

function cambiarMes(dir){calMes+=dir;if(calMes>11){calMes=0;calAnio++;}if(calMes<0){calMes=11;calAnio--;}renderCal();}

let modalTipo='';
let editIndex = null;
function openModal(tipo, idx = null){
  modalTipo=tipo; editIndex=idx; document.getElementById('modal-bg').classList.add('open');
  const hoy=fmtISO(HOY.getFullYear(),HOY.getMonth(),HOY.getDate());
  if(tipo==='cita'){
    const c = idx !== null ? citas[idx] : {fecha: hoy, hora: '10:00', descripcion: ''};
    document.getElementById('modal-titulo').textContent = idx !== null ? '📌 Editar Cita' : '📌 Nueva Cita';
    document.getElementById('modal-body').innerHTML='<label>Fecha</label><input type="date" id="m-fecha" value="'+c.fecha+'"/><label>Hora</label><input type="time" id="m-hora" value="'+c.hora+'"/><label>Descripción</label><textarea id="m-desc" placeholder="Ej. Reunión con mamá de Sofía...">'+c.descripcion+'</textarea>';
  }
  else if(tipo==='alumno'){
    const a = idx !== null ? alumnos[idx] : {nombre: '', edad: '', sucursal: 'Los Pinos', tutor: '', telefono: ''};
    document.getElementById('modal-titulo').textContent = idx !== null ? '👧👦 Editar Alumno' : '👧👦 Registrar Alumno';
    document.getElementById('modal-body').innerHTML='<label>Nombre del Niño</label><input type="text" id="m-anombre" value="'+a.nombre+'" placeholder="Ej. Juan Pérez"/><label>Edad</label><input type="text" id="m-aedad" value="'+a.edad+'" placeholder="Ej. 3 años"/><label>Sucursal</label><select id="m-asuc"><option '+(a.sucursal==='Los Pinos'?'selected':'')+'>Los Pinos</option><option '+(a.sucursal==='Tulipanes'?'selected':'')+'>Tulipanes</option></select><label>Tutor</label><input type="text" id="m-atutor" value="'+a.tutor+'" placeholder="Ej. María Pérez"/><label>Teléfono</label><input type="tel" id="m-atel" value="'+a.telefono+'" placeholder="844-000-0000"/>';
  }
  else if(tipo==='asistencia'){
    const a = idx !== null ? asistencias[idx] : {alumno_id: '', tipo: 'Entrada', fecha: hoy, hora: '08:00', notas: ''};
    document.getElementById('modal-titulo').textContent = idx !== null ? '🟢 Editar Registro' : '🟢 Registrar Asistencia/Diario';
    
    // Filtrar solo alumnos que tengan un ID real de base de datos
    const alumnosValidos = alumnos.filter(al => al.id);
    let options = alumnosValidos.map(al => `<option value="${al.id}" ${a.alumno_id===al.id?'selected':''}>${al.nombre}</option>`).join('');
    
    if(!options) options = '<option value="">Primero registra alumnos en la pestaña de Alumnos</option>';
    document.getElementById('modal-body').innerHTML='<label>Niño</label><select id="m-alumno_id">'+options+'</select><label>Tipo</label><select id="m-etipo"><option '+(a.tipo==='Entrada'?'selected':'')+'>Entrada</option><option '+(a.tipo==='Salida'?'selected':'')+'>Salida</option><option '+(a.tipo==='Reporte Diario'?'selected':'')+'>Reporte Diario</option></select><label>Fecha</label><input type="date" id="m-efecha" value="'+a.fecha+'"/><label>Hora</label><input type="time" id="m-ehora" value="'+a.hora+'"/><label>Notas / Diario</label><textarea id="m-enotas" placeholder="Ej. Comió bien, durmió 1 hora...">'+a.notas+'</textarea>';
  }
  else if(tipo==='aviso'){
    const a = idx !== null ? avisos[idx] : {titulo: '', texto: '', tipo: 'normal'};
    document.getElementById('modal-titulo').textContent = idx !== null ? '📢 Editar Aviso' : '📢 Nuevo Aviso';
    document.getElementById('modal-body').innerHTML='<label>Título</label><input type="text" id="m-atitulo" value="'+a.titulo+'" placeholder="Ej. Semana de vacunación"/><label>Texto</label><textarea id="m-atexto" placeholder="Ej. El martes 5 de mayo...">'+a.texto+'</textarea><label>Tipo</label><select id="m-atipo"><option value="normal" '+(a.tipo==='normal'?'selected':'')+'>Normal</option><option value="importante" '+(a.tipo==='importante'?'selected':'')+'>Importante (💰 / ⚠️)</option><option value="urgente" '+(a.tipo==='urgente'?'selected':'')+'>Urgente (🔴)</option></select>';
  }
  else{
    const p = idx !== null ? pagos[idx] : {alumno_id: '', sucursal: 'Los Pinos', monto: '', mes: 'Mayo 2026', estado: 'pendiente'};
    document.getElementById('modal-titulo').textContent = idx !== null ? '💰 Editar Pago' : '💰 Registrar Pago';
    
    // Filtrar solo alumnos que tengan un ID real de base de datos
    const alumnosValidos = alumnos.filter(al => al.id);
    let options = alumnosValidos.map(al => `<option value="${al.id}" ${p.alumno_id===al.id?'selected':''}>${al.nombre}</option>`).join('');
    
    if(!options) options = '<option value="">Primero registra alumnos en la pestaña de Alumnos</option>';
    document.getElementById('modal-body').innerHTML=`
      <label>Nombre del Niño</label>
      <select id="m-p_alumno_id">${options}</select>
      <label>Sucursal</label>
      <select id="m-suc">
        <option ${p.sucursal==='Los Pinos'?'selected':''}>Los Pinos</option>
        <option ${p.sucursal==='Tulipanes'?'selected':''}>Tulipanes</option>
      </select>
      <label>Monto ($)</label>
      <input type="number" id="m-monto" value="${p.monto}" placeholder="3000" min="0"/>
      <label>Mes</label>
      <select id="m-mes">
        <option ${p.mes==='Mayo 2026'?'selected':''}>Mayo 2026</option>
        <option ${p.mes==='Abril 2026'?'selected':''}>Abril 2026</option>
        <option ${p.mes==='Junio 2026'?'selected':''}>Junio 2026</option>
      </select>
      <label>Estado del Pago</label>
      <select id="m-pestado">
        <option value="pagado" ${p.estado==='pagado'?'selected':''}>✅ Pagado</option>
        <option value="pendiente" ${p.estado==='pendiente'?'selected':''}>⏳ Pendiente</option>
        <option value="vencido" ${p.estado==='vencido'?'selected':''}>🔴 Adeudo (Vencido)</option>
      </select>
    `;
  }
}

function cerrarModal(){document.getElementById('modal-bg').classList.remove('open');}

async function guardarModal(){
  if(modalTipo==='cita'){
    const f=document.getElementById('m-fecha')?.value;
    const h=document.getElementById('m-hora')?.value;
    const d=document.getElementById('m-desc')?.value;
    if(!f||!d.trim()){toast('⚠️ Completa todos los campos');return;}
    let cita={fecha:f, descripcion:d, hora:h};
    if(editIndex !== null) cita = {...citas[editIndex], ...cita};
    if(supabase && supabaseUser) {
      let q = cita.id ? supabase.from('citas').update(cita).eq('id', cita.id) : supabase.from('citas').insert([cita]);
      const { data: res, error } = await q.select();
      if(error) { toast('⚠️ Error: ' + error.message); return; }
      if(res && res[0]) cita = res[0];
    }
    if(editIndex !== null) citas[editIndex] = cita; else citas.push(cita);
    saveLocalData(); renderCal(); toast(editIndex !== null ? '📌 Cita actualizada' : '📌 Cita guardada');
  }else if(modalTipo==='alumno'){
    const nom=document.getElementById('m-anombre')?.value;
    const eda=document.getElementById('m-aedad')?.value;
    const suc=document.getElementById('m-asuc')?.value;
    const tut=document.getElementById('m-atutor')?.value;
    const tel=document.getElementById('m-atel')?.value;
    if(!nom.trim()||!eda.trim()||!tut.trim()||!tel.trim()){toast('⚠️ Completa todos los campos');return;}
    let al={nombre:nom, edad:eda, sucursal:suc, tutor:tut, telefono:tel};
    if(editIndex !== null) al = {...alumnos[editIndex], ...al};
    if(supabase && supabaseUser) {
      let q = al.id ? supabase.from('alumnos').update(al).eq('id', al.id) : supabase.from('alumnos').insert([al]);
      const { data: res, error } = await q.select();
      if(error) { toast('⚠️ Error: ' + error.message); return; }
      if(res && res[0]) al = res[0];
    }
    if(editIndex !== null) alumnos[editIndex] = al; else alumnos.push(al);
    saveLocalData(); 
    renderAlumnos(); 
    renderAsistencias(); 
    renderPagos(); 
    renderResumen();
    renderCal();
    toast(editIndex !== null ? '✅ Alumno actualizado' : '✅ Alumno registrado');
  }else if(modalTipo==='asistencia'){
    const aid=document.getElementById('m-alumno_id')?.value;
    const t=document.getElementById('m-etipo')?.value;
    const f=document.getElementById('m-efecha')?.value;
    const h=document.getElementById('m-ehora')?.value;
    const no=document.getElementById('m-enotas')?.value || '';
    if(!aid || aid === 'undefined' || !f || !h){toast('⚠️ Selecciona un alumno válido y completa fecha/hora');return;}
    let asis={alumno_id:aid, tipo:t, fecha:f, hora:h, notas:no};
    if(editIndex !== null) asis = {...asistencias[editIndex], ...asis};
    if(supabase && supabaseUser) {
      const { alumnos: _unused, ...payload } = asis;
      let q = asis.id ? supabase.from('asistencias').update(payload).eq('id', asis.id) : supabase.from('asistencias').insert([payload]);
      const { data: res, error } = await q.select();
      if(error) { toast('⚠️ Error: ' + error.message); return; }
      if(res && res[0]) asis = res[0];
    }
    if(editIndex !== null) asistencias[editIndex] = asis; else asistencias.push(asis);
    saveLocalData(); renderAsistencias(); toast(editIndex !== null ? '✅ Registro actualizado' : '✅ Registro guardado');
  }else if(modalTipo==='aviso'){
    const ti=document.getElementById('m-atitulo')?.value;
    const te=document.getElementById('m-atexto')?.value;
    const tp=document.getElementById('m-atipo')?.value;
    if(!ti.trim()||!te.trim()){toast('⚠️ Completa título y texto');return;}
    const fStr = fmtISO(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
    let aviso={titulo:ti, texto:te, tipo:tp};
    if(editIndex !== null) aviso = {...avisos[editIndex], ...aviso}; else aviso.fecha = fStr;
    if(supabase && supabaseUser) {
      let q = aviso.id ? supabase.from('avisos').update(aviso).eq('id', aviso.id) : supabase.from('avisos').insert([aviso]);
      const { data: res, error } = await q.select();
      if(error) { toast('⚠️ Error: ' + error.message); return; }
      if(res && res[0]) aviso = res[0];
    }
    if(editIndex !== null) avisos[editIndex] = aviso; else avisos.unshift(aviso);
    saveLocalData(); renderAvisos(); toast(editIndex !== null ? '📢 Aviso actualizado' : '📢 Aviso publicado');
  }else{
    const aid=document.getElementById('m-p_alumno_id')?.value;
    const s=document.getElementById('m-suc')?.value;
    const m=document.getElementById('m-monto')?.value;
    const mes=document.getElementById('m-mes')?.value;
    const est=document.getElementById('m-pestado')?.value || 'pendiente';
    if(!aid || aid === 'undefined' || !m){toast('⚠️ Selecciona un alumno válido y escribe el monto');return;}
    let pago={alumno_id:aid, sucursal:s, monto:m, mes:mes, estado:est};
    if(editIndex !== null) pago = {...pagos[editIndex], ...pago}; else { pago.fecha_registro = fmtISO(HOY.getFullYear(),HOY.getMonth(),HOY.getDate()); }
    if(supabase && supabaseUser) {
      const { alumnos: _unused, ...payload } = pago;
      let q = pago.id ? supabase.from('pagos').update(payload).eq('id', pago.id) : supabase.from('pagos').insert([payload]);
      const { data: res, error } = await q.select();
      if(error) { toast('⚠️ Error: ' + error.message); return; }
      if(res && res[0]) pago = res[0];
    }
    if(editIndex !== null) pagos[editIndex] = pago; else pagos.push(pago);
    saveLocalData(); renderPagos(); renderResumen(); toast(editIndex !== null ? '💰 Pago actualizado' : '💰 Pago guardado');
  }
  cerrarModal();
}

document.getElementById('modal-bg').onclick=e=>{if(e.target===document.getElementById('modal-bg'))cerrarModal();};
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800);}

function renderAvisos(){
  const listPub = document.getElementById('public-avisos-list');
  const gridAdmin = document.getElementById('admin-avisos-grid');
  
  if(listPub) listPub.innerHTML = '';
  if(gridAdmin) gridAdmin.innerHTML = '';
  
  if(avisos.length === 0){
    if(listPub) listPub.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris3)">No hay avisos recientes.</div>';
    if(gridAdmin) gridAdmin.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris3);grid-column:1/-1;">No hay avisos registrados.</div>';
    return;
  }
  
  avisos.forEach((a, i) => {
    let displayFecha = a.fecha;
    if(displayFecha && displayFecha.includes('-') && displayFecha.length === 10) {
       const parts = displayFecha.split('-');
       const m = parseInt(parts[1], 10) - 1;
       displayFecha = parseInt(parts[2], 10) + ' de ' + MESES[m] + ' de ' + parts[0];
    }

    let ico = '📢';
    if(a.tipo === 'urgente') ico = '🔴';
    if(a.tipo === 'importante') ico = '⚠️';
    if(a.titulo.toLowerCase().includes('pago')) ico = '💰';
    if(a.titulo.toLowerCase().includes('niño') || a.titulo.toLowerCase().includes('festejo')) ico = '🎉';
    if(a.titulo.toLowerCase().includes('app')) ico = '📱';
    
    // Public Render
    if(listPub){
      listPub.innerHTML += `
        <div class="aviso ${a.tipo === 'normal' ? '' : a.tipo}">
          <span class="aviso-ico">${ico}</span>
          <div>
            <div class="aviso-titulo">${a.titulo}</div>
            <div class="aviso-texto">${a.texto}</div>
            <div class="aviso-fecha">Publicado: ${displayFecha}</div>
          </div>
        </div>
      `;
    }
    
    // Admin Render
    if(gridAdmin){
      gridAdmin.innerHTML += `
        <div style="background:#fff;border-radius:15px;padding:20px;box-shadow:0 8px 24px rgba(0,0,0,0.05);display:flex;flex-direction:column;gap:10px;border-left:4px solid ${a.tipo==='urgente'?'var(--rojo)':(a.tipo==='importante'?'var(--naranja)':'var(--verde)')}">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:1.5rem">${ico}</span>
            <h4 style="margin:0;font-size:1.1rem;color:var(--texto)">${a.titulo}</h4>
          </div>
          <p style="margin:0;font-size:0.9rem;color:var(--gris)">${a.texto}</p>
          <div style="font-size:0.75rem;color:var(--gris3)">${displayFecha} - ${a.tipo.toUpperCase()}</div>
          <div style="margin-top:auto;padding-top:10px;border-top:1px solid var(--gris2);text-align:right">
            <button class="btn btn-gris" style="padding:4px 8px;font-size:0.75rem;color:var(--texto);margin-right:5px" onclick="openModal('aviso', ${i})">Editar</button>
            <button class="btn btn-gris" style="padding:4px 8px;font-size:0.75rem;color:var(--rojo)" onclick="eliminarAviso(${i})">Eliminar</button>
          </div>
        </div>
      `;
    }
  });
}

async function eliminarAviso(idx) {
  if(!confirm('¿Estás seguro de eliminar este aviso?')) return;
  const item = avisos[idx];
  if(supabase) {
    const ok = await deleteFromSupabase('avisos', item);
    if(!ok) { toast('⚠️ Error al eliminar de Supabase'); return; }
  }
  avisos.splice(idx, 1);
  saveLocalData();
  renderAvisos();
}

// Inicializar vista pública
renderAvisos();

// Agregar enlace de Acceso Administrativo al footer para no depender del botón flotante
window.addEventListener('DOMContentLoaded', () => {
  const footerLinks = document.querySelector('.footer-links');
  if(footerLinks) {
    const adminLink = document.createElement('a');
    adminLink.href = '#';
    adminLink.onclick = (e) => { e.preventDefault(); cambiarModo('admin'); };
    adminLink.innerHTML = '🔒 Acceso Administrativo';
    footerLinks.appendChild(adminLink);
  }
  
  if(typeof renderResumen === 'function') renderResumen();
  if(typeof renderPagos === 'function') renderPagos();
});

function renderResumen() {
  const asec = document.getElementById('asec-resumen');
  if(!asec) return;
  const hoyStr = fmtISO(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
  const asistenciasHoy = asistencias.filter(a => a.fecha === hoyStr);
  const estadoNinos = {}; 
  const horaNinos = {}; 
  const nombreNinos = {};
  asistenciasHoy.forEach(a => {
    if(a.tipo === 'Entrada' || a.tipo === 'Salida') {
       const idOrName = a.alumno_id || a.nino;
       estadoNinos[idOrName] = a.tipo;
       horaNinos[idOrName] = a.hora;
       nombreNinos[idOrName] = obtenerNombreNino(a);
    }
  });
  let ninosDentro = 0;
  for(let n in estadoNinos) { if(estadoNinos[n] === 'Entrada') ninosDentro++; }
  const elNinosDentro = asec.querySelector('.stat-card.verde .num');
  if(elNinosDentro) elNinosDentro.textContent = ninosDentro;
  const elTotalNinos = asec.querySelector('.stat-card.azul .num');
  if(elTotalNinos) elTotalNinos.textContent = alumnos.length;
  const adeudos = pagos.filter(p => p.estado === 'pendiente' || p.estado === 'vencido');
  const elAdeudos = document.getElementById('num-adeudos');
  if(elAdeudos) elAdeudos.textContent = adeudos.length;
  const citasHoy = citas.filter(c => c.fecha === hoyStr).length;
  const elCitasHoy = asec.querySelector('.stat-card.rojo .num');
  if(elCitasHoy) elCitasHoy.textContent = citasHoy;
  
  const tbodyRegistro = asec.querySelector('table tbody');
  if(tbodyRegistro) {
    tbodyRegistro.innerHTML = '';
    const ids = Object.keys(estadoNinos);
    if(ids.length === 0) {
      tbodyRegistro.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--gris3)">No hay registros hoy</td></tr>';
    } else {
      ids.forEach(id => {
        const estado = estadoNinos[id];
        const hora = horaNinos[id];
        const nombre = nombreNinos[id];
        const chip = estado === 'Entrada' ? '<span class="chip dentro">🟢 Dentro</span>' : '<span class="chip fuera">⚪ Salió</span>';
        tbodyRegistro.innerHTML += `<tr><td><b>${nombre}</b></td><td>${hora}</td><td>${chip}</td></tr>`;
      });
    }
  }
  
  asec.querySelectorAll('.pago-card').forEach(e => e.remove());
  if(adeudos.length === 0) {
    asec.insertAdjacentHTML('beforeend', '<div class="pago-card" style="justify-content:center;color:var(--gris3)">No hay adeudos pendientes 🎉</div>');
  } else {
    adeudos.forEach(p => {
      const claseEstado = p.estado === 'vencido' ? 'vencido' : 'pendiente';
      const icono = p.estado === 'vencido' ? '🔴' : '⏳';
      const nombre = obtenerNombreNino(p);
      asec.insertAdjacentHTML('beforeend', `
        <div class="pago-card ${claseEstado}">
          <div>
            <div class="pago-nombre"><b>${nombre}</b></div>
            <div class="pago-sub">Sucursal: ${p.sucursal} · Mes: ${p.mes}</div>
          </div>
          <div style="text-align:right">
            <div class="pago-monto">$${p.monto}</div>
            <span class="chip ${claseEstado}">${icono} ${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}</span>
          </div>
        </div>
      `);
    });
  }
}

function renderPagos() {
  const listaPagos = document.getElementById('lista-pagos');
  if(!listaPagos) return;
  listaPagos.innerHTML = '';
  if(pagos.length === 0) {
    listaPagos.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris3)">No hay pagos registrados</div>';
    return;
  }
  let filtroActivo = 'todos';
  const btnActivo = document.querySelector('.pagos-filtros .filtro-btn.on');
  if(btnActivo) {
    if(btnActivo.textContent.toLowerCase().includes('pendiente')) filtroActivo = 'pendiente';
    else if(btnActivo.textContent.toLowerCase().includes('vencido')) filtroActivo = 'vencido';
    else if(btnActivo.textContent.toLowerCase().includes('pagado')) filtroActivo = 'pagado';
  }
  pagos.forEach((p, i) => {
    const claseEstado = p.estado === 'vencido' ? 'vencido' : (p.estado === 'pendiente' ? 'pendiente' : 'pagado');
    let chip = '', btnMarcar = '';
    if(p.estado === 'vencido') {
      chip = '<span class="chip vencido">Vencido</span>';
      btnMarcar = `<button class="btn btn-verde" onclick="marcarPagadoIndex(${i})">✔ Marcar pagado</button>`;
    } else if(p.estado === 'pendiente') {
      chip = '<span class="chip pendiente">Pendiente</span>';
      btnMarcar = `<button class="btn btn-verde" onclick="marcarPagadoIndex(${i})">✔ Marcar pagado</button>`;
    } else {
      chip = '<span class="chip pagado">✅ Pagado</span>';
    }
    const displayStyle = (filtroActivo === 'todos' || filtroActivo === claseEstado) ? 'flex' : 'none';
    const nombre = obtenerNombreNino(p);
    listaPagos.innerHTML += `
      <div class="pago-card ${claseEstado}" data-estado="${claseEstado}" style="display:${displayStyle}">
        <div>
          <div class="pago-nombre">${nombre}</div>
          <div class="pago-sub">Sucursal: ${p.sucursal} · Mes: ${p.mes}</div>
        </div>
        <div style="text-align:right">
          <div class="pago-monto">$${p.monto}</div>
          ${chip}
        </div>
        <div style="display:flex;flex-direction:column;gap:5px">
          ${btnMarcar}
          <div style="display:flex;gap:5px;justify-content:flex-end">
            <button class="btn btn-gris" style="padding:4px 8px;font-size:0.75rem" onclick="openModal('pago', ${i})">Editar</button>
            <button class="btn btn-gris" style="padding:4px 8px;font-size:0.75rem;color:var(--rojo)" onclick="eliminarPago(${i})">Eliminar</button>
          </div>
        </div>
      </div>
    `;
  });
}

async function marcarPagadoIndex(idx) {
  const p = pagos[idx];
  if(!p) return;
  p.estado = 'pagado';
  if(supabase && supabaseUser) {
    let q = supabase.from('pagos').update({estado: 'pagado'});
    if(p.id) q = q.eq('id', p.id);
    else { for(let k in p) { if(k!=='id'&&k!=='estado'&&k!=='created_at') q = q.eq(k, p[k]); } }
    const { error } = await q;
    if(error) console.error(error);
  }
  saveLocalData();
  renderPagos();
  renderResumen();
  toast('✅ Pago marcado como pagado');
}

async function eliminarPago(idx) {
  if(!confirm('¿Estás seguro de eliminar este pago?')) return;
  const item = pagos[idx];
  if(supabase) {
    const ok = await deleteFromSupabase('pagos', item);
    if(!ok) { toast('⚠️ Error al eliminar de Supabase'); return; }
  }
  pagos.splice(idx, 1);
  saveLocalData();
  renderPagos();
  renderResumen();
  toast('🗑️ Pago eliminado');
}

// --- Exportar a Excel (CSV) ---
function exportarCSV(data, filename, columns) {
  if(!data || !data.length) { toast('⚠️ No hay datos para exportar'); return; }
  let csv = columns.join(',') + '\n';
  data.forEach(item => {
    let row = columns.map(col => {
      let val = item[col] || '';
      return '"' + String(val).replace(/"/g, '""') + '"';
    });
    csv += row.join(',') + '\n';
  });
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename + '.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
function descargarAlumnos() { exportarCSV(alumnos, 'alumnos', ['nombre', 'edad', 'sucursal', 'tutor', 'telefono']); }
function descargarAsistencias() { 
  const filtradas = asistencias.filter(a => {
    const mesFiltro = document.getElementById('filtro-mes-asis')?.value;
    return mesFiltro ? a.fecha && a.fecha.startsWith(mesFiltro) : true;
  }).map(a => ({ ...a, nino: obtenerNombreNino(a) }));
  exportarCSV(filtradas, 'asistencias', ['nino', 'fecha', 'hora', 'tipo', 'notas']); 
}
function descargarPagos() { 
  const filtrados = pagos.map(p => ({ ...p, nino: obtenerNombreNino(p) }));
  exportarCSV(filtrados, 'pagos', ['nino', 'sucursal', 'monto', 'mes', 'estado', 'fecha_registro']); 
}
