import "dotenv/config";
import prisma from "./db";

const PORT = 5555;
const DB_HOST = "127.0.0.1:5432";
const DB_NAME = "helpdesk";

async function getCounts() {
  try {
    const [tickets, users, replies, sessions, accounts] = await Promise.all([
      prisma.ticket.count().catch(() => 0),
      prisma.user.count().catch(() => 0),
      prisma.reply.count().catch(() => 0),
      prisma.session.count().catch(() => 0),
      prisma.account.count().catch(() => 0),
    ]);
    return { tickets, users, replies, sessions, accounts };
  } catch (e) {
    return { tickets: 0, users: 0, replies: 0, sessions: 0, accounts: 0 };
  }
}

const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Database Studio | Helpdesk</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎫</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: {
              dark: '#0a0d16',
              sidebar: '#0f1422',
              card: '#13192b',
              border: '#1f2942',
              accent: '#6366f1',
              active: '#1e1b4b'
            }
          }
        }
      }
    }
  </script>
  <style>
    body {
      background-color: #090c15;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .json-key { color: #38bdf8; }
    .json-string { color: #34d399; }
    .json-number { color: #fb923c; }
    .json-boolean { color: #a78bfa; }
    .json-null { color: #f472b6; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: #0b0e18; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #334155; }
  </style>
</head>
<body class="h-screen flex flex-col overflow-hidden select-none">

  <!-- Header -->
  <header class="h-16 bg-[#0d121f] border-b border-[#1b2339] px-6 flex items-center justify-between flex-shrink-0">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <ellipse cx="12" cy="5" rx="9" ry="3" stroke-width="2"/>
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke-width="2"/>
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke-width="2"/>
        </svg>
      </div>
      <div>
        <h1 class="text-base font-bold text-white tracking-wide">Helpdesk Database Studio</h1>
        <p class="text-xs text-[#707e9e]">PostgreSQL @ ${DB_HOST} &bull; Database: <span class="text-indigo-400 font-medium">${DB_NAME}</span></p>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Connected
      </div>
      <a href="http://localhost:5173" target="_blank" class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#141b2e] hover:bg-[#1a233b] border border-[#232e4d] text-xs font-medium text-slate-200 transition-all hover:text-white">
        <span>🚀 Open App (5173)</span>
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
        </svg>
      </a>
    </div>
  </header>

  <!-- Body -->
  <div class="flex-1 flex overflow-hidden">
    <!-- Sidebar -->
    <aside class="w-64 bg-[#0a0e19] border-r border-[#1a233a] flex flex-col justify-between p-4 flex-shrink-0">
      <div class="space-y-1">
        <div class="text-[11px] font-semibold uppercase tracking-wider text-[#526084] px-3 py-2">Tables</div>
        
        <button onclick="selectTable('ticket', 'Tickets')" id="nav-ticket" class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#8ea0c6] hover:text-white hover:bg-[#12192c] transition-all">
          <div class="flex items-center gap-2.5">
            <span class="text-amber-400">🎫</span>
            <span>Tickets</span>
          </div>
          <span id="badge-tickets" class="px-2 py-0.5 text-xs rounded-md bg-[#162038] text-[#7d92be] font-mono">0</span>
        </button>

        <button onclick="selectTable('user', 'Users')" id="nav-user" class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#8ea0c6] hover:text-white hover:bg-[#12192c] transition-all">
          <div class="flex items-center gap-2.5">
            <span class="text-purple-400">👥</span>
            <span>Users</span>
          </div>
          <span id="badge-users" class="px-2 py-0.5 text-xs rounded-md bg-[#162038] text-[#7d92be] font-mono">0</span>
        </button>

        <button onclick="selectTable('reply', 'Replies')" id="nav-reply" class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#8ea0c6] hover:text-white hover:bg-[#12192c] transition-all">
          <div class="flex items-center gap-2.5">
            <span class="text-sky-400">💬</span>
            <span>Replies</span>
          </div>
          <span id="badge-replies" class="px-2 py-0.5 text-xs rounded-md bg-[#162038] text-[#7d92be] font-mono">0</span>
        </button>

        <button onclick="selectTable('session', 'Sessions')" id="nav-session" class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#8ea0c6] hover:text-white hover:bg-[#12192c] transition-all">
          <div class="flex items-center gap-2.5">
            <span class="text-amber-500">🔑</span>
            <span>Sessions</span>
          </div>
          <span id="badge-sessions" class="px-2 py-0.5 text-xs rounded-md bg-[#162038] text-[#7d92be] font-mono">0</span>
        </button>

        <button onclick="selectTable('account', 'Accounts')" id="nav-account" class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#8ea0c6] hover:text-white hover:bg-[#12192c] transition-all">
          <div class="flex items-center gap-2.5">
            <span class="text-blue-400">🛡️</span>
            <span>Accounts</span>
          </div>
          <span id="badge-accounts" class="px-2 py-0.5 text-xs rounded-md bg-[#162038] text-[#7d92be] font-mono">0</span>
        </button>
      </div>

      <!-- SQL Query Runner Link -->
      <div class="pt-4 border-t border-[#172033]">
        <button onclick="openConsole()" id="nav-console" class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 transition-all">
          <span class="text-indigo-400">⚡</span>
          <span>SQL Query Runner</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col bg-[#080b13] overflow-hidden p-6">
      
      <!-- SQL CONSOLE VIEW -->
      <div id="view-console" class="flex-1 flex flex-col space-y-4 overflow-hidden">
        <div class="flex items-center justify-between flex-shrink-0">
          <span class="text-xs font-bold uppercase tracking-wider text-[#69799f]">EXECUTE CUSTOM SQL QUERY</span>
          <div class="flex items-center gap-2">
            <button onclick="setSample('SELECT * FROM ticket LIMIT 5;')" class="px-3 py-1.5 rounded-md bg-[#12182b] hover:bg-[#1a233f] border border-[#222c4a] text-xs font-medium text-slate-300 hover:text-white transition-all">
              Sample Ticket Query
            </button>
            <button onclick="setSample('SELECT * FROM \\\"user\\\" LIMIT 5;')" class="px-3 py-1.5 rounded-md bg-[#12182b] hover:bg-[#1a233f] border border-[#222c4a] text-xs font-medium text-slate-300 hover:text-white transition-all">
              Sample Users Query
            </button>
          </div>
        </div>

        <!-- Query Input -->
        <div class="rounded-xl bg-[#0d1220] border border-[#1d2742] p-3 shadow-inner flex-shrink-0">
          <textarea id="sql-input" rows="4" class="w-full bg-transparent text-[#34d399] font-mono text-sm resize-none focus:outline-none focus:ring-0 leading-relaxed" spellcheck="false">SELECT * FROM ticket LIMIT 5;</textarea>
        </div>

        <!-- Run Controls -->
        <div class="flex items-center justify-between flex-shrink-0">
          <button onclick="executeSQL()" id="btn-run" class="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/25 active:scale-95">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>Run Query</span>
          </button>

          <div id="status-badge" class="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            <span id="status-text">Ready</span>
          </div>
        </div>

        <!-- Results Box -->
        <div class="flex-1 rounded-xl bg-[#0d1220] border border-[#1b253e] p-4 overflow-auto font-mono text-xs shadow-inner">
          <pre id="json-result" class="text-slate-300 leading-relaxed"></pre>
        </div>
      </div>

      <!-- TABLE VIEW -->
      <div id="view-table" class="flex-1 flex flex-col space-y-4 overflow-hidden hidden">
        <div class="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 id="table-title" class="text-lg font-bold text-white">Tickets</h2>
            <p id="table-subtitle" class="text-xs text-[#707e9e]">Showing records from database</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="openInConsole()" class="px-3 py-1.5 rounded-md bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-medium text-indigo-300">
              ⚡ Open in SQL Runner
            </button>
          </div>
        </div>

        <div class="flex-1 rounded-xl bg-[#0d1220] border border-[#1b253e] overflow-auto shadow-inner">
          <table class="w-full text-left text-xs font-mono border-collapse" id="data-table">
            <thead class="bg-[#12192c] text-[#8ea0c6] uppercase tracking-wider sticky top-0 border-b border-[#1b253e]" id="table-head"></thead>
            <tbody class="divide-y divide-[#172036] text-slate-200" id="table-body"></tbody>
          </table>
        </div>
      </div>

    </main>
  </div>

  <script>
    let currentTable = 'ticket';

    function syntaxHighlight(json) {
      if (typeof json != 'string') {
        json = JSON.stringify(json, undefined, 2);
      }
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return json.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
        var cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      });
    }

    async function updateCounts() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.counts) {
          document.getElementById('badge-tickets').innerText = data.counts.tickets;
          document.getElementById('badge-users').innerText = data.counts.users;
          document.getElementById('badge-replies').innerText = data.counts.replies;
          document.getElementById('badge-sessions').innerText = data.counts.sessions;
          document.getElementById('badge-accounts').innerText = data.counts.accounts;
        }
      } catch (e) {
        console.error(e);
      }
    }

    function setSample(sql) {
      document.getElementById('sql-input').value = sql;
      executeSQL();
    }

    function openConsole() {
      window.location.hash = '#view=console';
      document.getElementById('view-console').classList.remove('hidden');
      document.getElementById('view-table').classList.add('hidden');
      
      document.getElementById('nav-console').className = 'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600/20 border border-indigo-500/40 transition-all';
      ['ticket', 'user', 'reply', 'session', 'account'].forEach(t => {
        const el = document.getElementById('nav-' + t);
        if (el) el.className = 'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#8ea0c6] hover:text-white hover:bg-[#12192c] transition-all';
      });
    }

    function openInConsole() {
      const q = currentTable === 'user' ? 'SELECT * FROM "user" LIMIT 10;' : ('SELECT * FROM ' + currentTable + ' LIMIT 10;');
      document.getElementById('sql-input').value = q;
      openConsole();
      executeSQL();
    }

    async function selectTable(tableName, label) {
      currentTable = tableName;
      window.location.hash = '#table=' + tableName;
      document.getElementById('view-console').classList.add('hidden');
      document.getElementById('view-table').classList.remove('hidden');

      document.getElementById('nav-console').className = 'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[#8ea0c6] hover:text-white hover:bg-[#12192c] transition-all border border-transparent';
      ['ticket', 'user', 'reply', 'session', 'account'].forEach(t => {
        const el = document.getElementById('nav-' + t);
        if (el) {
          if (t === tableName) {
            el.className = 'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-[#16203a] border border-[#233157] transition-all';
          } else {
            el.className = 'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-[#8ea0c6] hover:text-white hover:bg-[#12192c] transition-all border border-transparent';
          }
        }
      });

      document.getElementById('table-title').innerText = label;
      document.getElementById('table-subtitle').innerText = 'Loading records for ' + tableName + '...';

      try {
        const res = await fetch('/api/table/' + tableName);
        const data = await res.json();
        
        document.getElementById('table-subtitle').innerText = 'Showing ' + data.rows.length + ' records';
        
        const thead = document.getElementById('table-head');
        const tbody = document.getElementById('table-body');
        thead.innerHTML = '';
        tbody.innerHTML = '';

        if (!data.rows || data.rows.length === 0) {
          tbody.innerHTML = '<tr><td colspan="10" class="p-8 text-center text-slate-500">No records found in table ' + tableName + '</td></tr>';
          return;
        }

        const cols = Object.keys(data.rows[0]);
        let htr = '<tr>';
        cols.forEach(c => {
          htr += '<th class="px-4 py-3 font-semibold">' + c + '</th>';
        });
        htr += '</tr>';
        thead.innerHTML = htr;

        data.rows.forEach(r => {
          let btr = '<tr class="hover:bg-[#121a2e] transition-colors">';
          cols.forEach(c => {
            let val = r[c];
            if (val === null || val === undefined) val = '<span class="text-slate-600 italic">null</span>';
            else if (typeof val === 'object') val = JSON.stringify(val);
            else if (typeof val === 'string' && val.length > 50) val = val.substring(0, 50) + '...';
            btr += '<td class="px-4 py-3 border-t border-[#162038] truncate max-w-xs">' + val + '</td>';
          });
          btr += '</tr>';
          tbody.innerHTML += btr;
        });

      } catch (err) {
        document.getElementById('table-subtitle').innerText = 'Error loading table: ' + err.message;
      }
    }

    async function executeSQL() {
      const sql = document.getElementById('sql-input').value.trim();
      const statusBadge = document.getElementById('status-badge');
      const statusText = document.getElementById('status-text');
      const jsonResult = document.getElementById('json-result');

      statusBadge.className = 'flex items-center gap-1.5 text-xs font-medium text-amber-400';
      statusText.innerText = 'Running query...';

      try {
        const res = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        const data = await res.json();

        if (data.success) {
          statusBadge.className = 'flex items-center gap-1.5 text-xs font-medium text-emerald-400';
          statusText.innerHTML = '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Success (' + data.count + ' rows returned)';
          jsonResult.innerHTML = syntaxHighlight(data.rows);
        } else {
          statusBadge.className = 'flex items-center gap-1.5 text-xs font-medium text-rose-400';
          statusText.innerHTML = 'Error: ' + data.error;
          jsonResult.innerText = data.error;
        }
      } catch (err) {
        statusBadge.className = 'flex items-center gap-1.5 text-xs font-medium text-rose-400';
        statusText.innerText = 'Network error: ' + err.message;
        jsonResult.innerText = err.message;
      }
    }

    // Keyboard shortcut: Ctrl + Enter to run
    document.getElementById('sql-input').addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeSQL();
      }
    });

    // Initial load
    updateCounts();
    if (window.location.hash.startsWith('#table=')) {
      const t = window.location.hash.replace('#table=', '');
      selectTable(t, t.charAt(0).toUpperCase() + t.slice(1));
    } else {
      openConsole();
      executeSQL();
    }
  </script>
