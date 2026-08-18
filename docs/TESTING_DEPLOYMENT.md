# ✅ TESTING Y DEPLOYMENT

## 🧪 TESTING LOCAL

### **Antes de hacer cualquier test:**

1. Asegúrate que la app está corriendo:
```bash
npm run dev
# Debería estar en http://localhost:3000
```

2. Verifica que tienes datos de prueba en Firestore:
   - Al menos 1 copa creada
   - Al menos 1 partida creada
   - Al menos 2 jugadores registrados

---

## ✅ TEST SUITE 1: CARGA BÁSICA DE PUNTOS

### **Objetivo**: Cargar puntos de una partida y verificar que se calculan correctamente

### **Precondiciones**:
- Copa creada: "Copa Test" (copaId = copa_test_123)
- Partida creada: "Partida 1" (matchId = match_001, en copa_test_123)
- Jugadores:
  - Juan (playerId = player_juan)
  - Carlos (playerId = player_carlos)
  - María (playerId = player_maria)

### **Pasos**:

```
1. Navega a /copas/copa_test_123
   ✓ Deberías ver RankingCopa
   ✓ Deberías ver botón "📊 Sumar Puntos"

2. Click en "📊 Sumar Puntos"
   ✓ Navegas a /copas/copa_test_123/sumarPuntos
   ✓ Ves tabla con "Partida #1"
   ✓ Estado: "⏳ Pendiente"

3. Click en "Cargar Puntos"
   ✓ Se abre CargaPuntosForm
   ✓ Tabla con 3 jugadores:
     - Juan: ¿Participó? ☐ CI: 0 CE: 0 Ganador: ☐
     - Carlos: ¿Participó? ☐ CI: 0 CE: 0 Ganador: ☐
     - María: ¿Participó? ☐ CI: 0 CE: 0 Ganador: ☐

4. Marca participación y colonias:
   - Juan: ☑ Participó, CI: 5, CE: 2, ☑ Ganador
   - Carlos: ☑ Participó, CI: 3, CE: 0, ☑ Ganador
   - María: ☐ No participó

5. Observa "Previsión":
   - Juan: "9 + V" (5×1 + 2×2 = 9 base)
   - Carlos: "3 + V" (3×1 + 0×2 = 3 base)
   - María: "NO PARTICIPA"

6. Click en "✓ Guardar Puntos"
   ✓ Formulario se deshabilita (enviando...)
   ✓ Se espera 2-3 segundos

7. ESPERADO:
   ✓ Vuelve a SumarPuntosPage
   ✓ Partida ahora muestra "✓ Cargada"
   ✓ Botón cambió a "Editar Puntos"

8. Navega a /copas/copa_test_123 (ranking)
   ✓ DEBERÍAS VER:
     1. Juan - 11.5 puntos (9 colonias + 2.5 victoria)
     2. Carlos - 4.5 puntos (3 colonias + 1.5 victoria)
     3. María - 0 puntos (no participó)
   
   CÁLCULO VERIFICACIÓN:
   - Total participantes = 2 (Juan, Carlos)
   - Total ganadores = 2
   - Puntos victoria = 2 ÷ 2 = 1.0
   - Juan: 9 + 1.0 = 10.0  ← ⚠️ ESPERA, debería ser...
   
   CORRECCIÓN:
   - Total participantes = 2
   - Total ganadores = 2
   - Puntos victoria = 2 ÷ 2 = 1.0
   - Juan: 9 colonias + 1.0 victoria = 10.0 puntos
   - Carlos: 3 colonias + 1.0 victoria = 4.0 puntos
```

### **Validar en Firestore**:

**Documento: matches/match_001**
```json
{
  "jugadores": {
    "player_juan": {
      "participó": true,
      "coloniasInternas": 5,
      "coloniasExternas": 2,
      "esGanador": true,
      "puntos": {
        "colonias": 9,
        "victoria": 1.0,
        "total": 10.0
      }
    },
    "player_carlos": { ... },
    "player_maria": {
      "participó": false,
      "puntos": { "total": 0 }
    }
  },
  "resumen": {
    "totalParticipantes": 2,
    "totalGanadores": 2,
    "puntosVictoria": 1.0
  }
}
```

