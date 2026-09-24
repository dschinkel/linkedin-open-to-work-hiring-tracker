import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const outputFolder = path.resolve('server/screenshots/fixtures')

const people = [
  { name: 'Avery Quinlan', headline: 'Staff Engineer at Northwind', frame: 'open', button: 'Follow' },
  { name: 'Bram Okonkwo', headline: 'Engineering Manager at Globex', frame: 'hiring', button: 'Following' },
  { name: 'Celia Marchetti', headline: 'Product Designer', frame: null, button: 'Follow' },
  { name: 'Dmitri Havel', headline: 'Senior Data Scientist at Initech', frame: 'open', button: 'Follow' },
  { name: 'Esme Talbot', headline: 'Talent Partner at Umbrella Health', frame: 'hiring', button: 'Following' },
  { name: 'Farid Nasser', headline: 'Frontend Engineer', frame: null, button: 'Follow' },
  { name: 'Greta Lindqvist', headline: 'VP Engineering at Hooli', frame: null, button: 'Follow' },
  { name: 'Hugo Ferreira', headline: 'DevOps Engineer at Pied Piper', frame: 'open', button: 'Following' },
]

const firstNames = ['Ines', 'Jonas', 'Kaia', 'Lorenzo', 'Mireille', 'Niall', 'Odette', 'Pavel', 'Quentin', 'Rosalind', 'Soren', 'Tamsin']
const lastNames = ['Abernathy', 'Blackwood', 'Castellano', 'Drummond', 'Ellery', 'Fairbanks', 'Galloway']
const roles = ['Backend Engineer', 'Recruiter at Vandelay', 'QA Lead', 'Solutions Architect at Contoso', 'Agile Coach']
const longList = Array.from({ length: 30 }, (_, index) => ({
  name: `${firstNames[index % firstNames.length]} ${lastNames[index % lastNames.length]}`,
  headline: roles[index % roles.length],
  frame: [null, null, 'open', null, 'hiring'][index % 5],
  button: index % 3 === 0 ? 'Following' : 'Follow',
}))
longList[20].lightPhoto = true
longList[20].followedBy = 'Followed by Sam and Priya'
longList[21].lightPhoto = true
longList[22].lightPhoto = true
longList.push({ name: 'Corwin Hale', headline: 'Talent Partner', frame: null, button: 'Follow', faint: true })

const colors = { open: '#448a3c', hiring: '#7a3ee8' }
const labels = { open: '#OPENTOWORK', hiring: '#HIRING' }

function avatar(person, index) {
  if (person.lightPhoto) return `<svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="32" fill="#fcfcfc"/><circle cx="36" cy="28" r="11" fill="#f2f2f2"/></svg>`
  const hue = (index * 67) % 360
  const frame = person.frame
    ? `<path d="M 6 36 A 30 30 0 0 0 66 36" fill="none" stroke="${colors[person.frame]}" stroke-width="9"/>
       <text font-size="6.5" font-weight="700" fill="#fff" font-family="Arial" dominant-baseline="central"><textPath href="#arc${index}" startOffset="50%" text-anchor="middle">${labels[person.frame]}</textPath></text>
       <path id="arc${index}" d="M 6 36 A 30 30 0 0 0 66 36" fill="none"/>`
    : ''
  return `<svg width="72" height="72" viewBox="0 0 72 72">
    <circle cx="36" cy="36" r="32" fill="hsl(${hue} 35% 72%)"/>
    <circle cx="36" cy="28" r="11" fill="hsl(${hue} 30% 45%)"/><ellipse cx="36" cy="58" rx="19" ry="14" fill="hsl(${hue} 30% 45%)"/>
    ${frame}
  </svg>`
}

function row(person, index) {
  return `<div class="row"><div class="avatar">${avatar(person, index)}</div>
    <div class="text${person.faint ? ' faint' : ''}"><div class="name">${person.name}</div><div class="headline">${person.headline}</div>${person.followedBy ? `<div class="followed">${person.followedBy}</div>` : ''}</div>
    <button class="${person.button === 'Following' ? 'on' : ''}">${person.button}</button></div>`
}

