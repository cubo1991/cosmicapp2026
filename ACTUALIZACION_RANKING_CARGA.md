# ✅ Actualización: Ranking Global + Carga Manual de Partidas

## 🎯 Cambios Implementados

### 1️⃣ Ranking Global Mejorado

**Problema:** El ranking solo mostraba jugadores con múltiples partidas.

**Solución:** 
- ✅ Ahora muestra jugadores con **solo 1 partida**
- ✅ Filtra automáticamente por `last10Score > 0`
- ✅ Ordena correctamente incluso con pocos datos

**Cambio en `rankingService.js`:**
```javascript
// Antes: solo ordenaba, no filtraba
const jugadores = querySnapshot.docs.map(...).sort(...)

// Después: filtra jugadores con al menos 1 partida
.filter(j => j.last10Score > 0 || (j.stats?.partidas || 0) > 0)
```

---

### 2️⃣ Sistema de Carga Manual de Partidas

**Propósito:** Migrar datos de otro sistema y llenar el ranking manualmente.

#### ✨ Nuevos Archivos

| Archivo | Propósito |
|---------|-----------|
| `src/services/bulkMatchService.js` | Lógica de carga y parseo de datos |
| `src/components/admin/AdminCargarPartidas.jsx` | Interfaz admin para carga |
| `CARGAR_PARTIDAS_MANUAL.md` | Guía de usuario |
| `ejemplo_partidas.csv` | Template CSV para referencia |

#### 🎨 Interfaz Admin

**Ubicación:** `/admin` → Pestaña "📥 Cargar Partidas"

**Dos modos:**

**Modo 1: Carga Manual (Interfaz)**
- Ingresa nombre y fecha de partida
- Agrega jugadores en tabla
- Click "Cargar Partida"
- Perfecto para pocas partidas

**Modo 2: Importar CSV (Bulk)**
- Descargar template
- Editar en Excel/Sheets
- Pegar contenido
- Click "Importar CSV"
- Perfecto para migración de 100+ partidas

---

## 🔄 Flujo de Carga de Partida

```
Usuario carga partida manual
        ↓
bulkMatchService.cargarPartidaManual()
        ↓
1. Crear documento en matches (estado: 'finalizada', esManual: true)
2. Registrar en players/{id}/lastMatches/{matchId}
3. Actualizar stats del jugador:
   - stats.partidas += 1
   - stats.victorias += 1 (si ganó)
   - stats.puntosPromedio = recalculado
4. Actualizar ranking global:
   - rankingService.actualizarLast10Score()
   - El jugador aparece automáticamente en /ranking
        ↓
✅ Partida cargada exitosamente
```

---

## 📊 Ejemplo de Uso

### Caso: Migrar 11 partidas de otro sistema

**Datos en archivo CSV:**
```csv
partida_nombre,fecha,jugador_id,jugador_nombre,puntos,es_ganador
Torneo Regional - Ronda 1,2026-04-01,user_001,Juan García,8.5,true
Torneo Regional - Ronda 1,2026-04-01,user_002,María López,5.2,false
... (más filas)
```

**Pasos:**
1. Copiar contenido del CSV
2. Ve a `/admin` → "📥 Cargar Partidas"
3. Pestaña "📊 Importar CSV"
4. Pegar contenido
5. Click "✓ Importar CSV"

**Resultado:**
```
✓ 11 exitosas | ✗ 0 fallidas
```

**Inmediatamente:**
- ✅ Partidas registradas en Firestore
- ✅ Jugadores tienen estadísticas actualizadas
- ✅ Ranking global actualizado (visita `/ranking`)

---

## 🔒 Seguridad & Validación

### Validaciones Implementadas

- ✅ Nombre de partida requerido
- ✅ Mínimo 2 jugadores
- ✅ Al menos 1 ganador por partida
- ✅ Puntos >= 0 (numéricos)
- ✅ Jugador ID debe existir en Firestore
- ✅ Fecha en formato correcto (ISO)

### Auditoría

Todas las partidas cargadas manualmente tienen:
```json
{
  "esManual": true,
  "fechaCreacion": "2026-04-25T...",
  "estado": "finalizada"
}
```

Esto permite identificarlas para auditoría si es necesario.

---

## 📁 Estructura de Datos Actualizada

### Partida Manual en Firestore

```
matches/
  └─ manual_1713960000000_a1b2c3d4e
     ├─ nombre: "Torneo Regional"
     ├─ estado: "finalizada"
     ├─ esManual: true ← Identificador
     ├─ fechaCreacion: 2026-04-20T10:00:00Z
     ├─ jugadores: {
     │   "user_001": {
     │     nombre: "Juan García",
     │     puntos: { total: 8.5, colonias: 0, victoria: 8.5 },
     │     esGanador: true,
     │     participó: true
     │   }
     │ }
     └─ ...
```