**Documento: copas/copa_test_123**
```json
{
  "partidas": [
    {
      "posicion": 1,
      "matchId": "match_001",
      "estado": "cargada"
    }
  ],
  "ranking": {
    "player_juan": {
      "puntosTotales": 10.0,
      "participacionesPorPosicion": { "1": true },
      "posicion": 1
    },
    "player_carlos": {
      "puntosTotales": 4.0,
      "participacionesPorPosicion": { "1": true },
      "posicion": 2
    },
    "player_maria": {
      "puntosTotales": 0,
      "participacionesPorPosicion": { "1": false },
      "posicion": 3
    }
  }
}
```

---

## ✅ TEST SUITE 2: EDICIÓN DE PUNTOS

### **Objetivo**: Editar puntos y verificar que se recalculan correctamente

### **Precondiciones**:
- TEST SUITE 1 completado con éxito
- Partida 1 en estado "cargada"

### **Pasos**:

```
1. Navega a /copas/copa_test_123/sumarPuntos

2. Ves "Partida #1 - ✓ Cargada" con botón "✏️ Editar Puntos"

3. Click en "✏️ Editar Puntos"
   ✓ CargaPuntosForm abre CON DATOS PREVIOS CARGADOS
   - Juan: CI: 5, CE: 2, Ganador: ☑
   - Carlos: CI: 3, CE: 0, Ganador: ☑
   - María: ☐ No participó

4. Modifica:
   - Juan: CE: 2 → CE: 3
   - Carlos: CI: 3 → CI: 4
   
5. Click "✓ Guardar Puntos"

6. ESPERADO:
   ✓ Vuelve a lista
   ✓ Partida sigue como "✓ Cargada"

7. Navega a ranking
   NUEVOS PUNTOS:
   - Juan: (5×1 + 3×2) + 1.0 = 11 + 1.0 = 12.0
   - Carlos: (4×1 + 0×2) + 1.0 = 4 + 1.0 = 5.0
   - María: 0
```

---

## ✅ TEST SUITE 3: VALIDACIONES

### **Test 3A: Error sin participantes**

```
1. Abre CargaPuntosForm
2. Marca TODOS como "No participó"
3. Click "✓ Guardar Puntos"
4. ESPERADO: Error "Debe haber al menos 1 jugador participante"
```

### **Test 3B: Error sin ganadores**

```
1. Abre CargaPuntosForm
2. Marca todos como participantes pero:
   - Juan: ☐ Ganador
   - Carlos: ☐ Ganador
   - María: ☐ Ganador
3. Click "✓ Guardar Puntos"
4. ESPERADO: Error "Debe haber al menos un ganador"
```

### **Test 3C: Campos deshabilitados si no participa**

```
1. Abre CargaPuntosForm
2. Marca Juan como "No participó"
3. ESPERADO:
   ✓ Input CI deshabilitado (gris)
   ✓ Input CE deshabilitado (gris)
   ✓ Checkbox Ganador deshabilitado
   ✓ Pueden llenar otros jugadores normalmente
4. Marca Juan como "Participó" de nuevo
   ✓ Todos vuelven a habilitarse
```

---

## ✅ TEST SUITE 4: MÁXIMO 10 PARTIDAS

### **Objetivo**: Verificar que copa no permite más de 10 partidas

### **Precondiciones**:
- Copa "Copa Test 10" creada
- 10 partidas ya creadas en esa copa

### **Pasos**:

```
1. Intenta crear partida 11 en la copa
2. Llama a copaService.agregarPartida(copaId, matchId)
3. ESPERADO: Error "Esta copa ya tiene el máximo de 10 partidas"
4. Partida NO se crea
```

---

## ✅ TEST SUITE 5: DATOS EN TIEMPO REAL

### **Objetivo**: Verificar que ranking se actualiza en tiempo real

### **Precondiciones**:
- Copa con partida cargada

### **Pasos**:

