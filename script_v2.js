// ============================================================
// VGV SpA — Portal de Operaciones (FRONTEND)
// script_v2.js — Limpio, escalable, solo navegador
// ============================================================

// URL base del backend Apps Script (un solo endpoint)
const API_URL = "https://script.google.com/macros/s/AKfycbzP04DM6clsY4oUASPu3HDRLdFlsjk4EwORNVcYMlC4hNPaPr2W4KsUGNOoecXJIUCr/exec";
console.log("SCRIPT VGV CARGADO — API:", API_URL);

// Variables globales
let usuarioActivo = null;
let fotoBase64 = null;

// ============================================================
// INDEXEDDB — MODO OFFLINE
// ============================================================

let db;
const DB_NAME = "vgv_entregas";
const STORE_NAME = "pendientes";

function initDB() {
  const request = indexedDB.open(DB_NAME, 1);

  request.onupgradeneeded = e => {
    db = e.target.result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    }
  };

  request.onsuccess = e => { db = e.target.result; };
  request.onerror = e => console.error("IndexedDB error:", e);
}

initDB();

function guardarEntregaOffline(data) {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({
      ...data,
      estadoEnvio: "pendiente",
      fechaGuardado: Date.now()
    });
    tx.oncomplete = () => resolve(true);
  });
}

function obtenerPendientes() {
  return new Promise(resolve => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

function eliminarPendiente(id) {
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
}

window.addEventListener("online", reenviarPendientes);

// ============================================================
// UTILIDADES
// ============================================================

function hayInternet() {
  return navigator.onLine;
}

// Comprime imagen a partir de base64
async function compressImage(base64, maxWidth = 1200, quality = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");

      const targetWidth = Math.min(maxWidth, img.width);
      const scale = targetWidth / img.width;

      canvas.width = targetWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = base64;
  });
}

// ============================================================
// LOGIN
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const sesion = sessionStorage.getItem("vgv_usuario");
  if (sesion) {
    usuarioActivo = JSON.parse(sesion);
    mostrarMenu();
  }

  document.getElementById("login-pass").addEventListener("keydown", e => {
    if (e.key === "Enter") doLogin();
  });

  document.querySelectorAll(".estado-box").forEach(box => {
    box.addEventListener("click", () => {
      document.querySelectorAll(".estado-box")
        .forEach(b => b.classList.remove("selected"));

      box.classList.add("selected");
      document.getElementById("estado").value = box.dataset.value;
    });
  });
});
// login maneja autenticación, guarda datos en localStorage y muestra menú principal
async function doLogin() {
  const usuario = document.getElementById("login-user").value.trim().toLowerCase();
  const clave = document.getElementById("login-pass").value;
  const errorEl = document.getElementById("login-error");
  const btn = document.querySelector("#screen-login .btn-primary");

  if (!usuario || !clave) {
    errorEl.textContent = "Ingresa tu usuario y contraseña.";
    errorEl.classList.remove("hidden");
    return;
  }

  btn.textContent = "Verificando...";
  btn.disabled = true;
  errorEl.classList.add("hidden");

  // Guardar patente ANTES del login
  const patente = document.getElementById("patente").value.trim();
  localStorage.setItem("patente", patente);

  try {
    const payload = {
      accion: "login",
      usuario,
      password: clave
    };

    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(JSON.stringify(payload))
    });

    const data = await resp.json(); // ← AQUÍ recién existe "data"

    if (!data.ok) {
      errorEl.textContent = data.error || "Usuario o contraseña inválidos";
      errorEl.classList.remove("hidden");
      btn.textContent = "Ingresar";
      btn.disabled = false;
      return;
    }

    // Guardar datos del usuario AHORA que "data" existe
    localStorage.setItem("usuario", data.usuario.nombre);
    localStorage.setItem("rol", data.usuario.rol);

    usuarioActivo = data.usuario;
    mostrarMenu();

  } catch (err) {
    console.error("Error_en_login:", err);
    errorEl.textContent = "Error de conexión. Intenta nuevamente.";
    errorEl.classList.remove("hidden");
  }

  btn.textContent = "Ingresar";
  btn.disabled = false;
}

// doLogout limpia sesión y vuelve a pantalla de login
function doLogout() {
  sessionStorage.removeItem("vgv_usuario");
  usuarioActivo = null;
  showScreen("screen-login");
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
}

// ============================================================
// NAVEGACIÓN
// ============================================================

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0, 0);
}

