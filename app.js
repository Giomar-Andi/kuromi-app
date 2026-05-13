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

// --- Lógica de Clases CON VALIDACIÓN Y ALERTAS ---
function addClass() {
    const name = document.getElementById('class-name').value.trim();
    const teacher = document.getElementById('class-teacher').value.trim();
    const timeStart = document.getElementById('class-time-start').value;
    const timeEnd = document.getElementById('class-time-end').value;
    const room = document.getElementById('class-room').value.trim();
    
    const checkboxes = document.querySelectorAll('input[name="day"]:checked');
    let days = [];
    checkboxes.forEach((checkbox) => days.push(checkbox.value));
    
    const startMonth = document.getElementById('start-month').value;
    const endMonth = document.getElementById('end-month').value;

    // Contar campos llenos
    let filledCount = 0;
    if (name) filledCount++;
    if (teacher) filledCount++;
    if (timeStart) filledCount++;
    if (timeEnd) filledCount++;
    if (room) filledCount++;
    if (days.length > 0) filledCount++;
    if (startMonth) filledCount++;
    if (endMonth) filledCount++;

    // ... dentro de addClass, cuando validas ...
    if (filledCount < 2) {
        Swal.fire({
            icon: 'warning',
            title: '¡OYEEEEE!',
            text: 'Chinchin, llena al menos 2 campos para guardar la clase, puecher?.',
            confirmButtonText: 'Chi',
            customClass: { popup: 'kuromi-bg-alert' }
        });
        return;
    }

    // Validación extra: Si pone horas, debe poner ambas
    if ((timeStart && !timeEnd) || (!timeStart && timeEnd)) {
         Swal.fire({
            icon: 'error',
            title: 'Error de Hora',
            text: 'Si pones hora de inicio, pon también la de fin. ⏰',
            confirmButtonText: 'Corregir',
            customClass: { popup: 'kuromi-bg-alert' }
        });
        return;
    }

    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    
    classes.push({ 
        id: Date.now(), 
        name: name || 'Sin Nombre', 
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
    
    // ... más abajo, cuando guardas con éxito ...
    Swal.fire({
        icon: 'success',
        title: '¡Clase Guardada!',
        text: 'Tu clase se guardó chinchin.',
        timer: 6000,
        showConfirmButton: false,
        customClass: { popup: 'kuromi-bg-alert' }
    });
    
    // Limpiar
    document.getElementById('class-name').value = '';
    document.getElementById('class-teacher').value = '';
    document.getElementById('class-time-start').value = '';
    document.getElementById('class-time-end').value = '';
    document.getElementById('class-room').value = '';
    document.querySelectorAll('input[name="day"]').forEach(c => c.checked = false);
    document.getElementById('start-month').value = '';
    document.getElementById('end-month').value = '';
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
        const daysStr = c.days.length > 0 ? c.days.join(', ') : 'Sin días';
        
        const div = document.createElement('div');
        div.className = 'item';
        // Al hacer click, llamamos a showClassDetails con el ID de la clase
        div.onclick = () => showClassDetails(c.id); 
        
        div.innerHTML = `
            <div class="item-time">
                ${c.timeStart || '--:--'}
                <span class="end">${c.timeEnd || ''}</span>
            </div>
            <div class="item-details">
                <strong>${c.name}</strong>
                <small>👩 ${c.teacher || 'Sin prof.'} | 📍 ${c.room || '-'}</small>
                <div class="tags">
                    📅 ${daysStr} | ${c.startMonth || '?'} - ${c.endMonth || '?'}
                </div>
            </div>
            <!-- El botón de borrar tiene stopPropagation para no abrir el modal al borrar -->
            <button class="delete-btn" onclick="event.stopPropagation(); confirmDelete('kuromi_classes', ${c.id})">✕</button>
        `;
        list.appendChild(div);
    });
}

// --- Lógica de Recordatorios CON VALIDACIÓN Y ALERTAS ---
function addReminder() {
    const title = document.getElementById('rem-title').value.trim();
    const datetime = document.getElementById('rem-datetime').value; // Este es el campo clave
    const desc = document.getElementById('rem-desc').value.trim();

    // 1. VALIDACIÓN Estricta: La fecha y hora ES OBLIGATORIA
    if (!datetime) {
        Swal.fire({
            icon: 'error',
            title: '¡OYEEEEE!',
            text: 'Chinchin no puedes olvidarte de poner hora y fecha a tu reunión, piensa pe.',
            confirmButtonText: 'Chi',
            customClass: { popup: 'kuromi-bg-alert' }
        });
        return; // Detenemos la función aquí
    }

    // 2. Validación General: Al menos 2 campos llenos (incluyendo la fecha que ya validamos arriba)
    let filledCount = 0;
    if (title) filledCount++;
    if (datetime) filledCount++; // Ya sabemos que está lleno, pero sumamos para la lógica general
    if (desc) filledCount++;

    // ... dentro de addReminder, cuando validas ...
    if (filledCount < 2) {
        Swal.fire({
            icon: 'warning',
            title: '¡OYEEEEE!',
            text: 'Chinchin, llena al menos 2 campos para guardar el recordatorio, apura compare.',
            confirmButtonText: 'Chi',
            customClass: { popup: 'kuromi-bg-alert' }
        });
        return;
    }
// Si pasa las validaciones, guardamos
    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    reminders.push({ id: Date.now(), title: title || 'Sin Título', datetime, desc, notified: false });
    reminders.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    
    localStorage.setItem('kuromi_reminders', JSON.stringify(reminders));
    closeModal('reminder-modal');
    loadReminders();
    updateStats();
    
    // ... más abajo, cuando guardas con éxito ...
    Swal.fire({
        icon: 'success',
        title: '¡Recordatorio Creado!',
        text: 'No olvides cumplirlo porque vuelo compare.',
        timer: 6000,
        showConfirmButton: false,
        customClass: { popup: 'kuromi-bg-alert' } 
    });
    
    document.getElementById('rem-title').value = '';
    document.getElementById('rem-datetime').value = '';
    document.getElementById('rem-desc').value = '';
}