```
1. Abre 2 pestañas del navegador:
   - Pestaña A: /copas/copa_test_123 (ranking)
   - Pestaña B: /copas/copa_test_123/sumarPuntos

2. En Pestaña B: Carga puntos de una partida nueva

3. Espera 2-3 segundos

4. En Pestaña A: Presiona F5 (reload)

5. ESPERADO: Ranking actualizado con nuevos puntos
```

---

## 🚀 DEPLOYMENT CHECKLIST

Antes de hacer push a producción:

- [ ] Todos los tests 1-5 pasan ✓
- [ ] Firebase Firestore tiene índices configurados (si aplica)
- [ ] Variables de entorno `.env.local` configuradas
- [ ] `npm run build` ejecuta sin errores
- [ ] `npm run lint` ejecuta sin errores críticos
- [ ] Backups de Firestore realizados
- [ ] Documentación actualizada (ver `GUIA_SUMAR_PUNTOS.md`)
- [ ] Team notificado de cambios
- [ ] Plan de rollback en caso de falla

### **Pasos de Deployment**:

```bash
# 1. Verifica que todo está en orden
npm run lint
npm run build

# 2. Test final en staging (si existe)
# O en producción con tráfico bajo

# 3. Deployment
# Usa tu herramienta (Vercel, Firebase Hosting, etc)

# 4. Post-deployment
# - Verifica que la app carga
# - Prueba flujo básico de sumar puntos
# - Monitorea errores en console
```

---

## 🔍 DEBUGGING

### **Problema: Ranking no se actualiza**

**Pasos de debug:**
```bash
# 1. Abre console (F12)
# 2. Verifica que no hay errores (rojos)
# 3. En Firestore Console:
#    - Ve a colección "copas"
#    - Abre tu copa
#    - Verifica campo "ranking" con nuevos valores
# 4. Si Firestore sí tiene datos:
#    - Reload la página (hard reload con Ctrl+Shift+R)
# 5. Si sigue igual:
#    - Verifica que useCopa() está leyendo correctamente
#    - Agrega console.log() en RankingCopa.jsx para debug
```

### **Problema: "Esta copa ya tiene 10 partidas" pero solo veo 3**

```bash
# 1. En Firestore Console:
#    - Ve a colección "copas"
#    - Abre tu copa
#    - Mira array "partidas"
#    - Cuenta cuántas hay realmente
# 2. Posible causa:
#    - Partidas de prueba sin eliminar
#    - Bug en contador
# 3. Solución temporal:
#    - Edita manualmente el array "partidas"
#    - O crea una nueva copa
```

### **Problema: Puntos calculados mal**

```bash
# 1. Abre DevTools (F12) → Console
# 2. En CargaPuntosForm.jsx, agrega:
#    console.log("puntos state:", puntos);
#    console.log("resultados:", resultados);
# 3. Verifica manualmente que:
#    - Participantes correctos
#    - Ganadores correctos
#    - Cálculo de puntosVictoria = participantes/ganadores
# 4. En Firestore, verifica match documento:
#    - Resumen.totalParticipantes correcto
#    - Resumen.totalGanadores correcto
#    - Resumen.puntosVictoria correcto
```

---

## 📊 MONITOREO POST-DEPLOYMENT

Después de lanzar a producción:

```
Cada hora durante 24 horas:
- ✓ Verifica Firestore: sin errores de escritura
- ✓ Console del navegador: sin errores JavaScript
- ✓ Prueba flujo básico: cargar puntos en una partida
- ✓ Verifica ranking: se actualiza correctamente

Cada día durante 1 semana:
- ✓ Revisa logs (si tienes analytics)
- ✓ Verifica integridad de datos en Firestore
- ✓ Pide feedback a usuarios
```

---

## 🔄 ROLLBACK (si es necesario)

Si algo sale mal:

```bash
# Opción 1: Revert git
git revert <commit-hash>
git push

# Opción 2: Restore Firestore from backup
# (Usa Firebase Console → Backups)

# Opción 3: Manual data fix
# Si solo unos pocos datos están mal,
# puedes editarlos manualmente en Firestore Console
```

---

**Testing & Deployment**: v1.0  
**Última actualización**: 18 de abril de 2026
