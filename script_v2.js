// ============================================================
// VARIABLES GLOBALES
// ============================================================
console.log("✅ script_v2.js cargado correctamente");

let usuarioActivo = null;
let fotoBase64 = null;

// ============================================================
// LOGIN
// ============================================================
// ============================================================
// LOGIN CON GOOGLE SHEETS
// ============================================================

async function doLogin() {
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const patente = document.getElementById("patente").value.trim();

  if (!user || !pass || !patente) {
    document.getElementById("login-error").classList.remove("hidden");
    return;
  }

  try {
    // URL del Apps Script que expone la hoja "Usuarios"
    const url = "https://script.google.com/macros/s/AKfycbzP04DM6clsY4oUASPu3HDRLdFlsjk4EwORNVcYMlC4hNPaPr2W4KsUGNOoecXJIUCr/exec"; // ← reemplaza con tu endpoint real

    const payload = {
      accion: "login",
      usuario: user,
      password: pass
    };

    const res = await fetch(url, {
  method: "POST",
  body: new URLSearchParams({ data: JSON.stringify(payload) })
});

    const data = await res.json();

    if (data.ok) {
      usuarioActivo = {
        nombre: data.nombre,
        rol: data.rol
      };
      localStorage.setItem("patente", patente);
      mostrarMenu();
    } else {
      document.getElementById("login-error").classList.remove("hidden");
    }

  } catch (e) {
    alert("Error de conexión con el servidor.");
    console.error(e);
  }
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

// ============================================================
// ESTADO DE ENTREGA
// ============================================================

function activarSeleccionEstado() {
  document.querySelectorAll(".estado-box").forEach(box => {
    box.onclick = () => {
      document.querySelectorAll(".estado-box")
        .forEach(b => b.classList.remove("selected"));

      box.classList.add("selected");
      document.getElementById("estado").value = box.dataset.value;
    };
  });
}

// ============================================================
// FORMULARIO ENTREGAS
// ============================================================

function resetFormEntregas() {
  fotoBase64 = null;

  document.getElementById("guia-numero").value = "";
  document.getElementById("estado").value = "";
  document.getElementById("tipoDocumento").value = "";

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

// ============================================================
// FOTO
// ============================================================

function triggerCamera() {
  document.getElementById("camera-input").click();
}

function handlePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async e => {
    fotoBase64 = e.target.result;

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
// TIPO DE DOCUMENTO
// ============================================================

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

// ============================================================
// ENVÍO DE ENTREGA
// ============================================================

async function submitEntrega() {
  const guia = document.getElementById("guia-numero").value.trim();
  const estado = document.getElementById("estado").value;
  const tipoDocumento = document.getElementById("tipoDocumento").value;

  if (!tipoDocumento) {
    alert("Selecciona si es guía o factura.");
    return;
  }
  if (!guia) {
    alert("Ingresa el número de documento.");
    return;
  }
  if (!fotoBase64) {
    alert("Toma o sube la foto.");
    return;
  }
  if (!estado) {
    alert("Selecciona el estado de la entrega.");
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

  try {
    const res = await fetch("TU_URL_DE_APPS_SCRIPT", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.ok) {
      document.getElementById("exito-guia").textContent = guia;
      showScreen("screen-exito");
    } else {
      alert("Error al guardar: " + data.error);
    }

  } catch (e) {
    alert("Error de conexión.");
  }

  btn.disabled = false;
  btn.textContent = "Registrar entrega";
}