function page(rows, nameLevelWithPhotoTop = false) {
  return `<!doctype html><html><head><style>
    body { margin: 0; background: #f4f2ee; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
    .top { height: 52px; background: #fff; border-bottom: 1px solid #ddd; }
    .card { width: 760px; margin: 24px auto; background: #fff; border-radius: 8px; border: 1px solid #ddd; }
    .title { padding: 16px 20px; font-size: 18px; color: #333; border-bottom: 1px solid #eee; }
    .row { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #eee; }
    .avatar { width: 72px; height: 72px; flex: none; }
    .text { flex: 1; min-width: 0; }
    .name { font-size: 16px; font-weight: 600; color: #191919; }
    .headline { font-size: 14px; color: #555; margin-top: 2px; }
    button { border: 1px solid #0a66c2; color: #0a66c2; background: #fff; border-radius: 16px; padding: 6px 16px; font-size: 15px; font-weight: 600; }
    button.on { border-color: #666; color: #555; }
    .faint .name, .faint .headline { color: #d4d4d4; }
    .followed { font-size: 12px; color: #666; margin-top: 12px; line-height: 24px; padding-bottom: 18px; }
    ${nameLevelWithPhotoTop ? '.row { align-items: flex-start; } .row button { margin-top: 18px; }' : ''}
  </style></head><body><div class="top"></div><div class="card"><div class="title">Followers</div>${rows}</div></body></html>`
}

function render(name, subset, height, everyone = people) {
  const folder = mkdtempSync(path.join(tmpdir(), 'fixture-'))
  const html = path.join(folder, 'page.html')
  writeFileSync(html, page(subset.map((person) => row(person, everyone.indexOf(person))).join(''), everyone === longList))
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=900,${height}`, `--screenshot=${path.join(outputFolder, name)}`, `file://${html}`], { stdio: 'ignore' })
  console.log('rendered', name)
}

const connectionRoles = ['Platform Engineer', 'Director of Engineering at Wayne Enterprises | Mentor | Speaker on resilient distributed systems and teams', 'Data Analyst at Cyberdyne', 'Founder and CEO at Stark Robotics | Building calm software for hospitals, schools and city governments', 'Scrum Master']
const connectionsList = Array.from({ length: 28 }, (_, index) => ({
  name: `${firstNames[(index + 5) % firstNames.length]} ${lastNames[(index + 3) % lastNames.length]}`,
  headline: connectionRoles[index % connectionRoles.length],
  connectedOn: `Connected on ${['March', 'June', 'October'][index % 3]} ${index + 1}, 20${10 + (index % 15)}`,
}))

function connectionRow(person, index) {
  return `<div class="row"><div class="avatar">${avatar(person, index)}</div>
    <div class="text"><div class="name">${person.name}</div><div class="headline">${person.headline}</div><div class="connected">${person.connectedOn}</div></div>
    <button>Message</button><span class="more">···</span></div>`
}

function connectionsPage(list, seamAfter) {
  const rows = (from, to) => list.slice(from, to).map((person, index) => connectionRow(person, from + index)).join('')
  return `<!doctype html><html><head><style>
    body { margin: 0; background: #f4f2ee; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
    .card { width: 760px; margin: 24px auto; background: #fff; border-radius: 8px; border: 1px solid #ddd; }
    .title { padding: 16px 20px 4px; font-size: 18px; color: #333; }
    .tools { display: flex; justify-content: space-between; padding: 4px 20px 12px; font-size: 13px; color: #666; border-bottom: 1px solid #eee; }
    .tools span:last-child { border: 1px solid #999; border-radius: 4px; padding: 2px 40px 2px 8px; }
    .row { display: flex; align-items: flex-start; gap: 12px; padding: 7px 20px 7px 16px; border-bottom: 1px solid #eee; }
    .avatar { width: 72px; height: 72px; flex: none; }
    .text { flex: 1; min-width: 0; line-height: 1.2; padding-top: 12px; }
    .name { font-size: 16px; font-weight: 600; color: #191919; }
    .headline { font-size: 14px; color: #333; margin-top: 3px; }
    .connected { font-size: 13px; color: #666; margin-top: 1px; }
    button { margin-top: 20px; border: 1px solid #0a66c2; color: #0a66c2; background: #fff; border-radius: 16px; padding: 5px 14px; font-size: 15px; font-weight: 600; }
    .more { margin-top: 24px; color: #555; }
    .seam { margin-left: -6px; }
  </style></head><body><div class="card"><div class="title">${list.length} connections</div>
    <div class="tools"><span>Sort by: Recently added</span><span>Search by name</span></div>
    ${rows(0, seamAfter)}<div class="seam">${rows(seamAfter, list.length)}</div></div></body></html>`
}

function renderConnections(name, height) {
  const folder = mkdtempSync(path.join(tmpdir(), 'fixture-'))
  const html = path.join(folder, 'page.html')
  writeFileSync(html, connectionsPage(connectionsList, 22))
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=900,${height}`, `--screenshot=${path.join(outputFolder, name)}`, `file://${html}`], { stdio: 'ignore' })
  console.log('rendered', name)
}

render('Screenshot 2026-09-22 at 9.01.12 AM.png', people.slice(0, 5), 700)
render('Screenshot 2026-09-22 at 9.01.19 AM.png', people.slice(3, 8), 700)
render('Followers full page.png', longList, 3250, longList)
renderConnections('Connections full page.png', 2800)
