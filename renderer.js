// Estado de la aplicación
let html5QrCode = null;
let isScanning = false;
let modoEscaneo = 'entrada'; // 'entrada' o 'salida'
let ultimoQRLeido = null;
let tiempoUltimoEscaneo = 0;

// Elementos del DOM
const elements = {
    scanBtn: document.getElementById('scan-btn'),
    resultadoDiv: document.getElementById('resultado'),
    qrReaderDiv: document.getElementById('qr-reader'),
    cameraPreviewText: document.getElementById('camera-preview-text'),
    historialBody: document.getElementById('historial-body'),
    fechaActualElement: document.getElementById('fecha-actual'),
    generarPdfBtn: document.getElementById('generar-pdf'),
    modoEntradaBtn: document.getElementById('modo-entrada'),
    modoSalidaBtn: document.getElementById('modo-salida'),
    cerrarDiaBtn: document.getElementById('cerrar-dia')
};

// Función para limpiar QR
function limpiarQR(qr) {
    return qr.replace(/[^\x20-\x7E]/g, '').trim().toUpperCase();
}

// Control de velocidad de escaneo
function puedeProcesarQR(qr) {
    const ahora = Date.now();
    const qrLimpio = limpiarQR(qr);
    
    // Evitar procesar el mismo QR en menos de 3 segundos
    if (ultimoQRLeido === qrLimpio && (ahora - tiempoUltimoEscaneo) < 3000) {
        return false;
    }
    
    ultimoQRLeido = qrLimpio;
    tiempoUltimoEscaneo = ahora;
    return true;
}

// Mostrar fecha actual
function mostrarFechaActual() {
    const hoy = new Date();
    elements.fechaActualElement.textContent = hoy.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    return hoy.toISOString().split('T')[0];
}

async function cerrarDia() {
    try {
        elements.cerrarDiaBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cerrando día...';
        elements.cerrarDiaBtn.disabled = true;
        
        const fecha = mostrarFechaActual();
        const resultado = await window.electronAPI.cerrarDia(fecha);
        
        elements.resultadoDiv.innerHTML = `
            <div class="registro-exitoso">
                <h3><i class="fas fa-check-circle"></i> DÍA CERRADO</h3>
                <p><strong>Fecha:</strong> ${resultado.fecha}</p>
                <p><strong>Total registros:</strong> ${resultado.total}</p>
                <p><strong>Completos:</strong> ${resultado.completos}</p>
                <p><strong>Pendientes:</strong> ${resultado.pendientes}</p>
                <p class="success">El historial del día ha sido guardado</p>
            </div>
        `;
        
        // Actualizar el historial
        await cargarHistorial(fecha);
        
    } catch (error) {
        console.error("Error al cerrar día:", error);
        elements.resultadoDiv.innerHTML = `
            <div class="error">
                <p><i class="fas fa-exclamation-circle"></i> Error al cerrar el día</p>
                <p class="hint">${error.message || 'Intenta nuevamente'}</p>
            </div>
        `;
    } finally {
        elements.cerrarDiaBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Cerrar Día';
        elements.cerrarDiaBtn.disabled = false;
    }
}

