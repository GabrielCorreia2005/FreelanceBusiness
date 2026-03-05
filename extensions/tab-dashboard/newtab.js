/**
 * Focus Tab Dashboard — newtab.js
 * Features: real-time clock, greeting, daily focus, tasks with persistence,
 * motivational quotes rotation, quick links, Pomodoro timer.
 * All data stored in chrome.storage.local.
 */

// ─── Quotes ───────────────────────────────────────────────────────────────────
const QUOTES = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
    { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
    { text: "It's not about having time. It's about making time.", author: "Unknown" },
    { text: "Small daily improvements are the key to staggering long-term results.", author: "Unknown" },
    { text: "Productivity is never an accident. It is always the result of a commitment to excellence.", author: "Paul J. Meyer" },
    { text: "You can always edit a bad page. You can't edit a blank page.", author: "Jodi Picoult" },
    { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
    { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
    { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
    { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The most effective way to do it, is to do it.", author: "Amelia Earhart" }
];

// ─── Utils ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, '0');

function getGreeting(h) {
    if (h < 5) return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
}

// ─── Clock ────────────────────────────────────────────────────────────────────
function updateClock() {
    const now = new Date();
    $('clock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    $('greeting').textContent = getGreeting(now.getHours());
    $('dateDisplay').textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
updateClock();
setInterval(updateClock, 1000);

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadData(key, defaultVal) {
    return new Promise(resolve => {
        chrome.storage.local.get(key, data => resolve(data[key] ?? defaultVal));
    });
}
function saveData(key, val) {
    return chrome.storage.local.set({ [key]: val });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
let tasks = [];

async function initTasks() {
    tasks = await loadData('tasks', []);
    renderTasks();
}

function renderTasks() {
    const list = $('taskList');
    if (tasks.length === 0) {
        list.innerHTML = '<li class="empty-state">No tasks yet — add one above ☝️</li>';
    } else {
        list.innerHTML = tasks.map((t, i) => `
      <li class="task-item ${t.done ? 'done' : ''}">
        <input type="checkbox" id="task-${i}" ${t.done ? 'checked' : ''} onchange="toggleTask(${i})">
        <label for="task-${i}">${escapeHtml(t.text)}</label>
        <button class="del-btn" onclick="deleteTask(${i})">✕</button>
      </li>`).join('');
    }
    updateStats();
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

window.toggleTask = (i) => {
    tasks[i].done = !tasks[i].done;
    saveData('tasks', tasks);
    renderTasks();
};

window.deleteTask = (i) => {
    tasks.splice(i, 1);
    saveData('tasks', tasks);
    renderTasks();
};

$('addTaskBtn').onclick = () => {
    $('addTaskForm').classList.toggle('hidden');
    if (!$('addTaskForm').classList.contains('hidden')) $('taskInput').focus();
};

$('saveTaskBtn').onclick = () => {
    const text = $('taskInput').value.trim();
    if (!text) return;
    tasks.push({ text, done: false, created: Date.now() });
    saveData('tasks', tasks);
    $('taskInput').value = '';
    $('addTaskForm').classList.add('hidden');
    renderTasks();
};

$('taskInput').onkeydown = e => { if (e.key === 'Enter') $('saveTaskBtn').click(); };

function updateStats() {
    const done = tasks.filter(t => t.done).length;
    $('tasksCompleted').textContent = done;
    $('tasksPending').textContent = tasks.length - done;
}

// ─── Focus input persistence ──────────────────────────────────────────────────
async function initFocus() {
    const focus = await loadData('dailyFocus', '');
    const today = new Date().toDateString();
    const savedDate = await loadData('dailyFocusDate', '');
    $('focusInput').value = (savedDate === today) ? focus : '';
    $('focusInput').oninput = () => {
        saveData('dailyFocus', $('focusInput').value);
        saveData('dailyFocusDate', today);
    };
}

// ─── Streak ───────────────────────────────────────────────────────────────────
async function initStreak() {
    const today = new Date().toDateString();
    const lastVisit = await loadData('lastVisit', '');
    let streak = await loadData('streak', 0);

    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);

    if (lastVisit === yesterday.toDateString()) { streak++; }
    else if (lastVisit !== today) { streak = 1; }

    saveData('lastVisit', today);
    saveData('streak', streak);
    $('streakCount').textContent = streak;
}

// ─── Quotes ───────────────────────────────────────────────────────────────────
let currentQuoteIndex = 0;

async function initQuote() {
    currentQuoteIndex = await loadData('quoteIndex', Math.floor(Math.random() * QUOTES.length));
    showQuote();
}

function showQuote() {
    const q = QUOTES[currentQuoteIndex];
    $('quoteText').textContent = `"${q.text}"`;
    $('quoteAuthor').textContent = `— ${q.author}`;
}

$('refreshQuoteBtn').onclick = () => {
    currentQuoteIndex = (currentQuoteIndex + 1) % QUOTES.length;
    saveData('quoteIndex', currentQuoteIndex);
    showQuote();
};

// ─── Quick links ──────────────────────────────────────────────────────────────
const DEFAULT_LINKS = [
    { name: 'Gmail', url: 'https://mail.google.com' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'ChatGPT', url: 'https://chat.openai.com' },
    { name: 'Notion', url: 'https://notion.so' }
];
let links = [];

async function initLinks() {
    links = await loadData('quickLinks', DEFAULT_LINKS);
    renderLinks();
}

function renderLinks() {
    const container = $('linksList');
    if (links.length === 0) {
        container.innerHTML = '<p class="empty-state">Add quick links above</p>';
        return;
    }
    container.innerHTML = links.map((l, i) => `
    <a class="link-item" href="${l.url}" title="${l.url}">
      <img class="link-favicon" src="https://www.google.com/s2/favicons?sz=16&domain=${encodeURIComponent(l.url)}" onerror="this.style.display='none'">
      ${escapeHtml(l.name)}
    </a>`).join('');
}

$('addLinkBtn').onclick = () => {
    $('addLinkForm').classList.toggle('hidden');
    if (!$('addLinkForm').classList.contains('hidden')) $('linkNameInput').focus();
};

$('saveLinkBtn').onclick = () => {
    const name = $('linkNameInput').value.trim();
    let url = $('linkUrlInput').value.trim();
    if (!name || !url) return;
    if (!url.startsWith('http')) url = 'https://' + url;
    links.push({ name, url });
    saveData('quickLinks', links);
    $('linkNameInput').value = '';
    $('linkUrlInput').value = '';
    $('addLinkForm').classList.add('hidden');
    renderLinks();
};

// ─── Pomodoro ─────────────────────────────────────────────────────────────────
const MODES = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
const MODE_LABELS = { focus: 'Focus', short: 'Short Break', long: 'Long Break' };
let pmMode = 'focus';
let pmSeconds = MODES.focus;
let pmRunning = false;
let pmInterval = null;
let pmDone = 0;

function updatePomodoroDisplay() {
    const m = Math.floor(pmSeconds / 60);
    const s = pmSeconds % 60;
    $('pomodoroTime').textContent = `${pad(m)}:${pad(s)}`;

    const total = MODES[pmMode];
    const fraction = pmSeconds / total;
    const circumference = 2 * Math.PI * 52;
    $('pomodoroRing').style.strokeDashoffset = circumference * fraction;
    $('pomodoroCount').textContent = pmDone;
}

$('pomodoroStartBtn').onclick = () => {
    if (pmRunning) {
        clearInterval(pmInterval);
        pmRunning = false;
        $('pomodoroStartBtn').textContent = '▶ Resume';
    } else {
        pmRunning = true;
        $('pomodoroStartBtn').textContent = '⏸ Pause';
        pmInterval = setInterval(() => {
            pmSeconds--;
            if (pmSeconds <= 0) {
                clearInterval(pmInterval);
                pmRunning = false;
                $('pomodoroStartBtn').textContent = '▶ Start';
                if (pmMode === 'focus') pmDone++;
                pmMode = pmMode === 'focus' ? 'short' : 'focus';
                pmSeconds = MODES[pmMode];
                $('pomodoroModeBtn').textContent = MODE_LABELS[pmMode];
                // Notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('⏰ Pomodoro', { body: pmMode === 'short' ? 'Take a break!' : 'Time to focus!' });
                }
            }
            updatePomodoroDisplay();
        }, 1000);
    }
};

$('pomodoroResetBtn').onclick = () => {
    clearInterval(pmInterval);
    pmRunning = false;
    pmSeconds = MODES[pmMode];
    $('pomodoroStartBtn').textContent = '▶ Start';
    updatePomodoroDisplay();
};

$('pomodoroModeBtn').onclick = () => {
    clearInterval(pmInterval);
    pmRunning = false;
    const modeOrder = ['focus', 'short', 'long'];
    pmMode = modeOrder[(modeOrder.indexOf(pmMode) + 1) % 3];
    pmSeconds = MODES[pmMode];
    $('pomodoroModeBtn').textContent = MODE_LABELS[pmMode];
    $('pomodoroStartBtn').textContent = '▶ Start';
    updatePomodoroDisplay();
};

// Request notification permission
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

// ─── Init all ─────────────────────────────────────────────────────────────────
(async () => {
    await Promise.all([initTasks(), initFocus(), initStreak(), initQuote(), initLinks()]);
    updatePomodoroDisplay();
})();
