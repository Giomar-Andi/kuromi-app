// Solicitar permiso para notificaciones al cargar
if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
}

let classes = JSON.parse(localStorage.getItem('kuromiClasses')) || [];

// Nombres de meses para mostrar
const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function renderClasses() {
    const list = document.getElementById('schedule-list');
    list.innerHTML = '';

    if (classes.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <p>No hay clases aún.<br>¡Toca el + para añadir!</p>
            </div>`;
        return;
    }

    // Ordenar por hora
    classes.sort((a, b) => a.startTime.localeCompare(b.startTime));

    const currentMonth = new Date().getMonth(); // 0-11

    classes.forEach((cls, index) => {
        // Verificar si la clase está activa en el mes actual
        // Lógica simple: Si el mes actual está entre inicio y fin (inclusive)
        let isActive = false;
        const start = parseInt(cls.startMonth);
        const end = parseInt(cls.endMonth);

        if (start <= end) {
            // Caso normal (ej: Marzo a Junio)
            if (currentMonth >= start && currentMonth <= end) isActive = true;
        } else {
            // Caso跨年 (ej: Noviembre a Febrero)
            if (currentMonth >= start || currentMonth <= end) isActive = true;
        }

        const div = document.createElement('div');
        div.className = `card class-card ${isActive ? '' : 'inactive'}`;
        
        const daysDisplay = cls.days.join(', ');
        const dateRangeText = `${monthNames[start]} - ${monthNames[end]}`;

        div.innerHTML = `
            <button class="delete-btn" onclick="deleteClass(${index})">&times;</button>
            <h3>${cls.name}</h3>
            <p>🕒 ${cls.startTime}</p>
            <p>👤 Prof. ${cls.professor}</p>
            <div class="days-badge">${daysDisplay}</div>
            <span class="date-range">📅 ${dateRangeText}</span>
            ${!isActive ? '<span style="color:#ff6b6b; font-size:0.8rem; display:block; margin-top:5px;">(Fuera de periodo)</span>' : ''}
        `;
        list.appendChild(div);
    });
}

function openModal() {
    document.getElementById('modal').style.display = 'flex';
    // Resetear formulario
    document.getElementById('className').value = '';
    document.getElementById('professorName').value = '';
    document.getElementById('startTime').value = '';
    document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = false);
    
    // Preseleccionar meses lógicos (Inicio: Mes actual, Fin: Mes actual + 4)
    const currentMonth = new Date().getMonth();
    document.getElementById('startMonth').value = currentMonth;
    document.getElementById('endMonth').value = (currentMonth + 4) % 12; 
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function saveClass() {
    const name = document.getElementById('className').value;
    const professor = document.getElementById('professorName').value;
    const time = document.getElementById('startTime').value;
    const startMonth = document.getElementById('startMonth').value;
    const endMonth = document.getElementById('endMonth').value;
    
    // Obtener días seleccionados
    const days = [];
    document.querySelectorAll('.day-checkbox:checked').forEach(cb => {
        days.push(cb.value);
    });

    if (!name || !time || days.length === 0) {
        alert('Por favor, pon nombre, hora y al menos un día.');
        return;
    }

    const newClass = {
        name,
        professor: professor || 'Sin asignar',
        startTime: time,
        days,
        startMonth,
        endMonth
    };

    classes.push(newClass);
    localStorage.setItem('kuromiClasses', JSON.stringify(classes));
    
    renderClasses();
    closeModal();
    scheduleNotifications();
}

function deleteClass(index) {
    if(confirm('¿Borrar esta clase?')) {
        classes.splice(index, 1);
        localStorage.setItem('kuromiClasses', JSON.stringify(classes));
        renderClasses();
        scheduleNotifications();
    }
}

// --- Lógica de Notificaciones ---

function scheduleNotifications() {
    if (!('Notification' in window)) return;

    const now = new Date();
    const currentDayNum = now.getDay(); 
    const currentMonth = now.getMonth();
    
    const dayMap = { 'L': 1, 'M': 2, 'X': 3, 'J': 4, 'V': 5, 'S': 6, 'D': 0 };

    classes.forEach(cls => {
        // 1. Verificar si la clase está activa en el mes actual
        const start = parseInt(cls.startMonth);
        const end = parseInt(cls.endMonth);
        let isMonthActive = false;

        if (start <= end) {
            if (currentMonth >= start && currentMonth <= end) isMonthActive = true;
        } else {
            if (currentMonth >= start || currentMonth <= end) isMonthActive = true;
        }

        // 2. Verificar si es el día correcto
        const isToday = cls.days.some(d => dayMap[d] === currentDayNum);
        
        if (isMonthActive && isToday) {
            const [hours, minutes] = cls.startTime.split(':');
            const classTime = new Date();
            classTime.setHours(hours, minutes, 0);

            // Calcular tiempo para notificar (15 mins antes)
            const notifyTime = new Date(classTime.getTime() - 15 * 60000);

            if (notifyTime > now) {
                const delay = notifyTime - now;
                
                setTimeout(() => {
                    new Notification("¡Clase pronto!", {
                        body: `Tienes ${cls.name} con ${cls.professor} en 15 min.`,
                        icon: 'icons/icon-192.png',
                        badge: 'icons/icon-192.png'
                    });
                }, delay);
            }
        }
    });
}

// Inicializar
renderClasses();
scheduleNotifications();

window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        closeModal();
    }
}
