const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./asistencia.db');

db.serialize(() => {
  db.all("SELECT id, qr_asignado FROM empleados", (err, rows) => {
    if (err) {
      console.error("Error leyendo empleados:", err);
      return;
    }
    rows.forEach(emp => {
      const qrLimpio = (emp.qr_asignado || '')
        .replace(/[^\x20-\x7E]/g, '')
        .trim()
        .toUpperCase();
      if (qrLimpio !== emp.qr_asignado) {
        db.run("UPDATE empleados SET qr_asignado = ? WHERE id = ?", [qrLimpio, emp.id], err => {
          if (err) console.error(`No se pudo limpiar QR para id=${emp.id}:`, err);
          else console.log(`QR id=${emp.id} corregido a: ${qrLimpio}`);
        });
      }
    });
  });
});

db.close();