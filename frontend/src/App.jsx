import { useEffect, useState, useCallback } from 'react'

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) })
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Erreur ' + res.status)
  return res.status === 204 || res.headers.get('content-length') === '0' ? null : res.json().catch(() => null)
}

export default function App() {
  const [tab, setTab] = useState('catalogue')
  const [msg, setMsg] = useState(null)
  const run = async (fn, ok) => { try { await fn(); setMsg(ok && { t: ok }) } catch (e) { setMsg({ t: e.message, err: true }) } }
  const tabs = { catalogue: 'Catalogue', emprunts: 'Emprunts et retours', retards: 'Retards', biblio: 'Espace bibliothécaire' }
  return (<>
    <header><h1>Bibliothèque universitaire</h1>
      <nav>{Object.entries(tabs).map(([k, v]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMsg(null) }}>{v}</button>)}</nav></header>
    <main>
      {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}
      {tab === 'catalogue' && <Catalogue />}
      {tab === 'emprunts' && <Loans run={run} />}
      {tab === 'retards' && <Overdue />}
      {tab === 'biblio' && <Librarian run={run} />}
    </main></>)
}

function useBooks(q = '') {
  const [books, setBooks] = useState([])
  const load = useCallback(() => api('/books?q=' + encodeURIComponent(q)).then(setBooks).catch(() => {}), [q])
  useEffect(() => { load() }, [load])
  return [books, load]
}

function Catalogue() {
  const [q, setQ] = useState('')
  const [books] = useBooks(q)
  return (<>
    <div className="row"><input placeholder="Titre, auteur, catégorie ou ISBN" value={q} onChange={e => setQ(e.target.value)} /></div>
    <table><thead><tr><th>Titre</th><th>Auteur</th><th>Catégorie</th><th>Disponibles</th></tr></thead>
      <tbody>{books.map(b => <tr key={b.id}><td>{b.title}</td><td>{b.author}</td><td>{b.category}</td><td>{b.availableCopies} / {b.totalCopies}</td></tr>)}
        {!books.length && <tr><td colSpan="4">Aucun ouvrage trouvé. Essayez un autre mot-clé.</td></tr>}</tbody></table></>)
}

function Loans({ run }) {
  const [books, reloadBooks] = useBooks()
  const [readers, setReaders] = useState([])
  const [active, setActive] = useState([])
  const [f, setF] = useState({ readerId: '', bookId: '' })
  const load = () => { api('/readers').then(setReaders); api('/loans/active').then(setActive); reloadBooks() }
  useEffect(load, [])
  return (<>
    <h2>Nouvel emprunt</h2>
    <div className="row">
      <select value={f.readerId} onChange={e => setF({ ...f, readerId: e.target.value })}><option value="">Lecteur…</option>{readers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.studentId})</option>)}</select>
      <select value={f.bookId} onChange={e => setF({ ...f, bookId: e.target.value })}><option value="">Ouvrage…</option>{books.filter(b => b.availableCopies > 0).map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select>
      <button className="p" disabled={!f.readerId || !f.bookId} onClick={() => run(async () => { await api('/loans', 'POST', { readerId: +f.readerId, bookId: +f.bookId }); load() }, 'Emprunt enregistré')}>Enregistrer l'emprunt</button></div>
    <h2>Emprunts en cours</h2>
    <table><thead><tr><th>Ouvrage</th><th>Lecteur</th><th>À rendre le</th><th></th></tr></thead>
      <tbody>{active.map(l => <tr key={l.id}><td>{l.book.title}</td><td>{l.reader.name}</td><td>{l.dueDate}</td>
        <td><button onClick={() => run(async () => { await api(`/loans/${l.id}/return`, 'POST'); load() }, 'Retour enregistré')}>Enregistrer le retour</button></td></tr>)}
        {!active.length && <tr><td colSpan="4">Aucun emprunt en cours.</td></tr>}</tbody></table></>)
}

function Overdue() {
  const [rows, setRows] = useState([])
  useEffect(() => { api('/loans/overdue').then(setRows) }, [])
  const days = d => Math.floor((Date.now() - new Date(d)) / 864e5)
  return (<table><thead><tr><th>Ouvrage</th><th>Lecteur</th><th>Email</th><th>Échéance</th><th>Retard</th></tr></thead>
    <tbody>{rows.map(l => <tr key={l.id}><td>{l.book.title}</td><td>{l.reader.name}</td><td>{l.reader.email}</td><td>{l.dueDate}</td><td className="late">{days(l.dueDate)} j</td></tr>)}
      {!rows.length && <tr><td colSpan="5">Aucun retard : tous les ouvrages sont dans les temps.</td></tr>}</tbody></table>)
}

const empty = { isbn: '', title: '', author: '', category: '', totalCopies: 1 }
function Librarian({ run }) {
  const [books, reload] = useBooks()
  const [b, setB] = useState(empty)
  const [r, setR] = useState({ name: '', email: '', studentId: '' })
  return (<>
    <h2>{b.id ? 'Modifier l\'ouvrage' : 'Ajouter un ouvrage'}</h2>
    <div className="row">
      {['title', 'author', 'category', 'isbn'].map(k => <input key={k} placeholder={{ title: 'Titre', author: 'Auteur', category: 'Catégorie', isbn: 'ISBN' }[k]} value={b[k]} onChange={e => setB({ ...b, [k]: e.target.value })} />)}
      <input type="number" min="1" style={{ maxWidth: 90 }} value={b.totalCopies} onChange={e => setB({ ...b, totalCopies: +e.target.value })} />
      <button className="p" disabled={!b.title} onClick={() => run(async () => { await api(b.id ? '/books/' + b.id : '/books', b.id ? 'PUT' : 'POST', b); setB(empty); reload() }, 'Ouvrage enregistré')}>Enregistrer l'ouvrage</button>
      {b.id && <button onClick={() => setB(empty)}>Annuler</button>}</div>
    <table><thead><tr><th>Titre</th><th>Auteur</th><th>Exemplaires</th><th></th></tr></thead>
      <tbody>{books.map(x => <tr key={x.id}><td>{x.title}</td><td>{x.author}</td><td>{x.availableCopies} / {x.totalCopies}</td>
        <td><button onClick={() => setB(x)}>Modifier</button> <button className="d" onClick={() => run(async () => { await api('/books/' + x.id, 'DELETE'); reload() }, 'Ouvrage supprimé')}>Supprimer</button></td></tr>)}</tbody></table>
    <h2>Ajouter un lecteur</h2>
    <div className="row">
      {['name', 'email', 'studentId'].map(k => <input key={k} placeholder={{ name: 'Nom complet', email: 'Email', studentId: 'N° étudiant' }[k]} value={r[k]} onChange={e => setR({ ...r, [k]: e.target.value })} />)}
      <button className="p" disabled={!r.name} onClick={() => run(async () => { await api('/readers', 'POST', r); setR({ name: '', email: '', studentId: '' }) }, 'Lecteur ajouté')}>Ajouter le lecteur</button></div></>)
}
