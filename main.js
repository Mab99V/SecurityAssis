const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const db = require('./database');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
  return win;
}

app.whenReady().then(() => {
  db.inicializarBaseDeDatos((err) => {
    if (err) {
      console.error("Error inicializando BD:", err);
      app.quit();
      return;
    }

    const mainWindow = createWindow();

    // Manejadores IPC

    ipcMain.handle('validar-credenciales', async (_, { usuario, contraseña }) => {
      return new Promise(resolve => {
        db.validarCredenciales(usuario, contraseña, (err, valido) => {
          if (err) resolve({ error: "Error al validar credenciales" });
          else resolve({ valido });
        });
      });
    });


    ipcMain.handle('verificar-asistencia', async (_, params) => {
      return new Promise(resolve => {
        db.verificarAsistencia(params, (err, result) => {
          if (err) resolve({ error: "Error en servidor" });
          else resolve(result);
        });
      });
    });

    ipcMain.handle('iniciar-dia', async (_, usuario) => {
      return new Promise(resolve => {
        db.iniciarDia(usuario, (err, result) => {
          if (err) resolve({ error: "Error al iniciar día" });
          else resolve(result);
        });
      });
    });

    ipcMain.handle('cerrar-dia', async (_, usuario) => {
      return new Promise(resolve => {
        db.cerrarDia(usuario, (err, result) => {
          if (err) resolve({ error: "Error al cerrar día" });
          else resolve(result);
        });
      });
    });

    ipcMain.handle('verificar-estado-dia', async () => {
      return new Promise(resolve => {
        const fecha = new Date().toISOString().split('T')[0];
        db.verificarEstadoDia(fecha, (err, result) => {
          if (err) resolve({ error: "Error al verificar estado" });
          else resolve(result);
        });
      });
    });

    ipcMain.handle('obtener-historial-dia', async (_, fecha) => {
      return new Promise(resolve => {
        db.obtenerHistorialDia(fecha, (err, result) => {
          if (err) resolve({ error: "Error al obtener historial" });
          else resolve(result);
        });
      });
    });

    ipcMain.handle('obtener-dias-laborales', async () => {
      return new Promise(resolve => {
        db.obtenerDiasLaborales(30, (err, result) => {
          if (err) resolve({ error: "Error al obtener días" });
          else resolve(result);
        });
      });
    });

    ipcMain.on('generar-pdf', async (event, { fecha, usuario }) => {
      try {
        const historial = await new Promise((resolve, reject) => {
          db.obtenerHistorialDia(fecha, (err, result) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
    
        const { filePath } = await dialog.showSaveDialog({
          title: "Guardar Reporte de Asistencia",
          defaultPath: path.join(app.getPath('documents'), `asistencia_${fecha}.pdf`),
          filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
    
        if (!filePath) return;
    
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
    
        // Encabezado
        doc.fontSize(20).text('REPORTE DE ASISTENCIA', { align: 'center' });
        doc.fontSize(12)
          .text(`Fecha: ${fecha}`, { align: 'center' })
          .text(`Generado por: ${usuario}`, { align: 'center' })
          .text(`Fecha de reporte: ${new Date().toLocaleString()}`, { align: 'center' })
          .moveDown(1);
    
        // Tabla mejorada
        const headers = ['Nombre', 'Área', 'Entrada', 'Salida', 'Estado'];
        const columnWidths = [170, 110, 80, 80, 80]; // Ajusta si necesitas más espacio
        const marginLeft = 50;
        const colGap = 10;
        let y = doc.y + 10;
    
        // Encabezado con fondo claro
        let x = marginLeft;
        doc.save();
        doc.rect(x - 5, y - 3, columnWidths.reduce((a, b) => a + b, 0) + colGap * (headers.length - 1) + 10, 22)
          .fill('#e3eefa');
        doc.restore();
    
        // Encabezados
        doc.font('Helvetica-Bold').fillColor('#1c3e4e');
        x = marginLeft;
        headers.forEach((header, i) => {
          doc.text(header, x, y, { width: columnWidths[i], align: 'left' });
          x += columnWidths[i] + colGap;
        });
    
        // Contenido
        doc.font('Helvetica');
        y += 22;
        historial.forEach(registro => {
          x = marginLeft;
    
          doc.fillColor('#000000'); // Text color default
          doc.text(`${registro.nombre} ${registro.apellido}`, x, y, { width: columnWidths[0], align: 'left' });
          x += columnWidths[0] + colGap;
    
          doc.text(registro.area, x, y, { width: columnWidths[1], align: 'left' });
          x += columnWidths[1] + colGap;
    
          doc.text(registro.hora_entrada || '--:--', x, y, { width: columnWidths[2], align: 'center' });
          x += columnWidths[2] + colGap;
    
          doc.text(registro.hora_salida || '--:--', x, y, { width: columnWidths[3], align: 'center' });
          x += columnWidths[3] + colGap;
    
          // Estado: color verde si "Completo", rojo/naranja si "Pendiente"
          if (registro.estado === 'Completo') {
            doc.fillColor('#2ecc71'); // Verde
          } else {
            doc.fillColor('#e67e22'); // Naranja (puedes poner #e74c3c para rojo)
          }
          doc.text(registro.estado, x, y, { width: columnWidths[4], align: 'center' });
          y += 20;
        });
    
        doc.end();
        stream.on('finish', () => event.sender.send('pdf-generado', { success: true, path: filePath }));
        stream.on('error', (err) => event.sender.send('pdf-generado', { success: false, error: err.message }));
    
      } catch (error) {
        event.sender.send('pdf-generado', { success: false, error: error.message });
      }
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});