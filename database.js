const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve('./asistencia.db');

const db = new sqlite3.Database(dbPath);

// Función para limpiar QR
function limpiarQR(qr) {
  return (qr || '').replace(/['"]/g, '').replace(/[^\x20-\x7E]/g, '').trim().toUpperCase();
}

// Inicializar base de datos
function inicializarBaseDeDatos(callback) {
  db.serialize(() => {
    // Tabla de empleados
    db.run(`CREATE TABLE IF NOT EXISTS empleados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      area TEXT NOT NULL,
      qr_asignado TEXT UNIQUE NOT NULL
    )`);

    // Tabla de asistencia
    db.run(`CREATE TABLE IF NOT EXISTS asistencia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      hora_entrada TEXT NOT NULL,
      hora_salida TEXT,
      FOREIGN KEY(empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
    )`);

    // Tabla de días laborales
    db.run(`CREATE TABLE IF NOT EXISTS dias_laborales (
      fecha TEXT PRIMARY KEY,
      usuario_apertura TEXT NOT NULL,
      hora_apertura TEXT NOT NULL,
      usuario_cierre TEXT,
      hora_cierre TEXT,
      cerrado INTEGER DEFAULT 1
    )`);

    // Índices
    db.run("CREATE INDEX IF NOT EXISTS idx_qr_asignado ON empleados(qr_asignado)");
    db.run("CREATE INDEX IF NOT EXISTS idx_asistencia_empleado ON asistencia(empleado_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia(fecha)");
    db.run("CREATE INDEX IF NOT EXISTS idx_dias_laborales_fecha ON dias_laborales(fecha)");

    // Insertar empleados de ejemplo (solo si la tabla está vacía)
    db.get("SELECT COUNT(*) as count FROM empleados", (err, row) => {
      if (err) return callback(err);
      if (row.count === 0) {
        const empleados = [
       
          { nombre: 'Manuel', apellido: 'Antonio Antonio', area: 'Vigilante Linda vista', qr: 'VIG00010' },
          { nombre: 'Arturo', apellido: 'Xochimanahua Tezoco', area: 'Vigilante Linda Vista', qr: 'VIG00020' },
          { nombre: 'Iran Jahir', apellido: 'Trujillo Baez', area: 'Ayudante', qr: 'AYU00010' },
          { nombre: 'Jose Alfredo', apellido: 'Cruz Allende', area: 'Ayudante', qr: 'AYU00020' },
          { nombre: 'Sergio', apellido: 'Dolores Crescencio', area: 'Ayudante', qr: 'AYU00030' },
          { nombre: 'Luis Daniel', apellido: 'Martinez Perez', area: 'Ayudante', qr: 'AYU00040' },
          { nombre: 'Irving', apellido: 'Oltehua Tztzihua Allende', area: 'Ayudante', qr: 'AYU00050' },
          { nombre: 'Andres', apellido: 'Mequixtle Acahua', area: 'Ayudante', qr: 'AYU00060' },
          { nombre: 'Andres', apellido: 'Lopez Martinez', area: 'Ayudante', qr: 'AYU00070' },
          { nombre: 'Julian', apellido: 'Lopez Jimenez', area: 'Ayudante', qr: 'AYU00080' },
          { nombre: 'Andres', apellido: 'Flores Trujillo', area: 'Ayudante', qr: 'AYU00090' },
          { nombre: 'Abraham', apellido: 'Reyes Joaquin', area: 'Ayudante', qr: 'AYU00100' },
          { nombre: 'Laura Janett', apellido: 'Cordova Torres', area: 'Administrativo', qr: 'ADM00010' },
          { nombre: 'Adriana', apellido: 'Leticia Urbano', area: 'Administrativo', qr: 'ADM00020' },
          { nombre: 'Eva Maria', apellido: 'Torres Lopez', area: 'Administrativo', qr: 'ADM00030' },
          { nombre: 'Maximina', apellido: 'Hernandez Zepactle', area: 'Administrativo', qr: 'ADM00040' },
          { nombre: 'Yazmin', apellido: 'Rosas Barrena', area: 'Administrativo', qr: 'ADM00050' },
          { nombre: 'Lina Arami', apellido: 'Garate Rivera', area: 'Administrativo', qr: 'ADM00060' },
          { nombre: 'Alejandra', apellido: 'Rosas Antonio', area: 'Administrativo', qr: 'ADM00070' },
          { nombre: 'Lizbeth', apellido: 'Xalamihua Sanchez', area: 'Administrativo', qr: 'ADM00080' },
          { nombre: 'Luis Armando', apellido: 'Saviñon Valenzuela', area: 'Administrativo', qr: 'ADM00090' },
          { nombre: 'Juan Emmanuel', apellido: 'Espidio Cruz', area: 'Operativo', qr: 'OP00010' },
          { nombre: 'Miguel', apellido: 'Jimenez Gines', area: 'Operativo', qr: 'OP00020' },
          { nombre: 'Cirilo', apellido: 'Merino de la Cruz', area: 'Operativo', qr: 'OP00030' },
          { nombre: 'Joel', apellido: 'Sanchez Sandoval', area: 'Operativo', qr: 'OP00040' },
          { nombre: 'Joaquin', apellido: 'Gomez Mecias', area: 'Operativo', qr: 'OP00050' },
          { nombre: 'Felix', apellido: 'Cancino Perez', area: 'Operativo', qr: 'OP00060' },
          { nombre: 'Jose Domingo', apellido: 'Salazar de Jesus', area: 'Operativo', qr: 'OP00070' },
          { nombre: 'Moises', apellido: 'Martinez Perez', area: 'Almacen', qr: 'ALM00010' },
          { nombre: 'Zayra Anahy', apellido: 'Palacios Olmos', area: 'Almacen', qr: 'ALM00020' },
          { nombre: 'Irais', apellido: 'Cortes Rivera', area: 'Almacen', qr: 'ALM00030' },
          { nombre: 'Bernando', apellido: 'Apolinar Ignacio', area: 'Almacen', qr: 'ALM00040' },
          { nombre: 'Eduardo', apellido: 'Figueroa Perez', area: 'Almacen', qr: 'ALM00050' },
          { nombre: 'Rufino', apellido: 'Reyes Antonio', area: 'Mantenimiento Fachadas', qr: 'FAC00010' },
          { nombre: 'Aide', apellido: 'Fentanez Alvarez', area: 'Envases', qr: 'ENV00010' },
          { nombre: 'Beatriz', apellido: 'Rivera Cortes', area: 'Limpieza', qr: 'LIM00010' }





        ];
        db.run("BEGIN TRANSACTION");
        const stmt = db.prepare("INSERT INTO empleados (nombre, apellido, area, qr_asignado) VALUES (?, ?, ?, ?)");
        empleados.forEach(emp => {
          const qrLimpio = limpiarQR(emp.qr);
          stmt.run(emp.nombre, emp.apellido, emp.area, qrLimpio);
        });
        stmt.finalize(err => {
          if (err) db.run("ROLLBACK", () => callback(err));
          else db.run("COMMIT", callback);
        });
      } else {
        callback(null);
      }
    });
  });
}

// Verificar estado del día
function verificarEstadoDia(fecha, callback) {
  db.get(
    `SELECT cerrado, usuario_apertura, hora_apertura 
     FROM dias_laborales WHERE fecha = ?`,
    [fecha],
    (err, row) => {
      if (err) return callback(err);
      callback(null, row || { cerrado: 1 });
    }
  );
}
function validarCredenciales(usuario, contraseña, callback) {
  // Credenciales fijas
  const USUARIO_VALIDO = "logistica";
  const CONTRASEÑA_VALIDA = "ilogi";
  
  const valido = (usuario === USUARIO_VALIDO && contraseña === CONTRASEÑA_VALIDA);
  callback(null, valido);
}

// Iniciar día laboral
function iniciarDia(usuario, callback) {
  const fecha = new Date().toISOString().split('T')[0];
  
  db.run(
    `INSERT OR REPLACE INTO dias_laborales 
     (fecha, usuario_apertura, hora_apertura, cerrado) 
     VALUES (?, ?, datetime('now'), 0)`,
    [fecha, usuario],
    function(err) {
      if (err) return callback(err);
      callback(null, { 
        success: true, 
        fecha,
        usuario,
        hora: new Date().toLocaleTimeString()
      });
    }
  );
}

// Cerrar día laboral
function cerrarDia(usuario, callback) {
  const fecha = new Date().toISOString().split('T')[0];
  
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    
    // 1. Cerrar el día
    db.run(
      `UPDATE dias_laborales 
       SET cerrado = 1, usuario_cierre = ?, hora_cierre = datetime('now')
       WHERE fecha = ?`,
      [usuario, fecha],
      (err) => {
        if (err) return db.run("ROLLBACK", () => callback(err));
        
        // 2. Obtener estadísticas
        db.get(
          `SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN hora_salida IS NOT NULL THEN 1 ELSE 0 END) as completos,
              SUM(CASE WHEN hora_salida IS NULL THEN 1 ELSE 0 END) as pendientes
          FROM asistencia WHERE fecha = ?`,
          [fecha],
          (err, stats) => {
            if (err) return db.run("ROLLBACK", () => callback(err));
            
            db.run("COMMIT", (err) => {
              if (err) return callback(err);
              callback(null, {
                fecha,
                usuario,
                total: stats.total,
                completos: stats.completos,
                pendientes: stats.pendientes
              });
            });
          }
        );
      }
    );
  });
}

