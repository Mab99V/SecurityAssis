const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const PDFDocument = require('pdfkit')
const fs = require('fs')
const db = require('./database') // Importa el módulo de base completo

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

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

// Este es el flujo correcto: inicializa primero la BD, luego el resto
app.whenReady().then(() => {
  db.inicializarBaseDeDatos((err) => {
    if (err) {
      console.error("Error inicializando la base de datos:", err);
      app.quit();
      return;
    }

    createWindow();

    // Manejadores IPC solo después de la inicialización de la base
    ipcMain.handle('verificar-asistencia', async (event, params) => {
      return new Promise((resolve) => {
        db.verificarAsistencia(params, (err, result) => {
          if (err) {
            console.error("Error:", err)
            resolve({ error: "Error en el servidor" })
          } else {
            resolve(result)
          }
        })
      })
    });

    ipcMain.handle('cerrar-dia', async (event, fecha) => {
      return new Promise((resolve) => {
        db.cerrarDia(fecha, (err, result) => {
          if (err) {
            console.error("Error al cerrar día:", err);
            resolve({ error: "Error al cerrar el día" });
          } else {
            resolve(result);
          }
        });
      });
    });

    ipcMain.handle('obtener-historial', async (event, fecha) => {
      return new Promise((resolve) => {
        db.obtenerHistorial(fecha, (err, result) => {
          if (err) {
            console.error("Error:", err)
            resolve({ error: "Error al obtener historial" })
          } else {
            resolve(result)
          }
        })
      })
    });

    ipcMain.on('generar-pdf', async (event, fecha) => {
      try {
        // Obtener los datos del historial
        const historial = await new Promise((resolve, reject) => {
          db.obtenerHistorial(fecha, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });

        if (!historial || !historial.registros) {
          throw new Error("No se obtuvieron datos del historial");
        }

        // Configurar diálogo para guardar archivo
        const { filePath } = await dialog.showSaveDialog({
          title: "Guardar Historial de Asistencia",
          defaultPath: path.join(app.getPath('documents'), `asistencia_${fecha}.pdf`),
          filters: [
            { name: 'Documento PDF', extensions: ['pdf'] },
            { name: 'Todos los archivos', extensions: ['*'] }
          ],
          properties: ['createDirectory']
        });

        if (!filePath) return;

        // Crear el documento PDF
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Encabezado del documento
        doc.font('Helvetica-Bold')
          .fontSize(20)
          .text('HISTORIAL DE ASISTENCIA', { align: 'center' });

        doc.moveDown(0.5);

        doc.font('Helvetica')
          .fontSize(14)
          .text(`Fecha: ${fecha}`, { align: 'center' });

        doc.moveDown(1);

        // Configuración de la tabla
        const startY = doc.y;
        const margin = 50;
        const rowHeight = 25;
        const headers = ['Nombre', 'Área', 'Entrada', 'Salida'];
        const columnWidths = [200, 150, 100, 100];

        // Encabezados de la tabla
        doc.font('Helvetica-Bold').fontSize(12);
        let x = margin;
        headers.forEach((header, i) => {
          doc.text(header, x, startY, { width: columnWidths[i] });
          x += columnWidths[i];
        });

        // Línea divisoria
        doc.moveTo(margin, startY + rowHeight)
          .lineTo(margin + columnWidths.reduce((a, b) => a + b, 0), startY + rowHeight)
          .stroke();

        // Contenido de la tabla
        doc.font('Helvetica').fontSize(10);
        let y = startY + rowHeight + 10;

        historial.registros.forEach(registro => {
          x = margin;

          // Nombre
          doc.text(`${registro.nombre} ${registro.apellido}`, x, y, {
            width: columnWidths[0],
            ellipsis: true
          });
          x += columnWidths[0];

          // Área
          doc.text(registro.area, x, y, {
            width: columnWidths[1],
            ellipsis: true
          });
          x += columnWidths[1];

          // Entrada
          doc.text(registro.hora_entrada || '--:--:--', x, y, {
            width: columnWidths[2],
            align: 'center'
          });
          x += columnWidths[2];

          // Salida
          doc.text(registro.hora_salida || '--:--:--', x, y, {
            width: columnWidths[3],
            align: 'center'
          });

          y += rowHeight;
        });

        // Pie de página
        doc.fontSize(10)
          .text(`Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`,
            { align: 'right' });

        // Finalizar documento
        doc.end();

        // Manejar eventos de finalización y error
        writeStream.on('finish', () => {
          event.sender.send('pdf-generado', {
            success: true,
            path: filePath
          });
        });

        writeStream.on('error', (error) => {
          throw error;
        });

      } catch (error) {
        console.error('Error al generar PDF:', error);
        event.sender.send('pdf-generado', {
          success: false,
          error: error.message
        });
      }
    });
  });
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})