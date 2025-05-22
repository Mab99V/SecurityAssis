const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./asistencia.db');

db.all("SELECT id, qr_asignado, nombre, apellido FROM empleados WHERE qr_asignado='OP00040'", (err, rows) => {
  if (err) return console.error("Error:", err);
  console.log('Resultado:', rows);
  db.close();
});