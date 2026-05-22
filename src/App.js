import { useState, useEffect, useCallback } from 'react';

const PROJECTS = ['HBK', 'Mamva', 'AcroFyah', 'Otro'];
const TIPOS = ['seguimiento', 'cotizacion', 'idea', 'tarea'];
const TIPO_LABELS = { seguimiento: 'Seguim.', cotizacion: 'Cotiz.', idea: 'Idea', tarea: 'Tarea' };
const STORAGE_KEY = 'sc_interactions';

function pad(n) { return String(n).padStart(2, '0'); }

function defaultReminderAt() {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(9, 0, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

function emptyForm() {
  return { project: 'HBK', tipo: 'seguimiento', client: '', description: '', reminderAt: defaultReminderAt() };
}

function loadData() {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    // migrar items viejos que usaban reminderDays
    return items.map(item => {
      if (!item.reminderAt && item.reminderDays) {
        const created = new Date(item.createdAt);
        const target = new Date(created.getTime() + item.reminderDays * 86400000);
        target.setHours(9, 0, 0, 0);
        return { ...item, reminderAt: target.toISOString() };
      }
      return item;
    });
  } catch {
    return [];
  }
}

function saveData(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function daysUntilReminder(item) {
  return Math.ceil((new Date(item.reminderAt) - Date.now()) / 86400000);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatReminder(item) {
  const t = new Date(item.reminderAt);
  const date = t.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  const time = t.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

function ReminderTag({ item }) {
  const days = daysUntilReminder(item);
  const label = formatReminder(item);
  if (days < 0) {
    return (
      <span className="reminder-tag overdue">
        <span className="dot overdue" />
        vencido · {label}
      </span>
    );
  }
  if (days <= 2) {
    return (
      <span className="reminder-tag due-soon">
        <span className="dot due-soon" />
        pronto · {label}
      </span>
    );
  }
  return (
    <span className="reminder-tag ok">
      <span className="dot ok" />
      {label}
    </span>
  );
}

function InteractionCard({ item, onDelete }) {
  const days = daysUntilReminder(item);
  const cardClass = [
    'interaction-card',
    days < 0 ? 'overdue' : days <= 2 ? 'due-soon' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <div className="card-top">
        <span className="badge badge-project">{item.project}</span>
        <span className={`badge badge-${item.tipo}`}>{TIPO_LABELS[item.tipo]}</span>
        <span className="card-client">{item.client}</span>
        <span className="card-date">{formatDate(item.createdAt)}</span>
        <button className="btn-delete" onClick={() => onDelete(item.id)} title="Eliminar">×</button>
      </div>
      <p className="card-desc">{item.description}</p>
      <div className="card-footer">
        <ReminderTag item={item} />
      </div>
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState(loadData);
  const [form, setForm] = useState(emptyForm);
  const [filterProject, setFilterProject] = useState('todos');
  const [filterTipo, setFilterTipo] = useState('todos');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => { saveData(items); }, [items]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.client.trim() || !form.description.trim()) return;
    const newItem = {
      id: Date.now().toString(),
      project: form.project,
      tipo: form.tipo,
      client: form.client.trim(),
      description: form.description.trim(),
      reminderAt: form.reminderAt || defaultReminderAt(),
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
    setForm(emptyForm());
    showToast('Interacción registrada');
  }

  function handleDelete(id) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const filtered = items.filter(item => {
    if (filterProject !== 'todos' && item.project !== filterProject) return false;
    if (filterTipo !== 'todos' && item.tipo !== filterTipo) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return item.client.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    }
    return true;
  });

  const overdue = items.filter(i => daysUntilReminder(i) < 0).length;
  const dueSoon = items.filter(i => { const d = daysUntilReminder(i); return d >= 0 && d <= 2; }).length;

  const projectCounts = PROJECTS.reduce((acc, p) => {
    acc[p] = items.filter(i => i.project === p).length;
    return acc;
  }, {});

  return (
    <div className="app">
      <header className="header">
        <span className="header-title">Segundo Cerebro</span>
        <span className="header-subtitle">gestión comercial</span>
      </header>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{items.length}</div>
          <div className="stat-sub">interacciones</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Vencidas</div>
          <div className="stat-value" style={{ color: overdue > 0 ? 'var(--red-main)' : 'var(--text-muted)' }}>{overdue}</div>
          <div className="stat-sub">recordatorios</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Próximas</div>
          <div className="stat-value" style={{ color: dueSoon > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>{dueSoon}</div>
          <div className="stat-sub">en 2 días</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Top proyecto</div>
          <div className="stat-value" style={{ fontSize: 16 }}>
            {PROJECTS.reduce((a, b) => (projectCounts[a] >= projectCounts[b] ? a : b), PROJECTS[0])}
          </div>
          <div className="stat-sub">{Math.max(...Object.values(projectCounts))} interac.</div>
        </div>
      </div>

      <div className="main-grid">
        {/* Form panel */}
        <div className="panel">
          <div className="panel-title">Nueva interacción</div>
          <form className="form" onSubmit={handleSubmit}>

            <div className="field">
              <label>Proyecto</label>
              <select value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))}>
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="field">
              <label>Tipo</label>
              <div className="segment">
                {TIPOS.map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`segment-btn${form.tipo === t ? ' active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  >
                    {TIPO_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Cliente</label>
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={form.client}
                onChange={e => setForm(f => ({ ...f, client: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label>Descripción</label>
              <textarea
                placeholder="¿Qué pasó? ¿Qué acordaron?"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label>Recordatorio — fecha y hora</label>
              <input
                type="datetime-local"
                value={form.reminderAt}
                onChange={e => setForm(f => ({ ...f, reminderAt: e.target.value }))}
                required
              />
            </div>

            <button type="submit" className="btn-submit">+ Registrar</button>
          </form>
        </div>

        {/* List panel */}
        <div>
          <div className="filter-bar">
            <button
              className={`filter-chip${filterProject === 'todos' ? ' active' : ''}`}
              onClick={() => setFilterProject('todos')}
            >todos</button>
            {PROJECTS.map(p => (
              <button
                key={p}
                className={`filter-chip${filterProject === p ? ' active' : ''}`}
                onClick={() => setFilterProject(p)}
              >{p}</button>
            ))}
            <button
              className={`filter-chip${filterTipo === 'todos' ? ' active' : ''}`}
              onClick={() => setFilterTipo('todos')}
              style={{ marginLeft: 4 }}
            >todos tipos</button>
            {TIPOS.map(t => (
              <button
                key={t}
                className={`filter-chip${filterTipo === t ? ' active' : ''}`}
                onClick={() => setFilterTipo(t)}
              >{TIPO_LABELS[t]}</button>
            ))}
            <input
              className="filter-search"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="interaction-list">
            {filtered.length === 0 ? (
              <div className="empty-state">
                {items.length === 0 ? 'Registrá tu primera interacción.' : 'Sin resultados para este filtro.'}
              </div>
            ) : (
              filtered.map(item => (
                <InteractionCard key={item.id} item={item} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
