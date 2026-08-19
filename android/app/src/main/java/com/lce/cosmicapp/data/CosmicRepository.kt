package com.lce.cosmicapp.data

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.functions.FirebaseFunctions
import com.google.firebase.messaging.FirebaseMessaging
import com.lce.cosmicapp.R
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/**
 * Un jugador de la liga. Los campos son los que escribe la web: ver
 * docs/MODELO_DATOS.md, que es la definicion compartida entre plataformas.
 *
 * `uid` es opcional a proposito: los jugadores historicos (sembrados antes de
 * que existiera el login) no lo tienen, y son justamente los reclamables.
 */
data class Jugador(
    val id: String,
    val nombre: String,
    val uid: String? = null,
    val estadisticas: Map<String, Long> = emptyMap(),
    /** Suma de las ultimas 10 partidas; la mantiene la Cloud Function. */
    val last10Score: Double = 0.0
) {
    val jugadas: Long get() = estadisticas["jugadas"] ?: 0
    val victorias: Long get() = estadisticas["victorias"] ?: 0
    val copas: Long get() = estadisticas["copas"] ?: 0
}

/**
 * Un puesto en la tabla de una copa o del ranking global.
 *
 * Lleva el `playerId` para poder ubicar a alguien en la tabla sin comparar
 * nombres, que en una liga chica funcionaria pero es fragil.
 */
data class Puesto(val playerId: String, val nombre: String, val puntos: Double)

/**
 * Una copa: un ciclo de 10 partidas. El `ranking` viene embebido en el documento
 * como un mapa playerId -> { nombreJugador, puntosTotales, ... }.
 */
data class Copa(
    val id: String,
    val nombre: String,
    val estado: String,
    val partidasJugadas: Int,
    val tabla: List<Puesto>,
    val ganador: String? = null
) {
    val esActiva: Boolean get() = estado == "activa"
}

data class Partida(
    val id: String,
    val nombre: String,
    val estado: String,
    val cantidadJugadores: Int,
    val fecha: java.util.Date? = null
) {
    val finalizada: Boolean get() = estado == "finalizada"
}

/**
 * Un alien del juego. Ojo con los nombres de campo en Firestore: vienen con
 * mayuscula inicial y con tilde (`Descripción`, `Expansión`).
 */
data class Alien(
    val id: String,
    val nombre: String,
    val poder: String,
    val descripcion: String,
    val dificultad: String,
    val expansion: String
)

/**
 * Alguien sentado en una partida. Puede ser un jugador de la liga (con
 * `playerId`) o un visitante suelto, que no tiene ficha en la base y solo
 * aparece con nombre y color.
 */
data class Participante(
    val playerId: String?,
    val nombre: String?,
    val color: String? = null,
    /** Ids de los aliens que le tocaron al armar la partida. */
    val aliens: List<String> = emptyList(),
    /** Solo se sabe una vez cargados los resultados. */
    val gano: Boolean = false,
    val puntos: Double? = null
) {
    /** El nombre propio si lo trae; si no, hay que resolver el id contra players. */
    fun mostrar(nombresPorId: Map<String, String>): String =
        nombre?.takeIf { it.isNotBlank() }
            ?: playerId?.let { nombresPorId[it] }
            ?: "Sin nombre"

    /**
     * Clave con la que viaja al backend. Tiene que coincidir con la que arma la
     * web (CargaPuntosForm): el playerId si es de la liga, y si es visitante el
     * color o el nombre. La Cloud Function usa esta clave como id en el ranking
     * de la copa, asi que si no coincide se duplican entradas.
     */
    fun claveDeCarga(): String =
        playerId ?: color?.takeIf { it.isNotBlank() } ?: nombre.orEmpty()
}

/** Una partida abierta desde su codigo, para seguirla en la mesa. */
data class PartidaDetalle(
    val id: String,
    val nombre: String,
    val codigo: String,
    val estado: String,
    val participantes: List<Participante>,
    /** playerId -> alienId que esa persona eligio jugar. */
    val alienesElegidos: Map<String, String> = emptyMap(),
    val fecha: java.util.Date? = null
) {
    val finalizada: Boolean get() = estado == "finalizada"
    val cantidadJugadores: Int get() = participantes.size

    fun misAliens(playerId: String): List<String> =
        participantes.firstOrNull { it.playerId == playerId }?.aliens.orEmpty()

    fun miAlienElegido(playerId: String): String? = alienesElegidos[playerId]
}

