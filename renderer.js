// Estado de la aplicación
let html5QrCode = null;
let isScanning = false;
let cameraId = null;

// Elementos del DOM
const elements = {
    scanBtn: document.getElementById('scan-btn'),
    resultadoDiv: document.getElementById('resultado'),
    qrReaderDiv: document.getElementById('qr-reader'),
    cameraPreviewText: document.getElementById('camera-preview-text'),
    historialBody: document.getElementById('historial-body'),
    fechaActualElement: document.getElementById('fecha-actual'),
    generarPdfBtn: document.getElementById('generar-pdf')
};

// Verificar si los elementos existen
function checkElements() {
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Elemento no encontrado: ${key}`);
            return false;
        }
    }
    return true;
}

// Función para formatear fecha
function formatDate(date) {
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('es-MX', options);
}

// Mostrar fecha actual
function mostrarFechaActual() {
    const hoy = new Date();
    elements.fechaActualElement.textContent = formatDate(hoy);
    return hoy.toISOString().split('T')[0]; // Retorna fecha en formato YYYY-MM-DD
}

// Cargar historial del día
// Función para cargar el historial (actualizada)
async function cargarHistorial(fecha) {
    try {
        // Mostrar estado de carga
        elements.historialBody.innerHTML = `
            <tr>
                <td colspan="4" class="loading">
                    <i class="fas fa-spinner fa-spin"></i> Cargando historial...
                </td>
            </tr>
        `;

        const historial = await window.electronAPI.obtenerHistorial(fecha);
        
        // Limpiar tabla
        elements.historialBody.innerHTML = '';
        
        // Manejar caso sin registros
        if (!historial || historial.length === 0) {
            elements.historialBody.innerHTML = `
                <tr>
                    <td colspan="4">No hay registros para esta fecha</td>
                </tr>
            `;
            return;
        }
        
        // Llenar tabla con los registros
        historial.forEach(registro => {
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

// Modificación en stopScanner para actualizar el historial
async function stopScanner() {
    if (!html5QrCode || !isScanning) return;
    
    try {
        await html5QrCode.stop();
        elements.resultadoDiv.innerHTML = '<p><i class="fas fa-check-circle"></i> Escaneo detenido</p>';
        
        // Actualizar el historial después de detener el escáner
        const fecha = mostrarFechaActual();
        await cargarHistorial(fecha);
        
    } catch (error) {
        console.error("Error al detener escáner:", error);
        elements.resultadoDiv.innerHTML = `
            <p class="error">
                <i class="fas fa-exclamation-circle"></i> Error al detener escáner: ${error.message}
            </p>
        `;
    } finally {
        isScanning = false;
        elements.scanBtn.innerHTML = '<i class="fas fa-camera"></i> Iniciar Escaneo';
        elements.scanBtn.classList.remove('scanning');
        html5QrCode = null;
        elements.cameraPreviewText.style.display = 'block';
    }
}

// Modificación en handleScannedQR para actualizar el historial
async function handleScannedQR(qrCode) {
    if (!qrCode?.trim()) {
        elements.resultadoDiv.innerHTML = '<p class="error"><i class="fas fa-exclamation-circle"></i> Código QR vacío o inválido</p>';
        return;
    }

    try {
        elements.resultadoDiv.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Verificando código QR...</p>';
        
        const resultado = await window.electronAPI.verificarAsistencia(qrCode);
        
        if (resultado.error) {
            elements.resultadoDiv.innerHTML = `<p class="error"><i class="fas fa-exclamation-circle"></i> ${resultado.error}</p>`;
        } else {
            elements.resultadoDiv.innerHTML = `
                <div class="registro-exitoso">
                    <h3><i class="fas fa-check-circle"></i> ${resultado.tipo.toUpperCase()} REGISTRADA</h3>
                    <p><strong>Nombre:</strong> ${resultado.empleado.nombre} ${resultado.empleado.apellido}</p>
                    <p><strong>Área:</strong> ${resultado.empleado.area}</p>
                    <p><strong>Hora:</strong> ${resultado.hora}</p>
                    <p class="success">${resultado.mensaje}</p>
                </div>
            `;
            
            // Actualizar historial después de registrar
            const fecha = mostrarFechaActual();
            await cargarHistorial(fecha);
        }
    } catch (error) {
        console.error("Error en handleScannedQR:", error);
        elements.resultadoDiv.innerHTML = `
            <div class="error">
                <p><i class="fas fa-exclamation-circle"></i> Error al registrar asistencia: ${error.message}</p>
                <p class="hint">Intenta nuevamente o contacta al administrador</p>
            </div>
        `;
    }
}

// Generar PDF
function setupGenerarPDF() {
    elements.generarPdfBtn.addEventListener('click', async () => {
        try {
            const fecha = mostrarFechaActual();
            elements.generarPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
            elements.generarPdfBtn.disabled = true;
            
            await window.electronAPI.generarPDF(fecha);
            
            elements.generarPdfBtn.innerHTML = '<i class="fas fa-check"></i> PDF Generado';
            setTimeout(() => {
                elements.generarPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF';
                elements.generarPdfBtn.disabled = false;
            }, 2000);
        } catch (error) {
            console.error("Error al generar PDF:", error);
            elements.resultadoDiv.innerHTML = `
                <div class="error">
                    <p>Error al generar PDF: ${error.message}</p>
                </div>
            `;
            elements.generarPdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i> Generar PDF';
            elements.generarPdfBtn.disabled = false;
        }
    });
}

// Control principal del escáner
async function toggleScanner() {
    if (isScanning) return await stopScanner();

    try {
        elements.scanBtn.disabled = true;
        elements.scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando cámaras...';
        elements.resultadoDiv.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Preparando escáner...</p>';
        
        if (!window.Html5Qrcode) {
            throw new Error('La librería de escaneo QR no está cargada');
        }

        const devices = await window.Html5Qrcode.getCameras();
        if (devices.length === 0) {
            throw new Error('No se detectaron cámaras. Conecta una cámara y recarga.');
        }

        // Priorizar cámaras virtuales (Camo/OBS/DroidCam)
        const virtualCams = devices.filter(device => 
            /camo|virtual|obs|droidcam/i.test(device.label)
        );
        const sortedCams = [...virtualCams, ...devices.filter(d => !virtualCams.includes(d))];
        
        cameraId = sortedCams[0].id;
        elements.cameraPreviewText.style.display = 'none';
        
        html5QrCode = new window.Html5Qrcode(elements.qrReaderDiv.id);
        
        await html5QrCode.start(
            cameraId,
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.777778, // 16:9
                disableFlip: false,
                supportedScanTypes: [window.Html5Qrcode.SCAN_TYPE_CAMERA],
                formatsToSupport: [window.Html5QrcodeSupportedFormats.QR_CODE]
            },
            decodedText => handleScannedQR(decodedText),
            errorMessage => {
                if (!errorMessage.includes('No MultiFormat Readers')) {
                    elements.resultadoDiv.innerHTML = `<p class="error">Error: ${errorMessage}</p>`;
                }
            }
        );

        isScanning = true;
        elements.scanBtn.innerHTML = '<i class="fas fa-stop"></i> Detener Escaneo';
        elements.scanBtn.classList.add('scanning');
        elements.resultadoDiv.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Escaneando... Enfoca el código QR en el área delimitada</p>';
    } catch (error) {
        console.error("Error en el escáner:", error);
        elements.resultadoDiv.innerHTML = `
            <div class="error">
                <p>${error.message}</p>
                <p class="hint">Consejos:</p>
                <ul>
                    <li>Asegúrate que la cámara esté conectada</li>
                    <li>Verifica los permisos de cámara</li>
                    <li>Si usas Camo/OBS, asegúrate que esté funcionando</li>
                </ul>
            </div>
        `;
        elements.scanBtn.innerHTML = '<i class="fas fa-redo"></i> Reintentar';
        elements.cameraPreviewText.style.display = 'block';
    } finally {
        elements.scanBtn.disabled = false;
    }
}

// Detener el escaneo
async function stopScanner() {
    if (!html5QrCode || !isScanning) return;
    
    try {
        await html5QrCode.stop();
        elements.resultadoDiv.innerHTML = '<p>Escaneo detenido</p>';
    } catch (error) {
        console.error("Error al detener escáner:", error);
        elements.resultadoDiv.innerHTML = `<p class="error">Error al detener: ${error.message}</p>`;
    } finally {
        isScanning = false;
        elements.scanBtn.innerHTML = '<i class="fas fa-camera"></i> Iniciar Escaneo';
        elements.scanBtn.classList.remove('scanning');
        html5QrCode = null;
        elements.cameraPreviewText.style.display = 'block';
    }
}

// Procesamiento del QR escaneado
async function handleScannedQR(qrCode) {
    if (!qrCode?.trim()) {
        elements.resultadoDiv.innerHTML = '<p class="error">Código QR vacío o inválido</p>';
        return;
    }

    try {
        elements.resultadoDiv.innerHTML = '<p class="loading"><i class="fas fa-spinner fa-spin"></i> Verificando código QR...</p>';
        
        const resultado = await window.electronAPI.verificarAsistencia(qrCode);
        
        if (resultado.error) {
            elements.resultadoDiv.innerHTML = `<p class="error">${resultado.error}</p>`;
        } else {
            elements.resultadoDiv.innerHTML = `
                <div class="registro-exitoso">
                    <h3>${resultado.tipo.toUpperCase()} REGISTRADA</h3>
                    <p><strong>Nombre:</strong> ${resultado.empleado.nombre} ${resultado.empleado.apellido}</p>
                    <p><strong>Área:</strong> ${resultado.empleado.area}</p>
                    <p><strong>Hora:</strong> ${resultado.hora}</p>
                    <p class="success">${resultado.mensaje}</p>
                </div>
            `;
            
            // Actualizar historial después de registrar
            const fecha = mostrarFechaActual();
            await cargarHistorial(fecha);
        }
    } catch (error) {
        console.error("Error en handleScannedQR:", error);
        elements.resultadoDiv.innerHTML = `
            <div class="error">
                <p>Error al registrar asistencia: ${error.message}</p>
                <p class="hint">Intenta nuevamente o contacta al administrador</p>
            </div>
        `;
    }
}

// Inicialización de la aplicación
async function initializeApp() {
    if (!checkElements()) {
        console.error('Faltan elementos esenciales en el DOM');
        return;
    }

    try {
        // Configurar eventos
        elements.scanBtn.addEventListener('click', toggleScanner);
        setupGenerarPDF();
        
        // Mostrar fecha y cargar historial inicial
        const fecha = mostrarFechaActual();
        await cargarHistorial(fecha);
        
        // Verificar si la librería QR está disponible
        if (!window.Html5Qrcode) {
            throw new Error('La librería de escaneo QR no se cargó correctamente');
        }
    } catch (error) {
        console.error("Error en inicialización:", error);
        elements.resultadoDiv.innerHTML = `
            <div class="error">
                <p>Error de inicialización: ${error.message}</p>
                <p class="hint">Recarga la página o contacta al administrador</p>
            </div>
        `;
        elements.scanBtn.disabled = true;
    }
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);

// Limpieza al cerrar la ventana
window.addEventListener('beforeunload', stopScanner);