const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./asistencia.db');

// Crear tablas e índices
db.serialize(() => {
  db.run("DROP TABLE IF EXISTS asistencia");
  db.run("DROP TABLE IF EXISTS empleados");

  // Tabla empleados con restricciones NOT NULL
  db.run(`
    CREATE TABLE IF NOT EXISTS empleados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      area TEXT NOT NULL,
      qr_asignado TEXT UNIQUE NOT NULL
    )
  `);

  // Tabla asistencia con estructura corregida (empleado_id en lugar de enpkado_id)
  db.run(`
    CREATE TABLE IF NOT EXISTS asistencia (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      hora_entrada TEXT NOT NULL,
      hora_salida TEXT,
      FOREIGN KEY(empleado_id) REFERENCES empleados(id)
      ON DELETE CASCADE
    )
  `);

  // Crear índices para mejorar el rendimiento
  db.run("CREATE INDEX IF NOT EXISTS idx_qr_asignado ON empleados(qr_asignado)");
  db.run("CREATE INDEX IF NOT EXISTS idx_asistencia_empleado ON asistencia(empleado_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia(fecha)");

  // Insertar datos iniciales con manejo mejorado de errores
  db.get("SELECT COUNT(*) as count FROM empleados", (err, row) => {
    if (err) {
      console.error("Error al verificar empleados:", err);
      return;
    }
    
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
      
      let hasError = false;
      
      empleados.forEach(emp => {
        stmt.run(emp.nombre, emp.apellido, emp.area, emp.qr, function(err) {
          if (err) {
            console.error(`Error insertando ${emp.nombre}:`, err);
            hasError = true;
          }
        });
      });
      
      stmt.finalize(err => {
        if (err || hasError) {
          console.error("Error en la transacción:", err || "Error en uno o más inserts");
          db.run("ROLLBACK");
        } else {
          db.run("COMMIT", err => {
            if (err) {
              console.error("Error al hacer commit:", err);
            } else {
              console.log("Datos iniciales insertados correctamente");
            }
          });
        }
      });
    }
  });
});

// Función mejorada para verificar asistencia
function verificarAsistencia(qr, callback) {
  console.log("Iniciando verificación para QR:", qr);
  
  if (!qr || typeof qr !== 'string') {
    console.log("QR inválido recibido:", qr);
    return callback(null, { error: "QR inválido" });
  }

  // 1. Buscar empleado
  db.get(`SELECT id, nombre, apellido, area FROM empleados WHERE qr_asignado = ?`, [qr], (err, empleado) => {
    if (err) {
      console.error("Error en búsqueda de empleado:", err);
      return callback(err);
    }

    if (!empleado) {
      console.log("Empleado no encontrado para QR:", qr);
      return callback(null, { error: "Empleado no encontrado" });
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false 
    });

    console.log(`Verificando asistencia para ${empleado.nombre} (ID: ${empleado.id})`);

    // 2. Verificar último registro
    db.get(`SELECT id, fecha, hora_entrada, hora_salida FROM asistencia 
            WHERE empleado_id = ? 
            ORDER BY id DESC LIMIT 1`, 
    [empleado.id], (err, ultimaAsistencia) => {
      if (err) {
        console.error("Error al verificar último registro:", err);
        return callback(err);
      }

      const esEntrada = !ultimaAsistencia || 
                       ultimaAsistencia.fecha !== fecha || 
                       (ultimaAsistencia.fecha === fecha && ultimaAsistencia.hora_salida);

      const operacion = esEntrada ? "ENTRADA" : "SALIDA";
      console.log(`Registrando ${operacion} para ${empleado.nombre}`);

      // 3. Registrar entrada o salida
      if (esEntrada) {
        registrarEntrada(empleado, fecha, hora, callback);
      } else {
        registrarSalida(empleado, fecha, hora, callback);
      }
    });
  });
}

