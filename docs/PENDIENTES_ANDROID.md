# Pendientes — App Android (en veremos)

Nada acá es urgente. Son los cabos sueltos del [plan](PLAN_APP_ANDROID.md) que quedaron
abiertos después de la Etapa 4, sin fecha ni compromiso. Se retoman cuando haya ganas
o necesidad concreta.

## Validar la Etapa 3 jugando

El código de escritura crítica (`finalizarPartida`, `crearPartida`, reglas blindadas)
está terminado, pero el criterio de salida real de la Etapa 3 nunca se probó: que una
copa entera (10 partidas) se juegue de punta a punta sin abrir la web, y que los datos
queden idénticos a como los hubiera dejado la web. No es trabajo de código — es usar la
app en la próxima juntada de la liga y prestar atención a si algo se corrompe o queda raro.

## Favoritos de aliens (E3)

Épica E, historia E3 del plan: marcar aliens favoritos, solo local (no toca Firestore).
Era "could have" desde el plan original, sigue sin implementarse.

## Publicación en Play Store

- Hay `signingConfigs.release` en `android/app/build.gradle.kts`, pero no hay cuenta de
  Google Play Console creada (USD 25 único pago + verificación de identidad).
- Falta ficha de tienda: descripción, capturas, ícono, política de privacidad.
- Mientras tanto la distribución sigue siendo Firebase App Distribution al grupo de la liga,
  que funciona bien para el tamaño actual (un grupo cerrado de conocidos).

## Selector de liga y notificaciones por liga (multi-liga)

Agregado el 30/08/2026, ver [`PLAN_MULTI_LIGA.md`](PLAN_MULTI_LIGA.md). El backend (Cloud Functions,
Firestore) y la web ya soportan que exista más de una liga; Android hereda automáticamente el
`ligaId` opcional en `crearPartida`/`finalizarPartida` (si no lo manda, cae en `liga1`), pero le
falta su propia UI:

- Pantalla o selector para elegir "en qué liga estoy jugando" (equivalente al que se agregó en la
  web, en el `NavBar`). Mientras solo exista `liga1` no hace falta mostrar nada.
- Decidir si conviene suscribirse al tópico FCM `liga_<id>` de la liga elegida, en vez de (o además
  de) `"liga"`, el tópico único al que suscribe hoy toda instalación. Los avisos del backend ya
  mandan a ambos tópicos como puente, así que no hay apuro ni riesgo de dejar de recibir avisos por
  no actualizar esto.

## Decisión de iOS (Etapa 5 condicional)

El plan original preveía decidir esto al cerrar la Etapa 3 con datos de uso reales. Sigue
sin resolverse. Si en algún momento se confirma que hace falta iOS, la pregunta técnica es
KMP vs. Swift nativo puro, y depende de cuánta lógica de dominio quedó en el cliente después
de la migración a Cloud Functions (spoiler: quedó poca, así que nativo puro es plausible,
pero conviene revisar el código real antes de asumirlo).
