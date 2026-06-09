// ============================================================
// VARIABLES GLOBALES
// ============================================================
console.log("✅ script_v2.js cargado correctamente");

let usuarioActivo = null;
let fotoBase64 = null;
// ============================================================
// LOGIN CON GOOGLE SHEETS
// ============================================================

async function doLogin() {
  const user = document.getElementById("login-user").value.trim();
  const pass = document.getElementById("login-pass").value.trim();
  const patente = document.getElementById("patente").value.trim();
  const btn = document.querySelector(".btn-primary");

  if (!user || !pass || !patente) {
    document.getElementById("login-error").classList.remove("hidden");
    return;
  }
 // 🔄 Animación de carga
  btn.disabled = true;
  btn.innerHTML = `
    <span class="loader"></span> Espere...
  `; 
try {
    const url = "https://script.google.com/macros/s/AKfycbzP04DM6clsY4oUASPu3HDRLdFlsjk4EwORNVcYMlC4hNPaPr2W4KsUGNOoecXJIUCr/exec";
    const payload = { accion: "login", usuario: user, password: pass };
    const res = await fetch(url, {
      method: "POST",
      body: new URLSearchParams({ data: JSON.stringify(payload) })
    });
    const data = await res.json();

    if (data.ok) {
      usuarioActivo = data.usuario;
      localStorage.setItem("patente", patente);
      mostrarMenu();
    } else {
      document.getElementById("login-error").classList.remove("hidden");
    }

  } catch (e) {
    alert("Error de conexión con el servidor.");
    console.error(e);
  }

  // 🔁 Restaurar botón
  btn.disabled = false;
  btn.textContent = "Ingresar";
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

  // Campos del formulario
  document.getElementById("guia-numero").value = "";
  document.getElementById("estado").value = "";
  document.getElementById("tipoDocumento").value = "";

  // Reset estado visual
  document.querySelectorAll(".estado-box").forEach(b => b.classList.remove("selected"));

  // Reset tipo de documento
  document.querySelectorAll(".btn-tipo-doc").forEach(btn => btn.classList.remove("selected"));

  // Reset foto
  document.getElementById("photo-preview").src = "";
  document.getElementById("photo-preview").classList.add("hidden");
  document.getElementById("photo-placeholder").style.display = "flex";
  document.getElementById("btn-retake").style.display = "none";
  document.getElementById("camera-input").value = "";

  // Ocultar overlay si quedó visible
  const overlay = document.getElementById("photo-overlay");
  if (overlay) overlay.classList.add("hidden");

  // Reset estado del botón de envío
  document.getElementById("submit-status").classList.add("hidden");
  document.getElementById("btn-submit").disabled = false;

  // Actualizar fecha/hora
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
  document.getElementById("photo-overlay").classList.remove("hidden");
  document.getElementById("camera-input").click();
}

async function handlePhoto(event) {
  const file = event.target.files[0];
  if (!file) return;

  const resultado = await validarFoto(file);
  if (!resultado.ok) {
    alert(resultado.motivo);
    document.getElementById("photo-overlay").classList.add("hidden");
    return;
  }

  document.getElementById("photo-overlay").classList.add("hidden");

  try {
    // ✅ Comprimir y asignar en un solo paso (elimina el FileReader duplicado)
    fotoBase64 = await comprimirImagen(file);

    const preview = document.getElementById("photo-preview");
    preview.src = fotoBase64;
    preview.classList.remove("hidden");
    document.getElementById("photo-placeholder").style.display = "none";
    document.getElementById("btn-retake").style.display = "block";

  } catch (e) {
    alert("Error al procesar la imagen. Intenta nuevamente.");
    console.error("comprimirImagen falló:", e);
  }
}

function retakePhoto() {
  fotoBase64 = null;
  document.getElementById("camera-input").value = "";
  document.getElementById("photo-preview").src = "";
  document.getElementById("photo-preview").classList.add("hidden");
  document.getElementById("photo-placeholder").style.display = "flex";
  document.getElementById("btn-retake").style.display = "none";
}

// ============================================================
// COMPRESIÓN DE IMAGEN
// ============================================================

function comprimirImagen(file, maxWidth = 1024, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file); // ✅ Evita doble FileReader

    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // ✅ Libera memoria inmediatamente

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl); // ✅ Libera memoria también en error
      reject(new Error("No se pudo cargar la imagen"));
    };

    img.src = objectUrl;
  });
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
  numero: guia, // 
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
const res = await fetch("https://script.google.com/macros/s/AKfycbzP04DM6clsY4oUASPu3HDRLdFlsjk4EwORNVcYMlC4hNPaPr2W4KsUGNOoecXJIUCr/exec", {
  method: "POST",
  body: new URLSearchParams({ data: JSON.stringify(payload) })
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
function nuevaEntrega() {
  resetFormEntregas();
  showScreen("screen-entregas");
}
function doLogout() {
  // Limpia datos del usuario
  usuarioActivo = null;
  localStorage.removeItem("patente");

  // Muestra mensaje visual
  const mensaje = document.createElement("div");
  mensaje.textContent = "✅ Sesión cerrada correctamente";
  mensaje.style.position = "fixed";
  mensaje.style.bottom = "20px";
  mensaje.style.left = "50%";
  mensaje.style.transform = "translateX(-50%)";
  mensaje.style.background = "#0d47a1";
  mensaje.style.color = "white";
  mensaje.style.padding = "10px 20px";
  mensaje.style.borderRadius = "6px";
  mensaje.style.fontWeight = "500";
  mensaje.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  mensaje.style.zIndex = "9999";
  document.body.appendChild(mensaje);

  // Oculta el mensaje después de 2 segundos
  setTimeout(() => mensaje.remove(), 2000);

  // Retorna al login
  showScreen("screen-login");
}