/** Tema de FCM al que se suscriben todos los telefonos de la liga. */
const val TEMA_LIGA = "liga"

object CosmicRepository {

    private val auth: FirebaseAuth get() = FirebaseAuth.getInstance()
    private val db: FirebaseFirestore get() = FirebaseFirestore.getInstance()

    val usuarioActual: FirebaseUser? get() = auth.currentUser

    fun cerrarSesion() = auth.signOut()

    /**
     * Login con Google via Credential Manager (la API vigente; GoogleSignIn quedo
     * deprecada). El serverClientId sale de default_web_client_id, el recurso que
     * genera el plugin google-services a partir de google-services.json.
     *
     * `context` tiene que ser el de la Activity: Credential Manager abre su
     * propia hoja de seleccion de cuenta.
     */
    suspend fun entrarConGoogle(context: Context): FirebaseUser {
        val opcionGoogle = GetGoogleIdOption.Builder()
            // false = ofrece todas las cuentas del dispositivo, no solo las que
            // ya usaron esta app. Es lo que corresponde en el primer login.
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(context.getString(R.string.default_web_client_id))
            .build()

        val pedido = GetCredentialRequest.Builder()
            .addCredentialOption(opcionGoogle)
            .build()

        val respuesta = CredentialManager.create(context).getCredential(context, pedido)
        val tokenGoogle = GoogleIdTokenCredential.createFrom(respuesta.credential.data)
        val credencial = GoogleAuthProvider.getCredential(tokenGoogle.idToken, null)

        return auth.signInWithCredential(credencial).await().user
            ?: error("Firebase acepto la credencial pero no devolvio usuario")
    }

    /** El jugador ya vinculado a esta cuenta, o null si todavia no reclamo ninguno. */
    suspend fun jugadorDeLaCuenta(uid: String): Jugador? =
        db.collection("players").whereEqualTo("uid", uid).get().await()
            .documents.firstOrNull()?.aJugador()

    /**
     * Jugadores que todavia nadie reclamo.
     *
     * ponytail: trae todos y filtra en memoria porque Firestore no sabe consultar
     * por campo ausente, y los jugadores historicos no tienen `uid` escrito. Con
     * una liga de decenas de jugadores no se nota; si fueran miles, habria que
     * escribir `uid: null` al crear y consultar por ese valor.
     */
    suspend fun jugadoresSinVincular(): List<Jugador> =
        db.collection("players").get().await()
            .documents.map { it.aJugador() }
            .filter { it.uid == null }
            .sortedBy { it.nombre.lowercase() }

    /**
     * Reclama un jugador historico para esta cuenta.
     *
     * No fusiona documentos: solo escribe `uid`, asi que las partidas, copas y
     * estadisticas del jugador quedan intactas. Las reglas de Firestore rechazan
     * el reclamo si el jugador ya tiene dueño o si se intenta tocar otro campo.
     */
    suspend fun vincular(jugadorId: String, uid: String) {
        db.collection("players").document(jugadorId).update("uid", uid).await()
    }

    /**
     * La copa en curso. Puede no haber ninguna si todavia no se jugo nada.
     *
     * ponytail: lectura puntual, no listener. Si en la mesa se quiere ver el
     * ranking moverse en vivo, cambiar por addSnapshotListener.
     */
    suspend fun copaActiva(): Copa? =
        db.collection("copas").whereEqualTo("estado", "activa").get().await()
            .documents.firstOrNull()?.aCopa()

    /** Copas ya cerradas, de la mas reciente a la mas vieja. */
    suspend fun copasCerradas(): List<Copa> =
        db.collection("copas").whereEqualTo("estado", "finalizada").get().await()
            .documents.map { it.aCopa() }
            .sortedByDescending { it.nombre }

    /**
     * Ranking global: suma de las ultimas 10 partidas de cada jugador. El valor
     * lo mantiene la web en el campo last10Score al finalizar cada partida.
     */
    suspend fun rankingGlobal(): List<Puesto> =
        db.collection("players").get().await()
            .documents
            .map { Puesto(it.id, it.getString("name") ?: "?", it.getDouble("last10Score") ?: 0.0) }
            .filter { it.puntos > 0 }
            .sortedByDescending { it.puntos }

