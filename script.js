// --- 1. DATOS DE PRUEBA Y ESTADO EN LOCALSTORAGE ---
const usuariosPredeterminados = [
    { email: "admin@taller.com", password: "123", rol: "Administrador", nombre: "Carlos Admin" }
];

let usuariosRegistrados = JSON.parse(localStorage.getItem("usuariosTaller")) || usuariosPredeterminados;
let solicitudes = JSON.parse(localStorage.getItem("solicitudesTaller")) || [];
let usuarioActivo = JSON.parse(localStorage.getItem("usuarioActivo")) || null;

// --- 2. ELEMENTOS DE VISTAS ---
const views = {
    viewServices: document.getElementById("viewServices"),
    viewSolicitud: document.getElementById("viewSolicitud"),
    viewAccount: document.getElementById("viewAccount"),
    viewAdmin: document.getElementById("viewAdmin")
};

const linkAccount = document.getElementById("linkAccount");
const linkAdmin = document.getElementById("linkAdmin");
const navAuthSection = document.getElementById("navAuthSection");

// --- 3. NAVEGACIÓN DINÁMICA ---
function mostrarVista(nombreVista) {
    Object.keys(views).forEach(key => {
        if (views[key]) views[key].classList.add("d-none");
    });
    if (views[nombreVista]) views[nombreVista].classList.remove("d-none");

    document.querySelectorAll("#navMenuLinks .nav-link").forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("data-target") === nombreVista) {
            link.classList.add("active");
        }
    });
}

document.querySelectorAll("#navMenuLinks .nav-link").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = link.getAttribute("data-target");
        if (target) mostrarVista(target);
    });
});

document.getElementById("brandHome")?.addEventListener("click", (e) => {
    e.preventDefault();
    mostrarVista("viewServices");
});

document.getElementById("btnVolverCatologo")?.addEventListener("click", () => {
    mostrarVista("viewServices");
});

document.querySelectorAll(".btn-solicitar-servicio").forEach(btn => {
    btn.addEventListener("click", (e) => {
        const servicioElegido = e.target.getAttribute("data-servicio");
        const selectServicio = document.getElementById("tipoServicio");
        if (selectServicio) {
            selectServicio.value = servicioElegido;
        }
        mostrarVista("viewSolicitud");
    });
});

const inputFecha = document.getElementById("fechaServicio");
if (inputFecha) {
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    inputFecha.min = ahora.toISOString().slice(0, 16);
}

// --- 4. CONTROL DE SESIÓN ---
function actualizarBarraNavegacion() {
    if (!usuarioActivo) {
        if (linkAccount) {
            linkAccount.classList.remove("d-none");
            linkAccount.textContent = "Iniciar Sesión";
        }
        if (linkAdmin) linkAdmin.classList.add("d-none");
        
        if (navAuthSection) {
            navAuthSection.innerHTML = `<button class="btn btn-outline-light btn-sm px-3" id="navBtnLogin">Iniciar Sesión</button>`;
            document.getElementById("navBtnLogin")?.addEventListener("click", () => mostrarVista("viewAccount"));
        }
        
        document.getElementById("loginCardContainer")?.classList.remove("d-none");
        document.getElementById("profileDashboard")?.classList.add("d-none");
    } else {
        if (linkAccount) {
            linkAccount.classList.remove("d-none");
            linkAccount.textContent = "Mi Cuenta";
        }
        
        if (linkAdmin) {
            if (usuarioActivo.rol === "Administrador") linkAdmin.classList.remove("d-none");
            else linkAdmin.classList.add("d-none");
        }

        if (navAuthSection) {
            navAuthSection.innerHTML = `
                <span class="text-white me-3 small">Hola, <strong>${usuarioActivo.nombre}</strong></span>
                <button class="btn btn-outline-danger btn-sm" id="navBtnLogoutTop">Salir</button>
            `;
        }

        document.getElementById("loginCardContainer")?.classList.add("d-none");
        document.getElementById("profileDashboard")?.classList.remove("d-none");
        
        const perfilEmail = document.getElementById("perfilEmail");
        if (perfilEmail) perfilEmail.textContent = usuarioActivo.email;

        renderizarTablas();
    }
}

