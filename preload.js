const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  verificarAsistencia: (params) => ipcRenderer.invoke('verificar-asistencia', params),
  iniciarDia: (usuario) => ipcRenderer.invoke('iniciar-dia', usuario),
  cerrarDia: (usuario) => ipcRenderer.invoke('cerrar-dia', usuario),
  verificarEstadoDia: () => ipcRenderer.invoke('verificar-estado-dia'),
  validarCredenciales: (credenciales) => ipcRenderer.invoke('validar-credenciales', credenciales),
  obtenerHistorialDia: (fecha) => ipcRenderer.invoke('obtener-historial-dia', fecha),
  obtenerDiasLaborales: () => ipcRenderer.invoke('obtener-dias-laborales'),
  generarPDF: (data) => ipcRenderer.send('generar-pdf', data),
  onPDFGenerado: (callback) => ipcRenderer.on('pdf-generado', (_, data) => callback(data))
});