// Registrar asistencia
function registrarAsistencia(empleado, callback) {
  const ahora = new Date();
  const fecha = ahora.toISOString().split('T')[0];
  const hora = ahora.toLocaleTimeString('es-MX', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  // Verificar estado del día primero
  verificarEstadoDia(fecha, (err, dia) => {
    if (err) return callback(err);
    if (dia.cerrado) {
      return callback(null, {
        error: "Día no iniciado o cerrado",
        detail: "Debe iniciar el día para registrar asistencias"
      });
    }

    // Verificar registros existentes
    db.get(
      `SELECT COUNT(*) as conteo, 
              MIN(hora_entrada) as primera_entrada,
              MAX(CASE WHEN hora_salida IS NOT NULL THEN hora_salida END) as ultima_salida
       FROM asistencia 
       WHERE empleado_id = ? AND fecha = ?`,
      [empleado.id, fecha],
      (err, row) => {
        if (err) return callback(err);

        if (row.conteo === 0) {
          // Registrar entrada
          db.run(
            `INSERT INTO asistencia (empleado_id, fecha, hora_entrada) 
             VALUES (?, ?, ?)`,
            [empleado.id, fecha, hora],
            function(err) {
              if (err) return callback(err);
              callback(null, {
                tipo: 'entrada',
                empleado,
                fecha,
                hora,
                mensaje: `Entrada registrada a las ${hora}`
              });
            }
          );
        } 
        else if (row.conteo === 1) {
          // Registrar salida
          db.run(
            `UPDATE asistencia 
             SET hora_salida = ? 
             WHERE empleado_id = ? AND fecha = ? AND hora_salida IS NULL`,
            [hora, empleado.id, fecha],
            function(err) {
              if (err) return callback(err);
              if (this.changes === 0) {
                return callback(null, {
                  error: "Registro completo",
                  detail: "Ya tiene entrada y salida registradas"
                });
              }
              callback(null, {
                tipo: 'salida',
                empleado,
                fecha,
                hora,
                mensaje: `Salida registrada a las ${hora}`
              });
            }
          );
        }
        else {
          callback(null, {
            error: "Límite alcanzado",
            detail: `Ya tiene registros completos: Entrada ${row.primera_entrada}, Salida ${row.ultima_salida}`
          });
        }
      }
    );
  });
}

// Verificar QR y registrar asistencia
function verificarAsistencia(params, callback) {
  if (!params?.qr) {
    return callback(null, { error: "QR inválido", detail: "No se proporcionó código QR" });
  }

  const qrLimpio = limpiarQR(params.qr);
  
  db.get(
    `SELECT id, nombre, apellido, area FROM empleados WHERE qr_asignado = ?`,
    [qrLimpio],
    (err, empleado) => {
      if (err) return callback(err);
      if (!empleado) {
        return callback(null, { 
          error: "Empleado no encontrado", 
          detail: `QR no registrado: ${qrLimpio}` 
        });
      }
      
      registrarAsistencia(empleado, callback);
    }
  );
}

// Obtener historial del día
function obtenerHistorialDia(fecha, callback) {
  db.all(
    `SELECT e.nombre, e.apellido, e.area, 
            a.hora_entrada, a.hora_salida,
            CASE WHEN a.hora_salida IS NULL THEN 'Pendiente' ELSE 'Completo' END as estado
     FROM asistencia a
     JOIN empleados e ON a.empleado_id = e.id
     WHERE a.fecha = ?
     ORDER BY a.hora_entrada DESC`,
    [fecha],
    (err, rows) => {
      if (err) return callback(err);
      callback(null, rows || []);
    }
  );
}

// Obtener días laborales
function obtenerDiasLaborales(limite = 30, callback) {
  db.all(
    `SELECT fecha, usuario_apertura, hora_apertura, 
            usuario_cierre, hora_cierre, cerrado
     FROM dias_laborales
     ORDER BY fecha DESC
     LIMIT ?`,
    [limite],
    (err, rows) => {
      if (err) return callback(err);
      callback(null, rows || []);
    }
  );
}

module.exports = {
  inicializarBaseDeDatos,
  verificarAsistencia,
  iniciarDia,
  cerrarDia,
  validarCredenciales,
  verificarEstadoDia,
  obtenerHistorialDia,
  obtenerDiasLaborales,
  closeDB: () => db.close()
};