function mostrarMenu() {
  if (!usuarioActivo) return;

  const iniciales = usuarioActivo.nombre
    .split(" ")
    .map(p => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  document.getElementById("menu-avatar").textContent = iniciales;
  document.getElementById("menu-nombre").textContent = usuarioActivo.nombre;
  document.getElementById("menu-rol").textContent = usuarioActivo.rol;

  const ahora = new Date();
  document.getElementById("menu-fecha").innerHTML =
    `${ahora.toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}<br>${ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`;

  actualizarBadgePendientes();
  showScreen("screen-menu");
}

function goToModule(mod) {
  if (mod === "entregas") {
    resetFormEntregas();
    showScreen("screen-entregas");
    activarSeleccionEstado();
  }
}

function goBack(destino) {
  if (destino === "menu") {
    mostrarMenu();
  } else {
    showScreen("screen-" + destino);
  }
}
function activarSeleccionEstado() {
  document.querySelectorAll(".estado-box").forEach(box => {
    box.onclick = () => {

      document.querySelectorAll(".estado-box")
        .forEach(b => b.classList.remove("selected"));

      box.classList.add("selected");

      document.getElementById("estado").value = box.dataset.value;

      console.log("Estado seleccionado:", box.dataset.value);
    };
  });
}

// ============================================================
// MÓDULO ENTREGAS
// ============================================================

function resetFormEntregas() {
  fotoBase64 = null;

  document.getElementById("guia-numero").value = "";
  document.getElementById("estado").value = "";

  document.querySelectorAll(".estado-box").forEach(b => b.classList.remove("selected"));

  document.getElementById("photo-preview").src = "";
  document.getElementById("photo-preview").classList.add("hidden");
  document.getElementById("photo-placeholder").style.display = "flex";
  document.getElementById("btn-retake").style.display = "none";
  document.getElementById("camera-input").value = "";
  document.getElementById("submit-status").classList.add("hidden");
  document.getElementById("btn-submit").disabled = false;

  actualizarDatetime();
}

function actualizarDatetime() {
  const ahora = new Date();
  const texto = ahora.toLocaleDateString("es-CL", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }) + " · " + ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

  const el = document.getElementById("datetime-auto");
  if (el) el.textContent = texto;
}

setInterval(() => {
  if (document.getElementById("screen-entregas").classList.contains("active")) {
    actualizarDatetime();
  }
}, 30000);

function triggerCamera() {
  document.getElementById("camera-input").click();
}

function handlePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    const originalBase64 = e.target.result;
    fotoBase64 = await compressImage(originalBase64);

    const preview = document.getElementById("photo-preview");
    preview.src = fotoBase64;
    preview.classList.remove("hidden");

    document.getElementById("photo-placeholder").style.display = "none";
    document.getElementById("btn-retake").style.display = "block";
  };

  reader.readAsDataURL(file);
}

function retakePhoto() {
  fotoBase64 = null;
  document.getElementById("camera-input").value = "";
  document.getElementById("photo-preview").classList.add("hidden");
  document.getElementById("photo-placeholder").style.display = "flex";
  document.getElementById("btn-retake").style.display = "none";
}
// ============================================================
// ENVÍO DE ENTREGA (ONLINE + OFFLINE) — VERSIÓN FINAL
// ============================================================

async function submitEntrega() {
  const guia = document.getElementById("guia-numero").value.trim();
  const estado = document.getElementById("estado").value;

  if (!guia) {
    alert("Por favor ingresa el número de guía.");
    return;
  }
  if (!fotoBase64) {
    alert("Por favor toma o sube la foto.");
    return;
  }
  if (!estado) {
    alert("Por favor selecciona el estado de la entrega.");
    return;
  }
  const tipoDocumento = document.getElementById("tipoDocumento").value;
if (!tipoDocumento) {
  alert("Por favor selecciona si es guía o factura.");
  return;
}

  const payload = {
    accion: "registrarEntrega",
    guia,
    estado,
    tipoDocumento,
    usuario: usuarioActivo.nombre,
    rol: usuarioActivo.rol,
    fecha: new Date().toLocaleDateString("es-CL"),
    hora: new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }),
    fotoBase64,
    patente: localStorage.getItem("patente")
  };

  const btn = document.getElementById("btn-submit");
  const status = document.getElementById("submit-status");

  btn.disabled = true;
  btn.textContent = "Enviando...";
  status.textContent = "⏳ Guardando...";
  status.classList.remove("hidden");

  // ---------------------------
  // MODO OFFLINE
  // ---------------------------
  if (!hayInternet()) {
    await guardarEntregaOffline(payload);
    mostrarExito(guia);
    actualizarBadgePendientes();
    return;
  }

  // ---------------------------
  // MODO ONLINE
  // ---------------------------
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(JSON.stringify(payload))
    });

    const data = await resp.json();

    if (data.ok) {
      mostrarExito(guia);
    } else {
      throw new Error(data.error || "Error desconocido");
    }

  } catch (err) {
    // Si falla el servidor → guardar offline
    await guardarEntregaOffline(payload);
    mostrarExito(guia);
  }

  actualizarBadgePendientes();
}

const tipoDocumento = document.getElementById("tipoDocumento").value;

const data = {
    accion: "registrarentrega",
    usuario: usuario,
    patente: patente,
    numero: numero,
    estado: estado,
    foto: fotoBase64,
    tipoDocumento: tipoDocumento
};


// ============================================================
// PANTALLA DE ÉXITO
// ============================================================

function mostrarExito(guia) {
  document.getElementById("exito-guia").textContent = "Guía N° " + guia;
  showScreen("screen-exito");
}

// ============================================================
// NUEVA ENTREGA
// ============================================================

function nuevaEntrega() {
  showScreen("screen-entregas");
  resetFormEntregas();
}


// ============================================================
// BADGE DE PENDIENTES
// ============================================================
async function actualizarBadgePendientes() {
  try {
    const pendientes = await obtenerPendientes();
    const badge = document.getElementById("badge-pendientes");

    if (!badge) return;

    if (pendientes.length > 0) {
      badge.textContent = pendientes.length;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error al actualizar badge:", err);
  }
}
function seleccionarTipo(tipo) {
    document.getElementById("tipoDocumento").value = tipo;

    document.querySelectorAll(".btn-tipo-doc").forEach(btn => {
        btn.classList.remove("selected");
    });

    if (tipo === "guia") {
        document.querySelector(".btn-tipo-doc.guia").classList.add("selected");
    } else {
        document.querySelector(".btn-tipo-doc.factura").classList.add("selected");
    }
}
