# 📥 Carga Manual de Partidas - Guía de Uso

## 🎯 Propósito

Esta funcionalidad permite:
- ✅ Migrar datos de otro sistema de gestión de partidas
- ✅ Cargar partidas antiguas que no están en el sistema
- ✅ Llenar el ranking global manualmente
- ✅ Importar datos en bulk desde CSV

## 📍 Ubicación

**Admin Panel → Pestaña "📥 Cargar Partidas"**

Acceso: `/admin` → Buscar botón "📥 Cargar Partidas"

---

## 🔧 Método 1: Carga Manual (Interfaz)

### Pasos:

1. **Ingresa datos de la partida:**
   - Nombre: "Partida Final - Abril"
   - Fecha: Selecciona la fecha (calendar picker)

2. **Agrega los jugadores:**
   - ID Jugador: ej. `user_001` (debe coincidir con ID en Firestore)
   - Nombre: "Juan García"
   - Puntos: 8.5
   - ¿Ganador?: Sí/No (al menos 1 debe ser "Sí")

3. **Agregar más jugadores:** Click "+ Agregar Jugador"

4. **Validaciones automáticas:**
   - Mínimo 2 jugadores
   - Al menos 1 ganador
   - Puntos válidos (>= 0)

5. **Cargar:** Click "✓ Cargar Partida"

### Resultado:
```
✓ Partida "Partida Final - Abril" cargada exitosamente (ID: manual_1713960000000_a1b2c3d4e)
```

---

## 📊 Método 2: Importar CSV (Bulk)

### Formato CSV:

```csv
partida_nombre,fecha,jugador_id,jugador_nombre,puntos,es_ganador
Partida 1,2026-04-20,user_001,Juan García,8.5,true
Partida 1,2026-04-20,user_002,María López,5.2,false
Partida 2,2026-04-21,user_001,Juan García,7.0,false
Partida 2,2026-04-21,user_003,Carlos Díaz,9.3,true
```

### Columnas Requeridas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| `partida_nombre` | Nombre único de la partida | "Torneo Regional" |
| `fecha` | Fecha en formato ISO (YYYY-MM-DD) | "2026-04-20" |
| `jugador_id` | ID del jugador en Firestore | "user_001" |
| `jugador_nombre` | Nombre del jugador | "Juan García" |
| `puntos` | Puntos obtenidos (número) | "8.5" |
| `es_ganador` | Ganador: true/false/1/0/sí/no | "true" |

### Pasos:

1. **Descargar template:**
   - Click "📥 Descargar Template CSV"
   - Se descarga: `template_partidas.csv`

2. **Editar el template:**
   - Abre en Excel, Google Sheets o editor de texto
   - Llena con tus datos
   - Guarda como `.csv`

3. **Copiar contenido:**
   - Abre el CSV en editor de texto
   - Copia TODO el contenido (incluyendo headers)

4. **Pegar en el área de texto:**
   - Click en la pestaña "📊 Importar CSV"
   - Pega el contenido

5. **Importar:**
   - Click "✓ Importar CSV"

### Resultado:
```
✓ 5 exitosas | ✗ 0 fallidas
```

---

## ⚠️ Notas Importantes

### IDs de Jugador

Los `jugador_id` **deben existir en Firestore** bajo la colección `players`.

**Cómo obtener IDs:**
1. Ve a `/admin` → "👥 Jugadores"
2. Cada jugador tiene un ID (columna "ID")
3. Copia el ID exacto

### Fechas

Formato: `YYYY-MM-DD` (ISO)

```
Correcto:  2026-04-20
Incorrecto: 20/04/2026, 04-20-2026, April 20
```

### Puntos

Pueden ser decimales:
```
Correcto:   8.5, 7, 10.25, 0
Incorrecto: 8.5pts, "ocho", 8,5 (formato europeo)
```

### Ganadores

Debe haber **al menos 1 ganador por partida**.

```
Válido:   true, false, true
Válido:   1, 0, 1
Válido:   sí, no, sí
Inválido: false, false, false (sin ganador)
```

---

## 🔄 Qué Sucede al Cargar

Cuando cargas una partida, el sistema automáticamente:

1. ✅ **Crea documento en `matches`:**
   - ID: `manual_[timestamp]_[hash]`
   - Estado: "finalizada"
   - Campo: `esManual: true` (para auditoría)

2. ✅ **Registra en subcolección `lastMatches`:**
   - `players/{jugador_id}/lastMatches/{matchId}`
   - Almacena: puntos, ganador, fecha

3. ✅ **Actualiza estadísticas del jugador:**
   - `stats.partidas += 1`
   - `stats.victorias += 1` (si ganó)
   - `stats.puntosPromedio = recalculado`

4. ✅ **Actualiza ranking global:**
   - `last10Score = suma últimas 10 partidas`
   - El jugador aparece en `/ranking` automáticamente

---

## 📋 Ejemplo Completo

### Datos a migrar (otro sistema):

```
Partida: Torneo Regional
Fecha: 20 de abril de 2026
Jugadores:
  - Juan García (ID: user_001): 8.5 puntos, GANADOR
  - María López (ID: user_002): 5.2 puntos
  - Carlos Díaz (ID: user_003): 7.0 puntos
```

### Carga Manual (Interfaz):

1. Nombre: "Torneo Regional"
2. Fecha: 2026-04-20
3. Jugadores:
   - `user_001` | Juan García | 8.5 | ✓ Ganador
   - `user_002` | María López | 5.2 | No
   - `user_003` | Carlos Díaz | 7.0 | No
4. Click "✓ Cargar Partida"

### O CSV:

```csv
partida_nombre,fecha,jugador_id,jugador_nombre,puntos,es_ganador
Torneo Regional,2026-04-20,user_001,Juan García,8.5,true
Torneo Regional,2026-04-20,user_002,María López,5.2,false
Torneo Regional,2026-04-20,user_003,Carlos Díaz,7.0,false
```

### Resultado en Ranking:

```
🥇 #1 - Juan García     8.5 pts (1 partida)
#2 - Carlos Díaz        7.0 pts (1 partida)
#3 - María López        5.2 pts (1 partida)
```

---

## 🐛 Troubleshooting

### Error: "Algunos jugadores tienen puntos inválidos"

**Causa:** Puntos negativos o no numéricos

**Solución:** Verifica que todos sean `>= 0` y en formato número

---

### Error: "Debe haber al menos un ganador"

**Causa:** Ningún jugador está marcado como ganador

**Solución:** Marca al menos 1 como "Sí" en la columna "¿Ganador?"

---

### Error: "No se encontraron partidas válidas en el CSV"

**Causa:** Formato incorrecto o sin datos

**Solución:**
- Verifica headers: `partida_nombre,fecha,jugador_id,jugador_nombre,puntos,es_ganador`
- Asegúrate de tener datos en las filas
- No incluyas filas vacías

---

### Partida cargada pero no aparece en Ranking

**Causa:** Jugador no existe en Firestore

**Solución:**
1. Crea al jugador en `/players`
2. Anota su ID
3. Carga la partida nuevamente

---

## 💡 Casos de Uso

### Migrando de otro sistema:

1. Exporta todas las partidas del sistema anterior
2. Formatea a CSV (usar el template)
3. Importa en bulk
4. Verifica en `/ranking`

### Registrando partidas jugadas fuera de la plataforma:

1. Determina puntos de cada jugador
2. Registra manualmente o via CSV
3. Aparece automáticamente en ranking

### Llenando datos históricos:

1. Tienes partidas antiguas sin datos
2. Las cargas manualmente
3. El ranking se actualiza

---

## 📊 Estadísticas de Carga

Después de cargar, puedes ver:

- **Partidas cargadas:** En `/admin` → "🎮 Partidas"
- **Ranking actualizado:** En `/` → "Ranking Global" o `/ranking`
- **Estadísticas jugadores:** En `/admin` → "👥 Jugadores"

---

## ✨ Notas Finales

- ✅ Las partidas cargadas se marcan con `esManual: true` (para auditoría)
- ✅ Puedes cargar múltiples partidas (CSV es recomendado para bulk)
- ✅ El ranking se actualiza automáticamente
- ✅ Las estadísticas de los jugadores se recalculan
- ✅ Compatible con copas/ligas si deseas

---

**¿Necesitas ayuda?** Revisa los errores o contacta al administrador.