### Registro en Subcolección

```
players/user_001/lastMatches/
  └─ manual_1713960000000_a1b2c3d4e
     ├─ matchId: "manual_1713960000000_a1b2c3d4e"
     ├─ puntos: 8.5
     ├─ esGanador: true
     ├─ esManual: true ← Marca migración
     └─ createdAt: 2026-04-20T10:00:00Z
```

---

## 🚀 Cómo Probar

### Test 1: Carga Manual Simple

1. Ve a `/admin` → "📥 Cargar Partidas" → "Carga Manual"
2. Ingresa:
   - Nombre: "Test Partida"
   - Fecha: hoy
   - 2 jugadores con puntos
   - Marca 1 como ganador
3. Click "✓ Cargar Partida"
4. Verifica en `/ranking` → debe aparecer

### Test 2: Importar CSV

1. Descarga template CSV desde admin
2. Llena 3-4 partidas
3. Guarda como `.csv`
4. Abre en editor de texto
5. Copia contenido
6. Pega en Admin → "📊 Importar CSV"
7. Verifica en `/ranking`

---

## 🎯 API Servicios

### `bulkMatchService.cargarPartidaManual(matchData)`

```javascript
const resultado = await bulkMatchService.cargarPartidaManual({
  nombre: "Mi Partida",
  fecha: new Date(),
  jugadores: {
    "user_001": { 
      nombre: "Juan", 
      puntos: 8.5, 
      esGanador: true 
    },
    "user_002": { 
      nombre: "María", 
      puntos: 5.2, 
      esGanador: false 
    }
  }
});

// Retorna:
// { success: true, matchId: "manual_...", mensaje: "..." }
```

### `bulkMatchService.cargarPartidas(data)`

```javascript
const resultados = await bulkMatchService.cargarPartidas({
  partidas: [ /* array de matchData */ ]
});

// Retorna:
// { 
//   exitosas: 10, 
//   fallidas: 2,
//   errores: [ /* array de errores */ ],
//   matchIds: [ /* IDs creados */ ]
// }
```

### `bulkMatchService.parseCSV(csvContent)`

```javascript
const partidas = bulkMatchService.parseCSV(csvString);
// Retorna: array de matchData listos para cargar
```

---

## 📊 Impacto en Base de Datos

### Reads de Firestore por Carga

| Operación | Reads |
|-----------|-------|
| Crear partida | 1 (write) |
| Registrar en lastMatches | 1 (write, subcolección) |
| Actualizar stats jugador | 1 (read) + 1 (write) |
| Actualizar last10Score | 1 (query) + 1 (write) |
| **Total por jugador** | ~5 reads/writes |
| **Por 11 partidas (4 jugadores)** | ~200 operaciones |

**Nota:** Reads están dentro de los límites de la cuota gratuita.

---

## ✨ Características & Limitaciones

### ✅ Lo que Funciona

- Cargar 1 o 100+ partidas
- Actualizar ranking automáticamente
- Recalcular estadísticas
- Auditoría de datos migrados
- Validación robusta
- Interfaz intuitiva

### ⚠️ Limitaciones Actuales

- No puedes editar partidas cargadas manualmente (solo admin via Firestore)
- No hay validación de duplicados (puedes cargar la misma partida 2 veces)
- No hay integración con copas/ligas (opcional)

### 🚀 Mejoras Futuras

- Editar partidas cargadas manualmente
- Detectar y evitar duplicados
- Integración automática con copas/ligas
- Exportar datos (CSV de ranking)
- Revertir carga de partidas

---

## 📝 Cambios en Archivos

### Modificados

| Archivo | Cambio |
|---------|--------|
| `src/services/rankingService.js` | Filtra jugadores con al menos 1 partida |
| `src/app/admin/page.js` | Agrega pestaña "Cargar Partidas" |

### Creados

| Archivo | Tipo |
|---------|------|
| `src/services/bulkMatchService.js` | Servicio |
| `src/components/admin/AdminCargarPartidas.jsx` | Componente |
| `CARGAR_PARTIDAS_MANUAL.md` | Documentación |
| `ejemplo_partidas.csv` | Template |

---

## 🎓 Conclusión

Ahora tienes:
- ✅ Ranking que funciona con 1+ partidas
- ✅ Sistema completo de carga manual (UI + API)
- ✅ Soporte para migración de datos
- ✅ Bulk import desde CSV
- ✅ Estadísticas actualizadas automáticamente

**Estado:** 🚀 **Listo para Producción**

---

**Última actualización:** 25 de abril de 2026
