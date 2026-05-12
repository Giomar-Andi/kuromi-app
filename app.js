// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    loadDate();
    loadClasses();
    loadReminders();
    requestNotificationPermission();
    setInterval(checkNotifications, 60000); // Chequear cada minuto
});

// Fecha Actual
function loadDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-ES', options);
}

// --- Lógica de Clases ---
function addClass() {
    const name = document.getElementById('class-name').value;
    const time = document.getElementById('class-time').value;
    const room = document.getElementById('class-room').value;

    if (!name || !time) return alert("Faltan datos 😈");

    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    classes.push({ id: Date.now(), name, time, room });
    
    // Ordenar por hora
    classes.sort((a, b) => a.time.localeCompare(b.time));
    
    localStorage.setItem('kuromi_classes', JSON.stringify(classes));
    closeModal('class-modal');
    loadClasses();
    
    // Limpiar inputs
    document.getElementById('class-name').value = '';
    document.getElementById('class-time').value = '';
    document.getElementById('class-room').value = '';
}

function loadClasses() {
    const list = document.getElementById('class-list');
    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    
    list.innerHTML = '';
    if (classes.length === 0) {
        list.innerHTML = '<div class="empty-state">No hay clases registradas hoy.</div>';
        return;
    }

    classes.forEach(c => {
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <div class="item-time">${c.time}</div>
            <div class="item-details">
                <strong>${c.name}</strong><br>
                <small>📍 ${c.room || 'Sin aula'}</small>
            </div>
            <button class="delete-btn" onclick="deleteItem('kuromi_classes', ${c.id})">🗑️</button>
        `;
        list.appendChild(div);
    });
}

// --- Lógica de Recordatorios ---
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
    
    document.getElementById('rem-title').value = '';
    document.getElementById('rem-datetime').value = '';
    document.getElementById('rem-desc').value = '';
}

function loadReminders() {
    const list = document.getElementById('reminder-list');
    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    
    list.innerHTML = '';
    if (reminders.length === 0) {
        list.innerHTML = '<div class="empty-state">Todo limpio por ahora... 😈</div>';
        return;
    }

    reminders.forEach(r => {
        const dateObj = new Date(r.datetime);
        const dateStr = dateObj.toLocaleString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
        
        const div = document.createElement('div');
        div.className = 'item';
        div.style.borderLeftColor = '#4b0082'; // Color diferente para recordatorios
        div.innerHTML = `
            <div class="item-time">${dateStr}</div>
            <div class="item-details">
                <strong>${r.title}</strong><br>
                <small>${r.desc || ''}</small>
            </div>
            <button class="delete-btn" onclick="deleteItem('kuromi_reminders', ${r.id})">️</button>
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
    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];

    // Chequear Recordatorios
    reminders.forEach(r => {
        const remTime = new Date(r.datetime);
        // Si falta menos de 15 minutos y no ha sido notificado
        if (!r.notified && remTime > now && (remTime - now) < 900000) { 
            sendNotification(`Recordatorio: ${r.title}`, `Es hora de: ${r.desc || 'Revisar detalles'}`);
            r.notified = true; // Marcar como notificado para no repetir
            localStorage.setItem('kuromi_reminders', JSON.stringify(reminders));
        }
    });

    // Chequear Clases (Simplificado: asume que son de hoy)
    // Nota: Para clases recurrentes se necesita lógica más compleja de fechas.
    // Aquí notificamos si la hora coincide con la hora actual.
    const currentHourMin = now.getHours() * 60 + now.getMinutes();
    
    classes.forEach(c => {
        const [h, m] = c.time.split(':').map(Number);
        const classMin = h * 60 + m;
        
        if (Math.abs(currentHourMin - classMin) <= 15 && currentHourMin >= classMin - 15) {
             // Evitar spam de notificaciones en el mismo rango de 15 min
             // En una app real, usaríamos un flag de notificación por día
             sendNotification(`Clase: ${c.name}`, `Tu clase empieza a las ${c.time} en ${c.room || 'el aula'}`);
        }
    });
}

function sendNotification(title, body) {
    new Notification(title, {
        body: body,
        icon: 'icons/icon-192.png'
    });
}