// Función auxiliar para registrar entrada
function registrarEntrada(empleado, fecha, hora, callback) {
  db.run(
    `INSERT INTO asistencia (empleado_id, fecha, hora_entrada) 
     VALUES (?, ?, ?)`,
    [empleado.id, fecha, hora],
    function(err) {
      if (err) {
        console.error("Error al registrar entrada:", err);
        return callback(err);
      }
      callback(null, {
        tipo: 'entrada',
        empleado: empleado,
        fecha: fecha,
        hora: hora,
        mensaje: `Entrada registrada a las ${hora}`,
        registroId: this.lastID
      });
    }
  );
}

// Función auxiliar para registrar salida
function registrarSalida(empleado, fecha, hora, callback) {
  db.run(
    `UPDATE asistencia 
     SET hora_salida = ? 
     WHERE empleado_id = ? 
     AND fecha = ? 
     AND hora_salida IS NULL`,
    [hora, empleado.id, fecha],
    function(err) {
      if (err) {
        console.error("Error al registrar salida:", err);
        return callback(err);
      }
      
      if (this.changes === 0) {
        console.log("No se encontró registro de entrada para hoy, registrando entrada y salida");
        // Si no hay entrada registrada hoy, registramos ambas
        registrarEntrada(empleado, fecha, "00:00:00", (err, result) => {
          if (err) return callback(err);
          registrarSalida(empleado, fecha, hora, callback);
        });
        return;
      }
      
      callback(null, {
        tipo: 'salida',
        empleado: empleado,
        fecha: fecha,
        hora: hora,
        mensaje: `Salida registrada a las ${hora}`,
        cambios: this.changes
      });
    }
  );
}

// Función para obtener historial con manejo mejorado de errores
function obtenerHistorial(fecha, callback) {
  if (!fecha) {
    const hoy = new Date();
    fecha = hoy.toISOString().split('T')[0];
  }

  db.all(
    `SELECT e.nombre, e.apellido, e.area, 
            a.hora_entrada, a.hora_salida,
            CASE 
              WHEN a.hora_salida IS NULL THEN 'Pendiente'
              ELSE 'Completo'
            END as estado
     FROM asistencia a
     JOIN empleados e ON a.empleado_id = e.id
     WHERE a.fecha = ?
     ORDER BY a.hora_entrada DESC`,
    [fecha],
    (err, rows) => {
      if (err) {
        console.error("Error en obtenerHistorial:", err);
        return callback(err);
      }
      
      callback(null, {
        fecha: fecha,
        registros: rows || [],
        total: rows ? rows.length : 0,
        completos: rows ? rows.filter(r => r.estado === 'Completo').length : 0,
        pendientes: rows ? rows.filter(r => r.estado === 'Pendiente').length : 0
      });
    }
  );
}

// Función para obtener historial por empleado
function obtenerHistorialEmpleado(empleadoId, limite = 30, callback) {
  db.all(
    `SELECT a.fecha, a.hora_entrada, a.hora_salida,
            CASE 
              WHEN a.hora_salida IS NULL THEN 'Pendiente'
              ELSE 'Completo'
            END as estado
     FROM asistencia a
     WHERE a.empleado_id = ?
     ORDER BY a.fecha DESC
     LIMIT ?`,
    [empleadoId, limite],
    (err, rows) => {
      if (err) {
        console.error("Error en obtenerHistorialEmpleado:", err);
        return callback(err);
      }
      
      callback(null, {
        empleadoId: empleadoId,
        registros: rows || [],
        total: rows ? rows.length : 0
      });
    }
  );
}

// Función para obtener empleados
function obtenerEmpleados(callback) {
  db.all(
    `SELECT id, nombre, apellido, area, qr_asignado FROM empleados ORDER BY nombre, apellido`,
    (err, rows) => {
      if (err) {
        console.error("Error en obtenerEmpleados:", err);
        return callback(err);
      }
      
      callback(null, rows || []);
    }
  );
}

// Manejo de cierre de conexión
process.on('exit', () => {
  db.close();
});

// Exportar todas las funciones necesarias
module.exports = { 
  verificarAsistencia,
  obtenerHistorial,
  obtenerHistorialEmpleado: obtenerHistorialEmpleado,
  obtenerEmpleados: obtenerEmpleados,
  closeDB: () => db.close()
};