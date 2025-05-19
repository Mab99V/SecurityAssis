const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  verificarAsistencia: (params) => ipcRenderer.invoke('verificar-asistencia', params),
  obtenerHistorial: (fecha) => ipcRenderer.invoke('obtener-historial', fecha),
  generarPDF: (fecha) => ipcRenderer.send('generar-pdf', fecha),
  cerrarDia: (fecha) => ipcRenderer.invoke('cerrar-dia', fecha)
})