// Cargar historial del día
async function cargarHistorial(fecha) {
    try {
        elements.historialBody.innerHTML = `
            <tr>
                <td colspan="4" class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Cargando historial...
                </td>
            </tr>
        `;

        const historial = await window.electronAPI.obtenerHistorial(fecha);
        
        elements.historialBody.innerHTML = '';
        
        if (!historial || !historial.registros || historial.registros.length === 0) {
            elements.historialBody.innerHTML = `
                <tr>
                    <td colspan="4">No hay registros para esta fecha</td>
                </tr>
            `;
            return;
        }
        
        historial.registros.forEach(registro => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${registro.nombre} ${registro.apellido}</td>
                <td>${registro.area}</td>
                <td>${registro.hora_entrada || '--:--:--'}</td>
                <td>${registro.hora_salida || '--:--:--'}</td>
            `;
            elements.historialBody.appendChild(row);
        });
        
    } catch (error) {
        console.error("Error al cargar historial:", error);
        elements.historialBody.innerHTML = `
            <tr>
                <td colspan="4" class="error">
                    <i class="fas fa-exclamation-triangle"></i> Error al cargar historial
                </td>
            </tr>
        `;
    }
}

// Control de modos
function setModoEscaneo(modo) {
    modoEscaneo = modo;
    elements.modoEntradaBtn.classList.toggle('active', modo === 'entrada');
    elements.modoSalidaBtn.classList.toggle('active', modo === 'salida');
    
    elements.resultadoDiv.innerHTML = `
        <div class="instrucciones">
            <p>Modo ${modo === 'entrada' ? 'ENTRADA' : 'SALIDA'} activado</p>
            <p>Escanea el código QR del empleado</p>
        </div>
    `;
}

// Mostrar resultado
function mostrarResultado(resultado) {
    const clase = resultado.tipo === 'entrada' ? 'success' : 'warning';
    
    elements.resultadoDiv.innerHTML = `
        <div class="registro-exitoso">
            <h3 class="${clase}"><i class="fas fa-check-circle"></i> ${resultado.tipo.toUpperCase()} REGISTRADA</h3>
            <p><strong>Nombre:</strong> ${resultado.empleado.nombre} ${resultado.empleado.apellido}</p>
            <p><strong>Área:</strong> ${resultado.empleado.area}</p>
            <p><strong>Hora:</strong> ${resultado.hora}</p>
            <p class="${clase}">${resultado.mensaje}</p>
        </div>
    `;
}

// Mostrar error
function mostrarError(mensaje) {
    elements.resultadoDiv.innerHTML = `
        <div class="error">
            <p><i class="fas fa-exclamation-circle"></i> ${mensaje}</p>
        </div>
    `;
}

// Procesar QR escaneado
async function handleScannedQR(qrCode) {
    if (!puedeProcesarQR(qrCode)) {
        console.log("QR ignorado (escaneo reciente)");
        return;
    }

    const qrLimpio = limpiarQR(qrCode);
    elements.resultadoDiv.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Procesando...</p>';

    try {
        const resultado = await window.electronAPI.verificarAsistencia({
            qr: qrLimpio,
            modo: modoEscaneo
        });

        if (resultado.error) {
            mostrarError(resultado.error);
        } else {
            mostrarResultado(resultado);
            await cargarHistorial(mostrarFechaActual());
        }
    } catch (error) {
        mostrarError(`Error: ${error.message}`);
    }
}

// Generar PDF
async function generarPDF() {
    try {
      elements.generarPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
      elements.generarPdfBtn.disabled = true;
      
      const fecha = mostrarFechaActual();
      const resultado = await window.electronAPI.generarPDF(fecha);
  
      if (resultado.success) {
        elements.resultadoDiv.innerHTML = `
          <div class="registro-exitoso">
            <h3><i class="fas fa-check-circle"></i> PDF GENERADO</h3>
            <p>El archivo se guardó correctamente en:</p>
            <p class="success">${resultado.path}</p>
          </div>
        `;
      } else {
        throw new Error(resultado.error || 'Error desconocido al generar PDF');
      }
      
    } catch (error) {
      console.error("Error al generar PDF:", error);
      elements.resultadoDiv.innerHTML = `
        <div class="error">
          <p><i class="fas fa-exclamation-circle"></i> Error al generar PDF</p>
          <p class="hint">${error.message}</p>
          <p class="hint">Verifique los permisos de escritura o intente otra ubicación</p>
        </div>
      `;
    } finally {
      elements.generarPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF';
      elements.generarPdfBtn.disabled = false;
    }
  }

// Control del escáner
async function toggleScanner() {
    if (isScanning) return await stopScanner();

    try {
        elements.scanBtn.disabled = true;
        elements.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando cámaras...';
        
        if (!window.Html5Qrcode) {
            throw new Error('La librería de escaneo QR no está cargada');
        }

        const devices = await window.Html5Qrcode.getCameras();
        if (devices.length === 0) {
            throw new Error('No se detectaron cámaras. Conecta una cámara y recarga.');
        }

        cameraId = devices[0].id;
        elements.cameraPreviewText.style.display = 'none';
        
        html5QrCode = new window.Html5Qrcode(elements.qrReaderDiv.id);
        
        await html5QrCode.start(
            cameraId,
            {
                fps: 5, // Reducir FPS para mayor control
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.777778,
                disableFlip: false,
                supportedScanTypes: [window.Html5Qrcode.SCAN_TYPE_CAMERA],
                formatsToSupport: [window.Html5QrcodeSupportedFormats.QR_CODE]
            },
            decodedText => handleScannedQR(decodedText),
            errorMessage => {
                if (!errorMessage.includes('No MultiFormat Readers')) {
                    mostrarError(`Error: ${errorMessage}`);
                }
            }
        );

        isScanning = true;
        elements.scanBtn.innerHTML = '<i class="fas fa-stop"></i> Detener Escaneo';
        elements.scanBtn.classList.add('scanning');
    } catch (error) {
        console.error("Error en el escáner:", error);
        mostrarError(error.message);
        elements.scanBtn.innerHTML = '<i class="fas fa-redo"></i> Reintentar';
        elements.cameraPreviewText.style.display = 'block';
    } finally {
        elements.scanBtn.disabled = false;
    }
}

// Detener escáner
async function stopScanner() {
    if (!html5QrCode || !isScanning) return;
    
    try {
        await html5QrCode.stop();
        elements.resultadoDiv.innerHTML = `
            <div class="registro-exitoso">
                <p><i class="fas fa-check-circle"></i> Escaneo detenido correctamente</p>
            </div>
        `;
        
        // Actualizar el historial
        const fecha = mostrarFechaActual();
        await cargarHistorial(fecha);
        
    } catch (error) {
        console.error("Error al detener escáner:", error);
        elements.resultadoDiv.innerHTML = `
            <div class="error">
                <p><i class="fas fa-exclamation-circle"></i> Error al detener escáner</p>
                <p class="hint">${error.message || 'Intenta nuevamente'}</p>
            </div>
        `;
    } finally {
        isScanning = false;
        elements.scanBtn.innerHTML = '<i class="fas fa-camera"></i> Iniciar Escaneo';
        elements.scanBtn.classList.remove('scanning');
        html5QrCode = null;
        elements.cameraPreviewText.style.display = 'block';
    }
}

// Inicialización
async function initializeApp() {
    // Configurar eventos
    elements.scanBtn.addEventListener('click', toggleScanner);
    elements.modoEntradaBtn.addEventListener('click', () => setModoEscaneo('entrada'));
    elements.modoSalidaBtn.addEventListener('click', () => setModoEscaneo('salida'));
    elements.generarPdfBtn.addEventListener('click', generarPDF);
    
    // Configuración inicial
    setModoEscaneo('entrada');
    mostrarFechaActual();
    await cargarHistorial(mostrarFechaActual());
}

// Iniciar la aplicación
document.addEventListener('DOMContentLoaded', initializeApp);
window.addEventListener('beforeunload', stopScanner);
elements.cerrarDiaBtn.addEventListener('click', cerrarDia);