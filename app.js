document.addEventListener('DOMContentLoaded', () => {
    loadDate();
    cleanPastReminders(); // Borrar lo pasado al iniciar
    loadClasses();
    loadReminders();
    updateStats(); // Actualizar estadísticas
    requestNotificationPermission();
    setInterval(() => {
        checkNotifications();
        cleanPastReminders(); // Borrar lo pasado cada minuto
        updateStats();
    }, 60000);
});

// Fecha Actual
function loadDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES', options);
}

// --- Estadísticas ---
function updateStats() {
    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    
    // Contar clases de hoy (simplificado: asumimos todas las guardadas son de hoy o futuras)
    const classCount = classes.length;
    
    // Contar recordatorios futuros
    const now = new Date();
    const pendingReminders = reminders.filter(r => new Date(r.datetime) > now).length;

    document.getElementById('stat-classes').innerText = classCount;
    document.getElementById('stat-reminders').innerText = pendingReminders;
}

// --- Limpieza Automática ---
function cleanPastReminders() {
    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    const now = new Date();
    
    // Filtrar solo los que NO han pasado
    const activeReminders = reminders.filter(r => new Date(r.datetime) > now);
    
    // Si hay cambios, guardar y recargar
    if (activeReminders.length !== reminders.length) {
        localStorage.setItem('kuromi_reminders', JSON.stringify(activeReminders));
        loadReminders();
        updateStats();
    }
}

// --- Lógica de Clases ---
function addClass() {
    const name = document.getElementById('class-name').value;
    const time = document.getElementById('class-time').value;
    const room = document.getElementById('class-room').value;

    if (!name || !time) return alert("Faltan datos 😈");

    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    classes.push({ id: Date.now(), name, time, room });
    classes.sort((a, b) => a.time.localeCompare(b.time));
    
    localStorage.setItem('kuromi_classes', JSON.stringify(classes));
    closeModal('class-modal');
    loadClasses();
    updateStats();
    
    document.getElementById('class-name').value = '';
    document.getElementById('class-time').value = '';
    document.getElementById('class-room').value = '';
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
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <div class="item-time">${c.time}</div>
            <div class="item-details">
                <strong>${c.name}</strong>
                <small>📍 ${c.room || 'Sin aula'}</small>
            </div>
            <button class="delete-btn" onclick="deleteItem('kuromi_classes', ${c.id})">✕</button>
        `;
        list.appendChild(div);
    });
}

// --- Lógica de Recordatorios ---
function addReminder() {
    const title = document.getElementById('rem-title').value;
    const datetime = document.getElementById('rem-datetime').value;
    const desc = document.getElementById('rem-desc').value;

    if (!title || !datetime) return alert("Faltan datos 💀");

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
    
    // Solo mostrar futuros
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

// --- Utilidades ---
function deleteItem(storageKey, id) {
    let items = JSON.parse(localStorage.getItem(storageKey)) || [];
    items = items.filter(item => item.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(items));
    if (storageKey === 'kuromi_classes') loadClasses();
    else loadReminders();
    updateStats();
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// --- Notificaciones ---
function requestNotificationPermission() {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
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
    new Notification(title, {
        body: body,
        icon: 'icons/icon-192.png'
    });
}
