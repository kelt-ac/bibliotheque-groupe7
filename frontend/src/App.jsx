import { useEffect, useState, useCallback } from 'react'

const getSession = () => JSON.parse(localStorage.getItem('session') || 'null')

async function api(path, method = 'GET', body) {
  const s = getSession()
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(s && { Authorization: 'Bearer ' + s.token }) },
    body: body && JSON.stringify(body)
  })
  if (res.status === 401 && s) { localStorage.removeItem('session'); location.reload() }   // session expirée
  if (res.status === 403) throw new Error('Accès refusé : droits insuffisants')
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Erreur ' + res.status)
  return res.status === 204 || res.headers.get('content-length') === '0' ? null : res.json().catch(() => null)
}

export default function App() {
  const [session, setSession] = useState(getSession())
  const [tab, setTab] = useState('catalogue')
  const [msg, setMsg] = useState(null)
  const run = async (fn, ok) => { try { await fn(); setMsg(ok && { t: ok }) } catch (e) { setMsg({ t: e.message, err: true }) } }
  const role = session?.role
  const tabs = {
    catalogue: 'Catalogue',
    ...(role === 'READER' && { mes: 'Mes emprunts' }),
    ...(role === 'LIBRARIAN' && { emprunts: 'Emprunts et retours', retards: 'Retards', biblio: 'Espace bibliothécaire' }),
    ...(session && { compte: 'Mon compte' }),
    ...(!session && { login: 'Connexion' })
  }
  const [askLogout, setAskLogout] = useState(false)
  const logout = () => { localStorage.removeItem('session'); setSession(null); setTab('catalogue'); setMsg(null) }
  const onLogin = s => { localStorage.setItem('session', JSON.stringify(s)); setSession(s); setTab('catalogue'); setMsg(null) }
  return (<>
    <header>
      <div className="top"><h1>Bibliothèque universitaire</h1>
        {session && <span>{session.username} ({role === 'LIBRARIAN' ? 'bibliothécaire' : 'lecteur'}) <button onClick={() => setAskLogout(true)}>Déconnexion</button></span>}</div>
      <nav>{Object.entries(tabs).map(([k, v]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMsg(null) }}>{v}</button>)}</nav></header>
    <main>
      {msg && <div className={'msg' + (msg.err ? ' err' : '')}>{msg.t}</div>}
      {tab === 'catalogue' && <Catalogue />}
      {tab === 'login' && !session && <Login onLogin={onLogin} />}
      {tab === 'compte' && session && <Account run={run} />}
      {tab === 'mes' && role === 'READER' && <MyLoans />}
      {tab === 'emprunts' && role === 'LIBRARIAN' && <Loans run={run} />}
      {tab === 'retards' && role === 'LIBRARIAN' && <Overdue />}
      {tab === 'biblio' && role === 'LIBRARIAN' && <Librarian run={run} />}
    </main>
    {askLogout && <ConfirmLogout onCancel={() => setAskLogout(false)} onConfirm={() => { setAskLogout(false); logout() }} />}</>)
}

function Login({ onLogin }) {
  const [reg, setReg] = useState(false)
  const [f, setF] = useState({ username: '', password: '', name: '', email: '', studentId: '' })
  const [err, setErr] = useState(null)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const submit = async () => { try { onLogin(await api(reg ? '/auth/register' : '/auth/login', 'POST', f)) } catch (e) { setErr(e.message) } }
  return (<>
    <h2>{reg ? 'Créer un compte lecteur' : 'Connexion'}</h2>
    {err && <div className="msg err">{err}</div>}
    <div className="row">
      <input placeholder="Nom d'utilisateur" value={f.username} onChange={set('username')} />
      <input type="password" placeholder="Mot de passe (8 caractères min.)" value={f.password} onChange={set('password')} onKeyDown={e => e.key === 'Enter' && !reg && submit()} />
      {reg && <><input placeholder="Nom complet" value={f.name} onChange={set('name')} /><input placeholder="Email" value={f.email} onChange={set('email')} /><input placeholder="N° étudiant" value={f.studentId} onChange={set('studentId')} /></>}
      <button className="p" onClick={submit}>{reg ? 'Créer le compte' : 'Se connecter'}</button></div>
    <button onClick={() => { setReg(!reg); setErr(null) }}>{reg ? "J'ai déjà un compte" : 'Créer un compte lecteur'}</button></>)
}

function MyLoans() {
  const [rows, setRows] = useState([])
  useEffect(() => { api('/loans/mine').then(setRows).catch(() => {}) }, [])
  const today = new Date().toISOString().slice(0, 10)
  return (<table><thead><tr><th>Ouvrage</th><th>Emprunté le</th><th>À rendre le</th><th>Statut</th></tr></thead>
    <tbody>{rows.map(l => <tr key={l.id}><td>{l.book.title}</td><td>{l.loanDate}</td><td>{l.dueDate}</td>
      <td className={!l.returnDate && l.dueDate < today ? 'late' : ''}>{l.returnDate ? 'Rendu le ' + l.returnDate : l.dueDate < today ? 'En retard' : 'En cours'}</td></tr>)}
      {!rows.length && <tr><td colSpan="4">Vous n'avez aucun emprunt.</td></tr>}</tbody></table>)
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

function Account({ run }) {
  const empty = { currentPassword: '', newPassword: '', confirm: '' }
  const [f, setF] = useState(empty)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const submit = () => run(async () => {
    if (f.newPassword !== f.confirm) throw new Error('La confirmation ne correspond pas au nouveau mot de passe')
    await api('/auth/password', 'POST', { currentPassword: f.currentPassword, newPassword: f.newPassword })
    setF(empty)
  }, 'Mot de passe modifié')
  return (<>
    <h2>Changer mon mot de passe</h2>
    <div className="row">
      <input type="password" autoComplete="current-password" placeholder="Mot de passe actuel" value={f.currentPassword} onChange={set('currentPassword')} />
      <input type="password" autoComplete="new-password" placeholder="Nouveau mot de passe (8 caractères min.)" value={f.newPassword} onChange={set('newPassword')} />
      <input type="password" autoComplete="new-password" placeholder="Confirmer le nouveau mot de passe" value={f.confirm} onChange={set('confirm')} onKeyDown={e => e.key === 'Enter' && f.currentPassword && f.newPassword && f.confirm && submit()} />
      <button className="p" disabled={!f.currentPassword || !f.newPassword || !f.confirm} onClick={submit}>Modifier le mot de passe</button></div></>)
}

function ConfirmLogout({ onCancel, onConfirm }) {
  useEffect(() => {
    const k = e => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onCancel])
  return (<div className="overlay" onClick={onCancel}>
    <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title" onClick={e => e.stopPropagation()}>
      <h2 id="dlg-title">Se déconnecter ?</h2>
      <p>Vous devrez saisir à nouveau vos identifiants pour retrouver votre compte.</p>
      <div className="row"><button onClick={onCancel} autoFocus>Annuler</button><button className="p" onClick={onConfirm}>Se déconnecter</button></div></div></div>)
}
