const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  verificarAsistencia: (qr) => ipcRenderer.invoke('verificar-asistencia', qr),
  obtenerHistorial: (fecha) => ipcRenderer.invoke('obtener-historial', fecha),
  generarPDF: (fecha) => ipcRenderer.send('generar-pdf', fecha)
})