document.addEventListener('DOMContentLoaded', () => {
    loadDate();
    cleanPastReminders();
    loadClasses();
    loadReminders();
    updateStats();
    requestNotificationPermission();
    
    setInterval(() => {
        checkNotifications();
        cleanPastReminders();
        updateStats();
    }, 60000);
});

function loadDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES', options);
}

function updateStats() {
    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    const now = new Date();
    const pendingReminders = reminders.filter(r => new Date(r.datetime) > now).length;
    document.getElementById('stat-classes').innerText = classes.length;
    document.getElementById('stat-reminders').innerText = pendingReminders;
}

function cleanPastReminders() {
    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    const now = new Date();
    const activeReminders = reminders.filter(r => new Date(r.datetime) > now);
    if (activeReminders.length !== reminders.length) {
        localStorage.setItem('kuromi_reminders', JSON.stringify(activeReminders));
        loadReminders();
        updateStats();
    }
}

// --- Lógica de Clases ACTUALIZADA CON HORA FIN ---
function addClass() {
    const name = document.getElementById('class-name').value;
    const teacher = document.getElementById('class-teacher').value;
    const timeStart = document.getElementById('class-time-start').value;
    const timeEnd = document.getElementById('class-time-end').value;
    const room = document.getElementById('class-room').value;
    
    const checkboxes = document.querySelectorAll('input[name="day"]:checked');
    let days = [];
    checkboxes.forEach((checkbox) => days.push(checkbox.value));
    
    const startMonth = document.getElementById('start-month').value;
    const endMonth = document.getElementById('end-month').value;

    if (!name || !timeStart || !timeEnd || days.length === 0) return alert("Faltan datos esenciales 😈");

    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    
    classes.push({ 
        id: Date.now(), 
        name, 
        teacher, 
        timeStart, 
        timeEnd, 
        room, 
        days, 
        startMonth, 
        endMonth 
    });
    
    classes.sort((a, b) => a.timeStart.localeCompare(b.timeStart));
    
    localStorage.setItem('kuromi_classes', JSON.stringify(classes));
    closeModal('class-modal');
    loadClasses();
    updateStats();
    
    // Limpiar
    document.getElementById('class-name').value = '';
    document.getElementById('class-teacher').value = '';
    document.getElementById('class-time-start').value = '';
    document.getElementById('class-time-end').value = '';
    document.getElementById('class-room').value = '';
    document.querySelectorAll('input[name="day"]').forEach(c => c.checked = false);
}

function loadClasses() {
    const list = document.getElementById('class-list');
    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    
    list.innerHTML = '';
    if (classes.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay clases registradas.</div>';
        return;
    }

    classes.forEach(c => {
        const daysStr = c.days.join(', ');
        
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <div class="item-time">
                ${c.timeStart}
                <span class="end">${c.timeEnd}</span>
            </div>
            <div class="item-details">
                <strong>${c.name}</strong>
                <small>👩🏫 ${c.teacher || 'Sin prof.'} | 📍 ${c.room || '-'}</small>
                <div class="tags">
                    📅 ${daysStr} | ${c.startMonth} - ${c.endMonth}
                </div>
            </div>
            <button class="delete-btn" onclick="deleteItem('kuromi_classes', ${c.id})">✕</button>
        `;
        list.appendChild(div);
    });
}

// --- Lógica de Recordatorios (Sin cambios) ---
function addReminder() {
    const title = document.getElementById('rem-title').value;
    const datetime = document.getElementById('rem-datetime').value;
    const desc = document.getElementById('rem-desc').value;
    if (!title || !datetime) return alert("Faltan datos ");

    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    reminders.push({ id: Date.now(), title, datetime, desc, notified: false });
    reminders.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    
    localStorage.setItem('kuromi_reminders', JSON.stringify(reminders));
    closeModal('reminder-modal');
    loadReminders();
    updateStats();
    
    document.getElementById('rem-title').value = '';
    document.getElementById('rem-datetime').value = '';
    document.getElementById('rem-desc').value = '';
}

function loadReminders() {
    const list = document.getElementById('reminder-list');
    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    const now = new Date();
    const futureReminders = reminders.filter(r => new Date(r.datetime) > now);

    list.innerHTML = '';
    if (futureReminders.length === 0) {
        list.innerHTML = '<div class="empty-state">Todo limpio por ahora... 😈</div>';
        return;
    }

    futureReminders.forEach(r => {
        const dateObj = new Date(r.datetime);
        const dateStr = dateObj.toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
        
        const div = document.createElement('div');
        div.className = 'item';
        div.style.borderLeftColor = '#581c87'; 
        div.innerHTML = `
            <div class="item-time">${dateStr}</div>
            <div class="item-details">
                <strong>${r.title}</strong>
                <small>${r.desc || ''}</small>
            </div>
            <button class="delete-btn" onclick="deleteItem('kuromi_reminders', ${r.id})">✕</button>
        `;
        list.appendChild(div);
    });
}

function deleteItem(storageKey, id) {
    if(!confirm("¿Seguro que quieres borrar esto?")) return;
    let items = JSON.parse(localStorage.getItem(storageKey)) || [];
    items = items.filter(item => item.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(items));
    if (storageKey === 'kuromi_classes') loadClasses();
    else loadReminders();
    updateStats();
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function requestNotificationPermission() {
    if ("Notification" in window) Notification.requestPermission();
}

function checkNotifications() {
    if (Notification.permission !== "granted") return;
    const now = new Date();
    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    reminders.forEach(r => {
        const remTime = new Date(r.datetime);
        if (!r.notified && remTime > now && (remTime - now) < 900000) { 
            sendNotification(`Recordatorio: ${r.title}`, `Es hora de: ${r.desc || 'Revisar detalles'}`);
            r.notified = true;
            localStorage.setItem('kuromi_reminders', JSON.stringify(reminders));
        }
    });
}

function sendNotification(title, body) {
    new Notification(title, { body: body, icon: 'icons/icon-192.png' });
}