</body>
</html>`;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // API: Status and table counts
    if (url.pathname === "/api/status") {
      const counts = await getCounts();
      return Response.json({
        status: "ok",
        host: DB_HOST,
        database: DB_NAME,
        counts,
      });
    }

    // API: Run raw SQL
    if (url.pathname === "/api/query" && req.method === "POST") {
      try {
        const body = (await req.json()) as { sql: string };
        const sql = body.sql?.trim();
        if (!sql) {
          return Response.json({ success: false, error: "Empty SQL query" }, { status: 400 });
        }

        const rows = await prisma.$queryRawUnsafe(sql);
        const serialized = JSON.parse(
          JSON.stringify(rows, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        );

        return Response.json({
          success: true,
          count: Array.isArray(serialized) ? serialized.length : 1,
          rows: serialized,
        });
      } catch (err: any) {
        return Response.json({ success: false, error: err.message }, { status: 400 });
      }
    }

    // API: Table records
    if (url.pathname.startsWith("/api/table/")) {
      const table = url.pathname.replace("/api/table/", "").trim();
      const allowed = ["ticket", "user", "reply", "session", "account", "verification"];
      if (!allowed.includes(table)) {
        return Response.json({ error: "Invalid table name" }, { status: 400 });
      }

      try {
        const safeQuery = table === "user" ? 'SELECT * FROM "user" LIMIT 100;' : `SELECT * FROM ${table} LIMIT 100;`;
        const rows = await prisma.$queryRawUnsafe(safeQuery);
        const serialized = JSON.parse(
          JSON.stringify(rows, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        );
        return Response.json({ count: serialized.length, rows: serialized });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // Default: Serve Studio Single Page App
    return new Response(HTML_CONTENT, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  },
});

console.log(`✨ Helpdesk Database Studio running on http://localhost:${PORT}`);
