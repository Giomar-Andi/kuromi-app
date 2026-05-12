// --- Lógica de Clases ACTUALIZADA ---
function addClass() {
    const name = document.getElementById('class-name').value;
    const teacher = document.getElementById('class-teacher').value;
    const time = document.getElementById('class-time').value;
    const room = document.getElementById('class-room').value;
    
    // Obtener días seleccionados
    const checkboxes = document.querySelectorAll('input[name="day"]:checked');
    let days = [];
    checkboxes.forEach((checkbox) => {
        days.push(checkbox.value);
    });
    
    // Obtener meses
    const startMonth = document.getElementById('start-month').value;
    const endMonth = document.getElementById('end-month').value;

    if (!name || !time || days.length === 0) return alert("Faltan datos esenciales 😈");

    const classes = JSON.parse(localStorage.getItem('kuromi_classes')) || [];
    
    classes.push({ 
        id: Date.now(), 
        name, 
        teacher, 
        time, 
        room, 
        days, 
        startMonth, 
        endMonth 
    });
    
    // Ordenar por hora
    classes.sort((a, b) => a.time.localeCompare(b.time));
    
    localStorage.setItem('kuromi_classes', JSON.stringify(classes));
    closeModal('class-modal');
    loadClasses();
    updateStats();
    
    // Limpiar inputs
    document.getElementById('class-name').value = '';
    document.getElementById('class-teacher').value = '';
    document.getElementById('class-time').value = '';
    document.getElementById('class-room').value = '';
    document.getElementById('start-month').value = 'Enero';
    document.getElementById('end-month').value = 'Diciembre';
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
        // Formatear días para mostrar (ej: L, M, X)
        const daysStr = c.days.join(', ');
        
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `
            <div class="item-time">${c.time}</div>
            <div class="item-details">
                <strong>${c.name}</strong>
                <small>👩🏫 ${c.teacher || 'Sin prof.'} | 📍 ${c.room || '-'}</small>
                <div style="margin-top:5px; font-size:0.75rem; color:var(--accent);">
                    📅 ${daysStr} | ${c.startMonth} - ${c.endMonth}
                </div>
            </div>
            <button class="delete-btn" onclick="deleteItem('kuromi_classes', ${c.id})">✕</button>
        `;
        list.appendChild(div);
    });
}