// Login limpio sin mencionar roles
document.getElementById("formLogin")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    const encontrado = usuariosRegistrados.find(u => u.email === email && u.password === password);

    if (encontrado) {
        usuarioActivo = encontrado;
        localStorage.setItem("usuarioActivo", JSON.stringify(usuarioActivo));
        
        Swal.fire({
            icon: 'success',
            title: `¡Bienvenido, ${usuarioActivo.nombre}!`,
            timer: 1500,
            showConfirmButton: false
        });

        actualizarBarraNavegacion();
        if (usuarioActivo.rol === "Administrador") mostrarVista("viewAdmin");
        else mostrarVista("viewAccount");
        document.getElementById("formLogin").reset();
    } else {
        Swal.fire('Error de Acceso', 'Correo no registrado o contraseña incorrecta.', 'error');
    }
});

function cerrarSesion() {
    usuarioActivo = null;
    localStorage.removeItem("usuarioActivo");
    
    if (typeof Swal !== "undefined") {
        Swal.fire({
            icon: 'info',
            title: 'Sesión cerrada',
            text: 'Has salido del sistema.',
            timer: 1200,
            showConfirmButton: false
        });
    }

    actualizarBarraNavegacion();
    mostrarVista("viewServices");
}

// Único evento global para cerrar sesión de manera segura
document.addEventListener("click", function(e) {
    if (e.target && e.target.id === "navBtnLogoutTop") {
        e.preventDefault();
        cerrarSesion();
    }
});

// --- 5. REGISTRO DE SOLICITUD Y VALIDACIÓN DE CORREOS DUPLICADOS ---
document.getElementById("formMantenimiento")?.addEventListener("submit", (e) => {
    e.preventDefault();

    const nombre = document.getElementById("cliNombre").value.trim();
    const email = document.getElementById("cliEmail").value.trim();
    const telefono = document.getElementById("cliTelefono").value.trim();
    const placa = document.getElementById("autoPlaca").value.trim();
    const modelo = document.getElementById("autoModelo").value.trim();
    const anio = parseInt(document.getElementById("autoAnio").value);
    const tipoServicio = document.getElementById("tipoServicio").value;
    const fecha = document.getElementById("fechaServicio").value;
    
    const adiciones = [];
    document.querySelectorAll(".check-adicional:checked").forEach(cb => {
        adiciones.push(cb.value);
    });

    // Validaciones estrictas
    const regexNombre = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    if (!regexNombre.test(nombre)) {
        Swal.fire('Nombre inválido', 'El nombre del propietario solo debe contener letras y espacios.', 'warning');
        return;
    }

    const regexTelefono = /^\d{10}$/;
    if (!regexTelefono.test(telefono)) {
        Swal.fire('Teléfono inválido', 'El número de teléfono debe contener exactamente 10 dígitos numéricos.', 'warning');
        return;
    }

    const regexPlaca = /^[A-Z]{3}-\d{4}$/;
    if (!regexPlaca.test(placa)) {
        Swal.fire('Placa incorrecta', 'La placa debe tener el formato estándar ABC-1234 en mayúsculas.', 'warning');
        return;
    }

    if (anio < 1990 || anio > 2026) {
        Swal.fire('Año inválido', 'Ingrese un año de vehículo válido comprendido entre 1990 y 2026.', 'warning');
        return;
    }

    const fechaSeleccionada = new Date(fecha);
    const fechaActual = new Date();
    if (fechaSeleccionada < fechaActual) {
        Swal.fire('Fecha inválida', 'No puedes registrar una cita en una fecha u hora que ya pasó.', 'warning');
        return;
    }

    // Validar si el correo ya está registrado en el sistema con otro nombre distinto
    const correoExistente = usuariosRegistrados.find(u => u.email === email && u.rol !== "Administrador");
    if (correoExistente && correoExistente.nombre.toLowerCase() !== nombre.toLowerCase()) {
        Swal.fire('Correo registrado', 'Este correo ya pertenece a otro usuario registrado. Inicie sesión con su cuenta.', 'warning');
        return;
    }

    // Registrar o actualizar cuenta automática
    if (!correoExistente) {
        usuariosRegistrados.push({
            email: email,
            password: "123",
            rol: "Cliente",
            nombre: nombre
        });
        localStorage.setItem("usuariosTaller", JSON.stringify(usuariosRegistrados));
    }

    // Guardar solicitud
    const idSolicitud = Date.now();
    const nuevaSolicitud = {
        id: idSolicitud,
        nombre,
        email,
        telefono,
        placa,
        modelo,
        anio,
        tipoServicio,
        fecha,
        adiciones,
        estado: "Pendiente"
    };

    solicitudes.push(nuevaSolicitud);
    localStorage.setItem("solicitudesTaller", JSON.stringify(solicitudes));

    // Confirmación con botón "Aceptar" e instrucciones detalladas
    const fechaFormateada = fecha.replace("T", " a las ");
    Swal.fire({
        icon: 'success',
        title: '¡Cita Registrada con Éxito!',
        html: `
            <div class="text-start fs-6">
                <p class="mb-2"><strong>Cliente:</strong> ${nombre}</p>
                <p class="mb-2"><strong>ID Comprobante:</strong> #${idSolicitud.toString().slice(-4)}</p>
                <p class="mb-2"><strong>Fecha Agendada:</strong> ${fechaFormateada}</p>
                <hr>
                <div class="alert alert-warning p-2 small mb-0">
                    <strong>📍 Lugar de Atención:</strong> Av. de la Prensa N45-12 y El Inca, Quito.<br>
                    <strong>⏱️ Recomendación:</strong> Estar <strong>5 minutos antes</strong> de la hora agendada.<br>
                    <strong>🔑 Acceso:</strong> Use su correo registrado y contraseña <code>123</code> para ingresar a <strong>Mi Cuenta</strong>.
                </div>
            </div>
        `,
        confirmButtonText: 'Aceptar'
    });

    document.getElementById("formMantenimiento").reset();
    mostrarVista("viewServices");
    if (usuarioActivo) renderizarTablas();
});