function loadReminders() {
    const list = document.getElementById('reminder-list');
    let reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
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
        // Al hacer click, llamamos a showReminderDetails con el ID
        div.onclick = () => showReminderDetails(r.id);
        
        div.innerHTML = `
            <div class="item-time">${dateStr}</div>
            <div class="item-details">
                <strong>${r.title}</strong>
                <small>${r.desc || ''}</small>
            </div>
            <button class="delete-btn" onclick="event.stopPropagation(); confirmDelete('kuromi_reminders', ${r.id})">✕</button>
        `;
        list.appendChild(div);
    });
}

function confirmDelete(storageKey, id) {
    Swal.fire({
        title: '¿Eliminar?',
        text: "Vas a eliminar chinchin?.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d946ef',
        cancelButtonColor: '#4a4a4a',
        confirmButtonText: 'Chi, borrar',
        cancelButtonText: 'Cancelar',
        
        // AQUÍ LA MAGIA DEL FONDO:
        //background: 'rgba(46, 0, 79, 0.95)', // Fondo oscuro morado
        //color: '#fff',
        
        // Si quieres usar la imagen de fondo completa, descomenta la siguiente línea:
        customClass: { popup: 'kuromi-bg-alert' } 
    }).then((result) => {
        if (result.isConfirmed) {
            deleteItem(storageKey, id);
            Swal.fire({
                title: '¡Borrado!',
                text: 'Se elimino tu clase y/o recordatorio chinchin.',
                icon: 'success',
                background: 'rgba(46, 0, 79, 0.95)',
                color: '#fff',
                timer: 6000,
                showConfirmButton: false,
                customClass: { popup: 'kuromi-bg-alert' } 
            })
        }
    });
}

function deleteItem(storageKey, id) {
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

// --- Funciones para el Reloj en Tiempo Real (Con AM/PM) ---
function updateLiveClock() {
    const now = new Date();
    
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convertir a formato 12 horas
    hours = hours % 12;
    hours = hours ? hours : 12; // La hora '0' debe ser '12'
    hours = String(hours).padStart(2, '0');
    
    const clockElement = document.getElementById('live-clock');
    if (clockElement) {
        // Usamos un pequeño span para el AM/PM para poder estilizarlo diferente si queremos
        clockElement.innerHTML = `${hours}:${minutes} <span class="ampm-indicator">${ampm}</span>`;
    }
}

// Iniciar el reloj
setInterval(updateLiveClock, 1000); // Actualiza cada segundo
updateLiveClock(); // Ejecuta inmediatamente al cargar

// --- Funciones para Vista Previa de Detalles ---

function showClassDetails(id) {
    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    const c = classes.find(item => item.id === id);
    
    if (!c) return;

    const daysStr = c.days.length > 0 ? c.days.join(', ') : 'No especificado';
    
    const html = `
        <div class="detail-row">
            <span class="detail-label">Materia:</span>
            <span class="detail-value">${c.name}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Profesor/a:</span>
            <span class="detail-value">${c.teacher || 'No registrado'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Horario:</span>
            <span class="detail-value">${c.timeStart || '--:--'} - ${c.timeEnd || '--:--'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Aula:</span>
            <span class="detail-value">${c.room || 'No registrada'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Días:</span>
            <span class="detail-value">${daysStr}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Periodo:</span>
            <span class="detail-value">${c.startMonth || '?'} a ${c.endMonth || '?'}</span>
        </div>
    `;

    document.getElementById('detail-title').innerText = "Detalles de Clase 📚";
    document.getElementById('detail-body').innerHTML = html;
    openModal('detail-modal');
}

function showReminderDetails(id) {
    const reminders = JSON.parse(localStorage.getItem('kuromi_reminders')) || [];
    const r = reminders.find(item => item.id === id);
    
    if (!r) return;

    const dateObj = new Date(r.datetime);
    const dateStr = dateObj.toLocaleString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit' });

    const html = `
        <div class="detail-row">
            <span class="detail-label">Título:</span>
            <span class="detail-value">${r.title}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Fecha y Hora:</span>
            <span class="detail-value">${dateStr}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Detalles / Notas:</span>
            <span class="detail-value">${r.desc || 'Sin notas adicionales.'}</span>
        </div>
    `;

    document.getElementById('detail-title').innerText = "Detalles de Recordatorio 💀";
    document.getElementById('detail-body').innerHTML = html;
    openModal('detail-modal');
}
