// Elementos del DOM
const elements = {
    // Elementos principales
    scanBtn: document.getElementById('scan-btn'),
    resultadoDiv: document.getElementById('resultado'),
    qrReaderDiv: document.getElementById('qr-reader'),
    cameraPreviewText: document.getElementById('camera-preview-text'),
    iniciarDiaBtn: document.getElementById('iniciar-dia'),
    cerrarDiaBtn: document.getElementById('cerrar-dia'),
    estadoDiaElement: document.getElementById('estado-dia'),
    historialContainer: document.getElementById('historial-container'),
    fechaActualElement: document.getElementById('fecha-actual'),
    generarPdfBtn: document.getElementById('generar-pdf'),
  
    // Elementos de autenticación
    authModal: document.getElementById('auth-modal'),
    authForm: document.getElementById('auth-form'),
    authTitle: document.getElementById('auth-title'),
    authUser: document.getElementById('auth-user'),
    authPass: document.getElementById('auth-pass'),
    authError: document.getElementById('auth-error')
  };
  
  // Variables de estado
  let html5QrCode = null;
  let isScanning = false;
  let currentAuthResolve = null;
  
  // Debounce para evitar doble escaneo demasiado rápido del mismo QR
  let ultimoQR = '';
  let ultimoQRTime = 0;
  const BLOQUEO_REPESCANEO_MS = 5000; // 5 segundos
  
  // Credenciales fijas
  const CREDENCIALES_VALIDAS = {
    usuario: "logistica",
    contraseña: "ilogi"
  };
  
  // Función para mostrar fecha actual
  function mostrarFechaActual() {
    if (!elements.fechaActualElement) return;
  
    const hoy = new Date();
    elements.fechaActualElement.textContent = hoy.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Función para mostrar el modal de autenticación
  function mostrarAuthModal(accion = "") {
    return new Promise((resolve) => {
      // Verificar que los elementos existan
      if (!elements.authModal || !elements.authForm || !elements.authUser || !elements.authPass || !elements.authError || !elements.authTitle) {
        console.error('Elementos de autenticación no encontrados');
        resolve(null);
        return;
      }
  
      // Configurar el modal
      elements.authTitle.textContent = accion ? `Autenticación - ${accion}` : 'Autenticación';
      elements.authUser.value = '';
      elements.authPass.value = '';
      elements.authError.style.display = 'none';
      elements.authError.textContent = '';
      elements.authModal.style.display = 'flex';
      elements.authUser.focus();
  
      // Manejador temporal para el submit
      const handleSubmit = async (e) => {
        e.preventDefault();
  
        const usuario = elements.authUser.value.trim();
        const contraseña = elements.authPass.value;
  
        // Validación simple
        if (usuario === CREDENCIALES_VALIDAS.usuario && contraseña === CREDENCIALES_VALIDAS.contraseña) {
          elements.authModal.style.display = 'none';
          elements.authForm.removeEventListener('submit', handleSubmit);
          resolve(usuario);
        } else {
          mostrarErrorAuth('Credenciales incorrectas. Usuario: logistica, Contraseña: ilogi');
        }
      };
  
      // Agregar event listener
      elements.authForm.addEventListener('submit', handleSubmit);
  
      // Permitir cierre con ESC
      const handleEsc = (e) => {
        if (e.key === 'Escape') {
          elements.authModal.style.display = 'none';
          elements.authForm.removeEventListener('submit', handleSubmit);
          document.removeEventListener('keydown', handleEsc);
          resolve(null);
        }
      };
      document.addEventListener('keydown', handleEsc);
    });
  }
  
  // Función para mostrar errores en el modal
  function mostrarErrorAuth(mensaje) {
    if (!elements.authError) {
      console.error('Elemento auth-error no encontrado');
      return;
    }
  
    elements.authError.textContent = mensaje;
    elements.authError.style.display = 'block';
  
    // Ocultar después de 3 segundos
    setTimeout(() => {
      if (elements.authError) {
        elements.authError.style.display = 'none';
      }
    }, 3000);
  }
  
  // Función para mostrar resultados
  function mostrarResultado(resultado) {
    if (!elements.resultadoDiv) return;
  
    const div = document.createElement('div');
    div.className = `registro-exitoso ${resultado.tipo === 'error' ? 'error' : resultado.tipo === 'warning' ? 'warning' : ''}`;
  
    let extra = '';
    if (typeof resultado.total !== "undefined") {
      extra += `<p><strong>Total registros:</strong> ${resultado.total}</p>`;
      extra += `<p><strong>Completos:</strong> ${resultado.completos}</p>`;
      extra += `<p><strong>Pendientes:</strong> ${resultado.pendientes}</p>`;
    }
  
    div.innerHTML = `
        <h3><i class="fas fa-${
          resultado.tipo === 'error'
            ? 'exclamation-circle'
            : resultado.tipo === 'warning'
            ? 'exclamation-triangle'
            : 'check-circle'
        }"></i> ${resultado.titulo || resultado.tipo.toUpperCase()}</h3>
        ${resultado.mensaje ? `<p>${resultado.mensaje}</p>` : ''}
        ${resultado.fecha ? `<p><strong>Fecha:</strong> ${resultado.fecha}</p>` : ''}
        ${resultado.hora ? `<p><strong>Hora:</strong> ${resultado.hora}</p>` : ''}
        ${resultado.empleado ? `
            <p><strong>Nombre:</strong> ${resultado.empleado.nombre} ${resultado.empleado.apellido}</p>
            <p><strong>Área:</strong> ${resultado.empleado.area}</p>
        ` : ''}
        ${resultado.filePath ? `<div class="file-path">${resultado.filePath}</div>` : ''}
        ${extra}
    `;
  
    elements.resultadoDiv.innerHTML = '';
    elements.resultadoDiv.appendChild(div);
  }
  
  // Función para mostrar errores
  function mostrarError(titulo, mensaje) {
    mostrarResultado({
      tipo: 'error',
      titulo: titulo,
      mensaje: mensaje
    });
  }
  
  // Función para verificar estado del día
  async function verificarEstadoDia() {
    if (!elements.estadoDiaElement) return;
  
    try {
      const estado = await window.electronAPI.verificarEstadoDia();
      const fecha = new Date().toISOString().split('T')[0];
  
      if (estado.cerrado) {
        elements.estadoDiaElement.innerHTML = `
                <span class="badge cerrado">
                    <i class="fas fa-lock"></i> Día cerrado
                </span>
            `;
        if (elements.scanBtn) elements.scanBtn.disabled = true;
      } else {
        elements.estadoDiaElement.innerHTML = `
                <span class="badge abierto">
                    <i class="fas fa-lock-open"></i> Día abierto
                </span>
                <small>Iniciado por: ${estado.usuario_apertura} a las ${estado.hora_apertura}</small>
            `;
        if (elements.scanBtn) elements.scanBtn.disabled = false;
      }
  
      await cargarHistorialDia(fecha);
    } catch (error) {
      console.error("Error verificando estado:", error);
    }
  }
  
  // Función para cargar historial del día
  async function cargarHistorialDia(fecha) {
    if (!elements.historialContainer) return;
  
    try {
      elements.historialContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
      const registros = await window.electronAPI.obtenerHistorialDia(fecha);
  
      if (!registros || registros.length === 0) {
        elements.historialContainer.innerHTML = '<div class="no-data">No hay registros para este día</div>';
        return;
      }
  
      let html = `
            <table>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Área</th>
                        <th>Entrada</th>
                        <th>Salida</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
        `;
  
      registros.forEach(reg => {
        html += `
                <tr>
                    <td>${reg.nombre} ${reg.apellido}</td>
                    <td>${reg.area}</td>
                    <td>${reg.hora_entrada || '--:--'}</td>
                    <td>${reg.hora_salida || '--:--'}</td>
                    <td class="${reg.estado === 'Completo' ? 'completo' : 'pendiente'}">
                        ${reg.estado}
                    </td>
                </tr>
            `;
      });
  
      html += `</tbody></table>`;
      elements.historialContainer.innerHTML = html;
    } catch (error) {
      elements.historialContainer.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i> Error al cargar historial
            </div>
        `;
    }
  }
  
  // Función para iniciar día
  async function iniciarDia() {
    try {
      const usuario = await mostrarAuthModal("Iniciar día");
      if (!usuario) {
        console.log('Autenticación cancelada');
        return;
      }
  
      if (elements.iniciarDiaBtn) {
        elements.iniciarDiaBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Iniciando...';
        elements.iniciarDiaBtn.disabled = true;
      }
  
      const resultado = await window.electronAPI.iniciarDia(usuario);
  
      mostrarResultado({
        tipo: 'success',
        titulo: 'DÍA INICIADO',
        mensaje: `El día ha sido iniciado correctamente por ${usuario}`,
        fecha: resultado.fecha
      });
  
      await verificarEstadoDia();
    } catch (error) {
      mostrarError("Error al iniciar día", error.message || 'Ocurrió un error al iniciar el día');
    } finally {
      if (elements.iniciarDiaBtn) {
        elements.iniciarDiaBtn.innerHTML = '<i class="fas fa-calendar-day"></i> Iniciar Día';
        elements.iniciarDiaBtn.disabled = false;
      }
    }
  }
  
  // Función para cerrar día
  async function cerrarDia() {
    try {
      const usuario = await mostrarAuthModal("Cerrar día");
      if (!usuario) {
        console.log('Autenticación cancelada');
        return;
      }
  
      if (elements.cerrarDiaBtn) {
        elements.cerrarDiaBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando...';
        elements.cerrarDiaBtn.disabled = true;
      }
  
      const resultado = await window.electronAPI.cerrarDia(usuario);
  
      mostrarResultado({
        tipo: 'success',
        titulo: 'DÍA CERRADO',
        mensaje: `El día ha sido cerrado correctamente por ${usuario}`,
        fecha: resultado.fecha,
        total: resultado.total,
        completos: resultado.completos,
        pendientes: resultado.pendientes
      });
  
      await verificarEstadoDia();
    } catch (error) {
      mostrarError("Error al cerrar día", error.message || 'Ocurrió un error al cerrar el día');
    } finally {
      if (elements.cerrarDiaBtn) {
        elements.cerrarDiaBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Cerrar Día';
        elements.cerrarDiaBtn.disabled = false;
      }
    }
  }
  
  // Función para generar PDF
  async function generarPDF() {
    try {
      const usuario = await mostrarAuthModal("Generar PDF");
      if (!usuario) {
        console.log('Autenticación cancelada');
        return;
      }
  
      if (elements.generarPdfBtn) {
        elements.generarPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        elements.generarPdfBtn.disabled = true;
      }
  
      const fecha = new Date().toISOString().split('T')[0];
  
      await new Promise((resolve) => {
        window.electronAPI.generarPDF({ fecha, usuario });
  
        window.electronAPI.onPDFGenerado((data) => {
          if (data.success) {
            mostrarResultado({
              tipo: 'success',
              titulo: 'PDF GENERADO',
              mensaje: `El reporte PDF se ha generado correctamente`,
              filePath: data.path
            });
          } else {
            mostrarError("Error al generar PDF", data.error || 'Ocurrió un error al generar el PDF');
          }
          resolve();
        });
      });
    } catch (error) {
      mostrarError("Error al generar PDF", error.message || 'Ocurrió un error al generar el PDF');
    } finally {
      if (elements.generarPdfBtn) {
        elements.generarPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF';
        elements.generarPdfBtn.disabled = false;
      }
    }
  }
  
  // Función para procesar QR escaneado
  async function handleScannedQR(qrCode) {
    // Debounce: ignora si es el mismo QR escaneado hace muy poco
    const ahora = Date.now();
    if (qrCode === ultimoQR && (ahora - ultimoQRTime) < BLOQUEO_REPESCANEO_MS) {
      mostrarResultado({
        tipo: "warning",
        titulo: "ESPERA ANTES DE REPETIR ESCANEO",
        mensaje: "Por favor, retira el QR y vuelve a acercarlo después de unos segundos."
      });
      return;
    }
    ultimoQR = qrCode;
    ultimoQRTime = ahora;
  
    if (!elements.resultadoDiv) return;
  
    elements.resultadoDiv.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Procesando...</div>';
  
    try {
      const resultado = await window.electronAPI.verificarAsistencia({ qr: qrCode });
  
      if (resultado.error) {
        mostrarError(resultado.error, resultado.detail);
      } else {
        mostrarResultado({
          tipo: resultado.tipo === 'entrada' ? 'success' : 'warning',
          titulo: `${resultado.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA'} REGISTRADA`,
          empleado: resultado.empleado,
          hora: resultado.hora,
          mensaje: resultado.mensaje
        });
  
        await cargarHistorialDia(new Date().toISOString().split('T')[0]);
      }
    } catch (error) {
      mostrarError("Error al procesar QR", error.message || 'Ocurrió un error al procesar el código QR');
    }
  }
  
  // Función para alternar el escáner
  async function toggleScanner() {
    if (isScanning) return await stopScanner();
  
    try {
      if (elements.scanBtn) {
        elements.scanBtn.disabled = true;
        elements.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando...';
      }
  
      const devices = await window.Html5Qrcode.getCameras();
      if (devices.length === 0) {
        throw new Error('No se detectaron cámaras disponibles');
      }
  
      if (elements.cameraPreviewText) {
        elements.cameraPreviewText.style.display = 'none';
      }
  
      html5QrCode = new window.Html5Qrcode(elements.qrReaderDiv.id);
  
      await html5QrCode.start(
        devices[0].id,
        {
          fps: 5,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.777778
        },
        decodedText => handleScannedQR(decodedText),
        errorMessage => {
          if (!errorMessage.includes('No MultiFormat Readers')) {
            console.error("Error en escáner:", errorMessage);
          }
        }
      );
  
      isScanning = true;
      if (elements.scanBtn) {
        elements.scanBtn.innerHTML = '<i class="fas fa-stop"></i> Detener';
        elements.scanBtn.classList.add('scanning');
        elements.scanBtn.disabled = false;
      }
    } catch (error) {
      mostrarError("Error en escáner", error.message || 'No se pudo iniciar el escáner');
      if (elements.cameraPreviewText) {
        elements.cameraPreviewText.style.display = 'block';
      }
      if (elements.scanBtn) {
        elements.scanBtn.innerHTML = '<i class="fas fa-camera"></i> Iniciar';
        elements.scanBtn.disabled = false;
      }
    }
  }
  
  // Función para detener el escáner
  async function stopScanner() {
    if (!html5QrCode || !isScanning) return;
  
    try {
      await html5QrCode.stop();
      mostrarResultado({
        tipo: 'success',
        titulo: 'ESCANEO DETENIDO',
        mensaje: 'El escaneo de códigos QR se ha detenido correctamente'
      });
    } catch (error) {
      mostrarError("Error al detener escáner", error.message || 'No se pudo detener el escáner correctamente');
    } finally {
      isScanning = false;
      if (elements.scanBtn) {
        elements.scanBtn.innerHTML = '<i class="fas fa-camera"></i> Iniciar';
        elements.scanBtn.classList.remove('scanning');
      }
      if (elements.cameraPreviewText) {
        elements.cameraPreviewText.style.display = 'block';
      }
    }
  }
  
  // Inicialización de la aplicación
  async function initializeApp() {
    // Verificar que los elementos principales existan
    if (!elements.scanBtn || !elements.iniciarDiaBtn || !elements.cerrarDiaBtn || !elements.generarPdfBtn) {
      console.error('Elementos principales no encontrados');
      return;
    }
  
    // Configurar event listeners
    elements.scanBtn.addEventListener('click', toggleScanner);
    elements.iniciarDiaBtn.addEventListener('click', iniciarDia);
    elements.cerrarDiaBtn.addEventListener('click', cerrarDia);
    elements.generarPdfBtn.addEventListener('click', generarPDF);
  
    // Mostrar fecha actual
    mostrarFechaActual();
  
    // Verificar estado del día
    await verificarEstadoDia();
  
    // Verificar cambio de día cada minuto
    setInterval(async () => {
      const ahora = new Date();
      if (ahora.getHours() === 0 && ahora.getMinutes() === 0) {
        await verificarEstadoDia();
      }
    }, 60000);
  }
  
  // Iniciar cuando el DOM esté listo
  document.addEventListener('DOMContentLoaded', initializeApp);
  
  // Limpiar al cerrar la ventana
  window.addEventListener('beforeunload', () => {
    if (html5QrCode && isScanning) {
      html5QrCode.stop();
    }
  });