    /** Ultimas partidas, para el historial. */
    suspend fun partidasRecientes(cuantas: Long = 25): List<Partida> =
        db.collection("matches")
            .orderBy("fechaCreacion", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .limit(cuantas).get().await()
            .documents.map { it.aPartida() }

    /** Catalogo de aliens. Es de solo lectura: las reglas solo dejan escribir a admin. */
    suspend fun aliens(): List<Alien> =
        db.collection("alienList").get().await()
            .documents.map {
                Alien(
                    id = it.id,
                    nombre = it.getString("Nombre") ?: "?",
                    poder = it.getString("Poder") ?: "",
                    descripcion = it.getString("Descripción") ?: "",
                    dificultad = it.getString("Dificultad") ?: "",
                    expansion = it.getString("Expansión") ?: ""
                )
            }
            .sortedBy { it.nombre.lowercase() }

    /** Nombre de cada jugador por su id, para resolver los ids que guarda la partida. */
    suspend fun nombresDeJugadores(): Map<String, String> =
        db.collection("players").get().await()
            .documents.associate { it.id to (it.getString("name") ?: "?") }

    /**
     * Busca una partida por su codigo corto compartible. El codigo se guarda en
     * mayusculas, asi que normalizamos lo que escriba la persona.
     */
    suspend fun buscarPartidaPorCodigo(codigo: String): PartidaDetalle? =
        db.collection("matches")
            .whereEqualTo("codigo", codigo.trim().uppercase())
            .limit(1).get().await()
            .documents.firstOrNull()?.aDetalle()

    /**
     * Sigue una partida en vivo: mientras la sala este abierta, cualquier cambio
     * que haga la web (jugadores, estado) llega solo. Es lo que justifica tener
     * la app en la mesa.
     */
    fun observarPartida(partidaId: String): Flow<PartidaDetalle?> = callbackFlow {
        val registro = db.collection("matches").document(partidaId)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                } else {
                    trySend(snapshot?.takeIf { it.exists() }?.aDetalle())
                }
            }
        awaitClose { registro.remove() }
    }

    /**
     * ¿Esta cuenta es admin? Se resuelve con la existencia de su doc en `admins`,
     * que solo se crea a mano desde la consola de Firebase. Las reglas dejan leer
     * unicamente el propio, asi que esto nunca sirve para espiar a otros.
     */
    suspend fun esAdmin(): Boolean {
        val uid = usuarioActual?.uid ?: return false
        return runCatching { db.collection("admins").document(uid).get().await().exists() }
            .getOrDefault(false)
    }

    /**
     * Carga los resultados de una partida.
     *
     * No calcula nada: manda los datos crudos a la Cloud Function `finalizarPartida`,
     * que es la misma que usa la web. Ahi viven la formula, el ranking de la copa,
     * el cierre al llegar a la partida 10 y las estadisticas historicas. Replicar
     * eso en Kotlin seria una segunda fuente de verdad sobre los mismos datos.
     *
     * `resultados` va con la misma forma que arma la web:
     *   { clave: { nombre, playerId, CI, CE, ganador, participó } }
     *
     * Devuelve el nombre del ganador si esta carga cerro la copa, o null.
     */
    suspend fun finalizarPartida(
        partidaId: String,
        resultados: Map<String, Map<String, Any?>>
    ): String? {
        val respuesta = FirebaseFunctions.getInstance("us-central1")
            .getHttpsCallable("finalizarPartida")
            .call(mapOf("matchId" to partidaId, "resultados" to resultados))
            .await()

        // getData() explicito: el campo `data` es privado, no hay property syntax.
        val datos = respuesta.getData() as? Map<*, *>
        val copaCerrada = datos?.get("copaCerrada") as? Map<*, *>
        return copaCerrada?.get("nombre") as? String
    }

    /**
     * Crea una partida con jugadores de la liga.
     *
     * Igual que finalizar: no arma nada por su cuenta. La Cloud Function
     * `crearPartida` genera el codigo, agrupa la sesion y reserva la posicion
     * en la copa activa, que puede implicar cerrar la copa anterior y abrir la
     * siguiente. Devuelve el id y el codigo compartible.
     */
    suspend fun crearPartida(
        nombre: String,
        jugadores: List<Jugador>,
        asociarACopa: Boolean
    ): Pair<String, String> {
        val payload = jugadores.map {
            mapOf(
                "nombre" to it.nombre,
                "playerId" to it.id,
                "color" to null,
                "aliens" to emptyList<String>()
            )
        }
        val respuesta = FirebaseFunctions.getInstance("us-central1")
            .getHttpsCallable("crearPartida")
            .call(
                mapOf(
                    "nombre" to nombre,
                    "jugadores" to payload,
                    "asociarACopa" to asociarACopa
                )
            )
            .await()

        val datos = respuesta.getData() as? Map<*, *>
        val id = datos?.get("matchId") as? String ?: error("La función no devolvió la partida")
        return id to (datos["codigo"] as? String).orEmpty()
    }

    /** Todos los jugadores de la liga, para elegir quiénes juegan. */
    suspend fun todosLosJugadores(): List<Jugador> =
        db.collection("players").get().await()
            .documents.map { it.aJugador() }
            .sortedBy { it.nombre.lowercase() }

    /**
     * Suscribe el telefono a los avisos de la liga.
     *
     * ponytail: un tema de FCM en vez de guardar el token de cada dispositivo en
     * Firestore. Sin tokens no hay que registrarlos, refrescarlos ni limpiar los
     * que quedan muertos. La contra es que los avisos son iguales para todos: no
     * se puede decir "sumaste 9 puntos", solo "se cargaron los resultados".
     */
    fun escucharAvisosDeLaLiga() {
        FirebaseMessaging.getInstance().subscribeToTopic(TEMA_LIGA)
    }

    /**
     * Todo lo que cambia solo, escuchado en vivo.
     *
     * Firestore mantiene un canal abierto (websockets por debajo) y reenvia el
     * documento cada vez que cambia, venga el cambio de la web, de otro telefono
     * o de la Cloud Function. Es lo que hace que en la mesa el ranking se mueva
     * mientras se cargan los puntos, sin que nadie recargue nada.
     *
     * El catalogo de aliens NO se escucha: son 237 documentos que no cambian.
     */
    fun observarCopas(): Flow<List<Copa>> = callbackFlow {
        val reg = db.collection("copas").addSnapshotListener { snap, error ->
            if (error != null) close(error)
            else trySend(snap?.documents?.map { it.aCopa() }.orEmpty())
        }
        awaitClose { reg.remove() }
    }

    fun observarJugadores(): Flow<List<Jugador>> = callbackFlow {
        val reg = db.collection("players").addSnapshotListener { snap, error ->
            if (error != null) close(error)
            else trySend(
                snap?.documents?.map { it.aJugador() }
                    ?.sortedBy { it.nombre.lowercase() }.orEmpty()
            )
        }
        awaitClose { reg.remove() }
    }

    fun observarPartidas(cuantas: Long = 25): Flow<List<PartidaDetalle>> = callbackFlow {
        val reg = db.collection("matches")
            .orderBy("fechaCreacion", com.google.firebase.firestore.Query.Direction.DESCENDING)
            .limit(cuantas)
            .addSnapshotListener { snap, error ->
                if (error != null) close(error)
                else trySend(snap?.documents?.map { it.aDetalle() }.orEmpty())
            }
        awaitClose { reg.remove() }
    }

    /**
     * La partida en curso en la que juega esta persona, si hay alguna.
     *
     * Es lo que alimenta el apartado de aliens del perfil: cada uno abre la app
     * y ve los suyos, sin necesidad de mandarle nada al telefono.
     */
    suspend fun miPartidaActiva(playerId: String): PartidaDetalle? =
        db.collection("matches").whereEqualTo("estado", "activa").get().await()
            .documents.map { it.aDetalle() }
            .firstOrNull { detalle -> detalle.participantes.any { it.playerId == playerId } }

    /**
     * Deja registrado cual de los dos aliens eligio jugar.
     *
     * Se guarda en `alienesConfirmados` de la partida, el mismo campo que usa la
     * web; al finalizar, la Cloud Function lo copia a `alienJugado` en el
     * historial del jugador, que es lo que despues permite sacar estadisticas
     * por alien. Las reglas permiten esta escritura porque no define resultados.
     */
    suspend fun elegirAlien(partidaId: String, playerId: String, alienId: String) {
        db.collection("matches").document(partidaId)
            .update("alienesConfirmados.$playerId", alienId).await()
    }

    /** Alta de alguien que no estaba en la liga. */
    suspend fun crearJugador(nombre: String, email: String, uid: String): Jugador {
        val nuevo = mapOf(
            "name" to nombre,
            "email" to email,
            "uid" to uid,
            "avatar" to "",
            "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
            "stats" to mapOf(
                "partidas" to 0, "victorias" to 0, "puntosPromedio" to 0, "ultimaPartida" to null
            ),
            "copas" to emptyList<String>(),
            "ligas" to emptyList<String>()
        )
        val ref = db.collection("players").add(nuevo).await()
        return Jugador(id = ref.id, nombre = nombre, uid = uid)
    }
}

