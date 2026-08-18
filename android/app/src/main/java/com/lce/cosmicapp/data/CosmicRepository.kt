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
