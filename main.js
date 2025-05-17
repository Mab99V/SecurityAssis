const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const PDFDocument = require('pdfkit')
const fs = require('fs')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Configuración segura:
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  // Configurar CSP
  win.webContents.on('dom-ready', () => {
    win.webContents.insertCSS(`
      :root {
        --primary: #3498db;
        --secondary: #2c3e50;
        --success: #2ecc71;
        --danger: #e74c3c;
        --light: #ecf0f1;
        --dark: #34495e;
      }
    `)
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Manejadores IPC
ipcMain.handle('verificar-asistencia', async (event, qr) => {
  const { verificarAsistencia } = require('./database')
  return new Promise((resolve) => {
    verificarAsistencia(qr, (err, result) => {
      if (err) {
        console.error("Error:", err)
        resolve({ error: "Error en el servidor" })
      } else {
        resolve(result)
      }
    })
  })
})

ipcMain.handle('obtener-historial', async (event, fecha) => {
  const { obtenerHistorial } = require('./database')
  return new Promise((resolve) => {
    obtenerHistorial(fecha, (err, result) => {
      if (err) {
        console.error("Error:", err)
        resolve({ error: "Error al obtener historial" })
      } else {
        resolve(result)
      }
    })
  })
})

ipcMain.on('generar-pdf', async (event, fecha) => {
  const { obtenerHistorial } = require('./database')
  
  obtenerHistorial(fecha, async (err, registros) => {
    if (err) {
      console.error("Error al generar PDF:", err)
      return
    }

    const options = {
      title: "Exportar Historial",
      defaultPath: `historial_asistencia_${fecha}.pdf`,
      filters: [
        { name: 'PDF', extensions: ['pdf'] }
      ]
    }

    const { filePath } = await dialog.showSaveDialog(options)
    if (!filePath) return

    const doc = new PDFDocument()
    const stream = fs.createWriteStream(filePath)
    doc.pipe(stream)

    // Encabezado
    doc.fontSize(20).text('Historial de Asistencia', { align: 'center' })
    doc.fontSize(14).text(`Fecha: ${fecha}`, { align: 'center' })
    doc.moveDown()

    // Tabla de registros
    const table = {
      headers: ['Nombre', 'Área', 'Entrada', 'Salida'],
      rows: registros.map(r => [
        `${r.nombre} ${r.apellido}`,
        r.area,
        r.hora_entrada || '--:--:--',
        r.hora_salida || '--:--:--'
      ])
    }

    // Dibujar tabla
    doc.font('Helvetica-Bold')
    doc.fontSize(12)
    let y = doc.y
    const colWidths = [200, 150, 100, 100]
    const rowHeight = 20

    // Encabezados
    table.headers.forEach((header, i) => {
      doc.text(header, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
        width: colWidths[i],
        align: 'left'
      })
    })
    y += rowHeight

    // Filas
    doc.font('Helvetica')
    table.rows.forEach(row => {
      row.forEach((cell, i) => {
        doc.text(cell, 50 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
          width: colWidths[i],
          align: 'left'
        })
      })
      y += rowHeight
    })

    doc.end()
  })
})