private fun com.google.firebase.firestore.DocumentSnapshot.aDetalle(): PartidaDetalle {
    // Mismo landmine que en aPartida(): `jugadores` viene como mapa o como lista.
    // Ojo: en el formato legacy los visitantes tienen playerId = null y solo
    // traen `nombre`, asi que filtrar por playerId deja la sala vacia.
    val jugadores = get("jugadores")
    return PartidaDetalle(
        id = id,
        nombre = getString("nombre") ?: "Partida",
        codigo = getString("codigo") ?: "",
        estado = getString("estado") ?: "?",
        fecha = getTimestamp("fechaCreacion")?.toDate(),
        alienesElegidos = (get("alienesConfirmados") as? Map<*, *>)
            ?.entries
            ?.mapNotNull { (k, v) ->
                val id = k as? String; val alien = v as? String
                if (id != null && alien != null) id to alien else null
            }
            ?.toMap()
            .orEmpty(),
        participantes = when (jugadores) {
            // Mapa nuevo: la clave es el playerId y `nombre` suele venir vacio.
            is Map<*, *> -> jugadores.entries.mapNotNull { (clave, valor) ->
                (clave as? String)?.let {
                    val datos = valor as? Map<*, *>
                    Participante(
                        it,
                        datos?.get("nombre") as? String,
                        datos?.get("color") as? String,
                        (datos?.get("aliens") as? List<*>)?.mapNotNull { a -> a as? String }.orEmpty(),
                        gano = datos?.get("esGanador") as? Boolean ?: false,
                        // `puntos` es un objeto una vez finalizada la partida.
                        puntos = ((datos?.get("puntos") as? Map<*, *>)?.get("total") as? Number)
                            ?.toDouble()
                    )
                }
            }
            // Lista legacy: jugadores de la liga y visitantes conviviendo.
            is List<*> -> jugadores.mapNotNull { fila ->
                (fila as? Map<*, *>)?.let {
                    Participante(
                        it["playerId"] as? String,
                        it["nombre"] as? String,
                        it["color"] as? String,
                        (it["aliens"] as? List<*>)?.mapNotNull { a -> a as? String }.orEmpty()
                    )
                }
            }
            else -> emptyList()
        }
    )
}

