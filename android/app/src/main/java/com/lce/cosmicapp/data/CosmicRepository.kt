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
    val estadisticas: Map<String, Long> = emptyMap()
) {
    val jugadas: Long get() = estadisticas["jugadas"] ?: 0
    val victorias: Long get() = estadisticas["victorias"] ?: 0
    val copas: Long get() = estadisticas["copas"] ?: 0
}

/** Un puesto en la tabla de una copa o del ranking global. */
data class Puesto(val nombre: String, val puntos: Double)

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
data class Participante(val playerId: String?, val nombre: String?) {
    /** El nombre propio si lo trae; si no, hay que resolver el id contra players. */
    fun mostrar(nombresPorId: Map<String, String>): String =
        nombre?.takeIf { it.isNotBlank() }
            ?: playerId?.let { nombresPorId[it] }
            ?: "Sin nombre"
}

/** Una partida abierta desde su codigo, para seguirla en la mesa. */
data class PartidaDetalle(
    val id: String,
    val nombre: String,
    val codigo: String,
    val estado: String,
    val participantes: List<Participante>
) {
    val finalizada: Boolean get() = estado == "finalizada"
}

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
            .map { Puesto(it.getString("name") ?: "?", it.getDouble("last10Score") ?: 0.0) }
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
        participantes = when (jugadores) {
            // Mapa nuevo: la clave es el playerId y `nombre` suele venir vacio.
            is Map<*, *> -> jugadores.entries.mapNotNull { (clave, valor) ->
                (clave as? String)?.let {
                    Participante(it, (valor as? Map<*, *>)?.get("nombre") as? String)
                }
            }
            // Lista legacy: jugadores de la liga y visitantes conviviendo.
            is List<*> -> jugadores.mapNotNull { fila ->
                (fila as? Map<*, *>)?.let {
                    Participante(it["playerId"] as? String, it["nombre"] as? String)
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
        tabla = ranking.values
            .map {
                Puesto(
                    nombre = it["nombreJugador"] as? String ?: "?",
                    puntos = (it["puntosTotales"] as? Number)?.toDouble() ?: 0.0
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
        // Firestore devuelve los enteros como Long, pero los datos sembrados desde
        // la web pueden venir como Double; normalizamos para no romper.
        estadisticas = stats.mapValues { (_, valor) -> (valor as? Number)?.toLong() ?: 0L }
    )
}