// --- 6. RENDERIZAR TABLAS ---
function renderizarTablas() {
    const tbodyCliente = document.getElementById("tablaMisSolicitudes");
    if (tbodyCliente && usuarioActivo) {
        tbodyCliente.innerHTML = "";
        const misSolicitudes = solicitudes.filter(s => s.email === usuarioActivo.email);
        
        if (misSolicitudes.length === 0) {
            tbodyCliente.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No tienes solicitudes registradas con este correo.</td></tr>`;
        } else {
            misSolicitudes.forEach(s => {
                tbodyCliente.innerHTML += `
                    <tr>
                        <td>${s.id.toString().slice(-4)}</td>
                        <td><strong>${s.placa}</strong></td>
                        <td>${s.modelo} (${s.anio})</td>
                        <td>${s.tipoServicio}</td>
                        <td>${s.fecha.replace("T", " ")}</td>
                        <td><span class="badge bg-secondary">${s.estado}</span></td>
                    </tr>
                `;
            });
        }
    }

    const tbodyAdmin = document.getElementById("tablaAdminSolicitudes");
    if (tbodyAdmin) {
        tbodyAdmin.innerHTML = "";
        if (solicitudes.length === 0) {
            tbodyAdmin.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay solicitudes en el sistema.</td></tr>`;
        } else {
            solicitudes.forEach(s => {
                tbodyAdmin.innerHTML += `
                    <tr>
                        <td>${s.id.toString().slice(-4)}</td>
                        <td>${s.nombre}</td>
                        <td>${s.email}<br><small class="text-muted">${s.telefono}</small></td>
                        <td><strong>${s.placa}</strong><br><small>${s.modelo} (${s.anio})</small></td>
                        <td>${s.tipoServicio} ${s.adiciones.length > 0 ? '<br><small class="text-primary">+' + s.adiciones.join(', ') + '</small>' : ''}</td>
                        <td>
                            <select class="form-select form-select-sm" onchange="cambiarEstado(${s.id}, this.value)">
                                <option value="Pendiente" ${s.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
                                <option value="En proceso" ${s.estado === "En proceso" ? "selected" : ""}>En proceso</option>
                                <option value="Finalizado" ${s.estado === "Finalizado" ? "selected" : ""}>Finalizado</option>
                                <option value="Cancelado" ${s.estado === "Cancelado" ? "selected" : ""}>Cancelado</option>
                            </select>
                        </td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="eliminarSolicitud(${s.id})">Eliminar</button>
                        </td>
                    </tr>
                `;
            });
        }
    }
}

// --- 7. FUNCIONES CRUD ---
window.cambiarEstado = function(id, nuevoEstado) {
    const solicitud = solicitudes.find(s => s.id === id);
    if (solicitud) {
        solicitud.estado = nuevoEstado;
        localStorage.setItem("solicitudesTaller", JSON.stringify(solicitudes));
        Swal.fire({
            icon: 'success',
            title: 'Estado actualizado',
            timer: 1000,
            showConfirmButton: false
        });
    }
}

window.eliminarSolicitud = function(id) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Se eliminará permanentemente este registro.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            solicitudes = solicitudes.filter(s => s.id !== id);
            localStorage.setItem("solicitudesTaller", JSON.stringify(solicitudes));
            renderizarTablas();
            Swal.fire('¡Eliminado!', 'El registro ha sido borrado.', 'success');
        }
    });
}

actualizarBarraNavegacion();
mostrarVista("viewServices");