private fun com.google.firebase.firestore.DocumentSnapshot.aCopa(): Copa {
    @Suppress("UNCHECKED_CAST")
    val ranking = get("ranking") as? Map<String, Map<String, Any?>> ?: emptyMap()
    return Copa(
        id = id,
        nombre = getString("nombre") ?: "Copa",
        estado = getString("estado") ?: "?",
        // El campo `partidas` es la lista de partidas asociadas; su largo es
        // cuantas van de las 10 del ciclo.
        partidasJugadas = (get("partidas") as? List<*>)?.size ?: 0,
        tabla = ranking.entries
            .map { (playerId, datos) ->
                Puesto(
                    playerId = playerId,
                    nombre = datos["nombreJugador"] as? String ?: "?",
                    puntos = (datos["puntosTotales"] as? Number)?.toDouble() ?: 0.0
                )
            }
            .sortedByDescending { it.puntos },
        ganador = getString("ganador")
    )
}

private fun com.google.firebase.firestore.DocumentSnapshot.aPartida(): Partida {
    // Ojo: `jugadores` convive en dos formatos, mapa nuevo y lista legacy.
    // Ver docs/MODELO_DATOS.md; hasta que se normalice hay que aceptar los dos.
    val jugadores = get("jugadores")
    return Partida(
        id = id,
        nombre = getString("nombre") ?: getString("codigo") ?: "Partida",
        estado = getString("estado") ?: "?",
        cantidadJugadores = when (jugadores) {
            is List<*> -> jugadores.size
            is Map<*, *> -> jugadores.size
            else -> 0
        },
        fecha = getTimestamp("fechaCreacion")?.toDate()
    )
}

private fun com.google.firebase.firestore.DocumentSnapshot.aJugador(): Jugador {
    @Suppress("UNCHECKED_CAST")
    val stats = get("estadisticas") as? Map<String, Any?> ?: emptyMap()
    return Jugador(
        id = id,
        nombre = getString("name") ?: "(sin nombre)",
        uid = getString("uid"),
        last10Score = getDouble("last10Score") ?: 0.0,
        // Firestore devuelve los enteros como Long, pero los datos sembrados desde
        // la web pueden venir como Double; normalizamos para no romper.
        estadisticas = stats.mapValues { (_, valor) -> (valor as? Number)?.toLong() ?: 0L }
    )
}
