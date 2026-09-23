// Renders synthetic LinkedIn-style list screenshots (the frame label is centred in its band, as on LinkedIn) (fictional people) for the screenshot-reader tests.
// Usage: node scripts/render-screenshot-fixtures.mjs   (needs Google Chrome installed)
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

const colors = { open: '#448a3c', hiring: '#7a3ee8' }
const labels = { open: '#OPENTOWORK', hiring: '#HIRING' }

function avatar(person, index) {
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
    <div class="text"><div class="name">${person.name}</div><div class="headline">${person.headline}</div></div>
    <button class="${person.button === 'Following' ? 'on' : ''}">${person.button}</button></div>`
}

function page(rows) {
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
  </style></head><body><div class="top"></div><div class="card"><div class="title">Followers</div>${rows}</div></body></html>`
}

function render(name, subset, height) {
  const folder = mkdtempSync(path.join(tmpdir(), 'fixture-'))
  const html = path.join(folder, 'page.html')
  writeFileSync(html, page(subset.map((person) => row(person, people.indexOf(person))).join('')))
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2', `--window-size=900,${height}`, `--screenshot=${path.join(outputFolder, name)}`, `file://${html}`], { stdio: 'ignore' })
  console.log('rendered', name)
}

// Two overlapping screenshots, as when scrolling: the last two people of the first appear again at the top of the second.
render('Screenshot 2026-09-22 at 9.01.12 AM.png', people.slice(0, 5), 700)
render('Screenshot 2026-09-22 at 9.01.19 AM.png', people.slice(3, 8), 700)
