"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import codigoColores from "../utils/colors";
import Jugador from "../models/jugador";
import { createMatch } from "@/services/matchService";
import asignadorAliens from "../utils/asignadorAliens";
import { generarNombrePartida } from "@/utils/generadorNombres";
import { useStore } from "@/store/useStore";
import { usePlayers } from "@/hooks/usePlayer";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ShareMatchCode } from "../components/ShareMatchCode";

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

const COLORES_ARRAY = Object.entries(codigoColores).map(([name, code]) => ({ name, code }));
const COLOR_HISTORY_KEY  = "cosmicapp_colorHistory";
const LAST_FORMATION_KEY = "cosmicapp_lastFormation";
const SAVED_GROUPS_KEY   = "cosmicapp_savedGroups";

function ls(key)        { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

let _nextId = 3;

function newSlot() { return { id: _nextId++, colorName: null, colorCode: null, playerId: null }; }

function NewMatch() {
  const [slots, setSlots]                   = useState([
    { id: 1, colorName: null, colorCode: null, playerId: null },
    { id: 2, colorName: null, colorCode: null, playerId: null },
  ]);
  const [asociarACopa, setAsociarACopa]     = useState(true);
  const [partidaCreada, setPartidaCreada]   = useState(false);
  const [isCreating, setIsCreating]         = useState(false);
  const [error, setError]                   = useState(null);
  const [pickerOpen, setPickerOpen]         = useState(null); // slotId
  const [savedGroups, setSavedGroups]       = useState([]);
  const [showSaveModal, setShowSaveModal]   = useState(false);
  const [groupName, setGroupName]           = useState("");
  const [lastFormation, setLastFormation]   = useState(null);

  const codigoPartida    = useStore(s => s.codigoPartida);
  const codigoCorto      = useStore(s => s.codigoCorto);
  const resetAliens      = useStore(s => s.setAliensPartida);
  const { players, loading: loadingPlayers } = usePlayers();

  useEffect(() => {
    resetAliens([]);
    setSavedGroups(ls(SAVED_GROUPS_KEY) || []);
    setLastFormation(ls(LAST_FORMATION_KEY));
  }, [resetAliens]);

  // ── helpers ───────────────────────────────────────────────────────
  const takenColors  = slots.map(s => s.colorName).filter(Boolean);
  const takenPlayers = slots.map(s => s.playerId).filter(Boolean);
  const todosConColor   = slots.every(s => s.colorName);
  const todosConJugador = slots.every(s => s.playerId);

  useEffect(() => {
    setAsociarACopa(todosConJugador);
  }, [todosConJugador]);

  const handleSelectColor = useCallback((slotId, name, code) => {
    const history = ls(COLOR_HISTORY_KEY) || {};
    const suggested = history[name];
    const playerId = suggested && !slots.some(s => s.id !== slotId && s.playerId === suggested)
      ? suggested : null;
    setSlots(prev => prev.map(s =>
      s.id === slotId ? { ...s, colorName: name, colorCode: code, playerId } : s
    ));
    setPickerOpen(null);
    setError(null);
  }, [slots]);

  const handleSelectPlayer = useCallback((slotId, playerId) => {
    if (playerId) {
      const taken = slots.some(s => s.id !== slotId && s.playerId === playerId);
      if (taken) {
        const pName = players.find(p => p.id === playerId)?.name || "Ese jugador";
        setError(`${pName} ya está asignado a otro color`);
        return;
      }
    }
    setError(null);
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, playerId: playerId || null } : s));
  }, [slots, players]);

  const addSlot    = () => { if (slots.length < 10) setSlots(p => [...p, newSlot()]); };
  const removeSlot = (id) => { if (slots.length > 2) setSlots(p => p.filter(s => s.id !== id)); };

  const loadFormation = (formation) => {
    _nextId = formation.length + 1;
    setSlots(formation.map((item, idx) => ({
      id: idx + 1,
      colorName: item.colorName,
      colorCode: item.colorCode,
      playerId:  item.playerId,
    })));
    setPickerOpen(null);
    setError(null);
  };

  const saveGroup = () => {
    if (!groupName.trim()) return;
    const valid = slots.filter(s => s.colorName);
    if (valid.length < 2) return;
    const grupo = {
      id: Date.now(),
      name: groupName.trim(),
      players: valid.map(s => ({ colorName: s.colorName, colorCode: s.colorCode, playerId: s.playerId })),
    };
    const updated = [...savedGroups, grupo];
    setSavedGroups(updated);
    lsSet(SAVED_GROUPS_KEY, updated);
    setShowSaveModal(false);
    setGroupName("");
  };

  const deleteGroup = (id) => {
    const updated = savedGroups.filter(g => g.id !== id);
    setSavedGroups(updated);
    lsSet(SAVED_GROUPS_KEY, updated);
  };

  // ── submit ────────────────────────────────────────────────────────
  const crearPartida = async (e) => {
    e.preventDefault();
    setError(null);
    const validos = slots.filter(s => s.colorName);
    if (validos.length < 2) { setError("Selecciona al menos 2 colores"); return; }
    if (asociarACopa && !todosConJugador) {
      setError("Para sumar a copa, todos deben tener jugador asignado");
      return;
    }
    try {
      setIsCreating(true);
      // Persist formation & history
      lsSet(LAST_FORMATION_KEY, validos.map(s => ({
        colorName: s.colorName, colorCode: s.colorCode, playerId: s.playerId,
      })));
      const history = ls(COLOR_HISTORY_KEY) || {};
      validos.forEach(s => { if (s.colorName && s.playerId) history[s.colorName] = s.playerId; });
      lsSet(COLOR_HISTORY_KEY, history);

      const jugadoresData = validos.map(slot => {
        const nombre = slot.playerId
          ? players.find(p => p.id === slot.playerId)?.name || "Desconocido"
          : `Visitante ${slot.colorName}`;
        return new Jugador(nombre, slot.colorCode, slot.playerId);
      });

      const ok = await asignadorAliens(jugadoresData);
      if (!ok) { setError("Error al asignar aliens."); return; }

      const jugadoresSerializados = jugadoresData.map(j => ({
        nombre: j.nombre, color: j.color, playerId: j.playerId || null, aliens: j.aliens || [],
      }));

      const nombre = await generarNombrePartida();
      await createMatch({ nombre, jugadores: jugadoresSerializados, asociarACopa });
      setPartidaCreada(true);
    } catch (err) {
      console.error(err);
      setError("Error al crear la partida. Por favor intenta de nuevo.");
    } finally {
      setIsCreating(false);
    }
  };

  // ── render guards ─────────────────────────────────────────────────
  if (isCreating) return <LoadingOverlay message="Creando partida y asignando aliens..." />;
  if (partidaCreada) return (
    <div className="min-h-screen py-12 px-4" style={{ position: "relative", zIndex: 1 }}>
      <div className="max-w-lg mx-auto"><ShareMatchCode code={codigoPartida} codigoCorto={codigoCorto} /></div>
    </div>
  );

  const hasLast = lastFormation && lastFormation.length >= 2;

  return (
    <div className="min-h-screen py-12 px-4" style={{ position: "relative", zIndex: 1 }}>
      <div className="max-w-xl mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-8">
          <p className="cosmic-label mb-2">NUEVA PARTIDA</p>
          <h1 style={{ fontFamily: FD, fontSize: "clamp(40px, 8vw, 64px)", color: "#f0e8d6", letterSpacing: "0.06em", lineHeight: 1 }}>
            CONFIGURAR PARTIDA
          </h1>
        </div>

        {/* ── Quick access ── */}
        {(hasLast || savedGroups.length > 0) && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontFamily: FM, fontSize: "10px", letterSpacing: "0.2em", color: "#4a3a5a", marginBottom: "10px" }}>
              ACCESO RÁPIDO
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {hasLast && (
                <button type="button" onClick={() => loadFormation(lastFormation)}
                  style={{ fontFamily: FB, fontSize: "13px", padding: "7px 14px",
                    background: "rgba(38,198,195,0.07)", border: "1px solid rgba(38,198,195,0.25)",
                    color: "#26c6c3", borderRadius: "6px", cursor: "pointer" }}>
                  ⚡ Última formación ({lastFormation.length}j)
                </button>
              )}
              {savedGroups.map(g => (
                <div key={g.id} style={{ display: "flex" }}>
                  <button type="button" onClick={() => loadFormation(g.players)}
                    style={{ fontFamily: FB, fontSize: "13px", padding: "7px 14px",
                      background: "rgba(200,153,42,0.07)", border: "1px solid rgba(200,153,42,0.25)",
                      color: "#c8992a", borderRadius: "6px 0 0 6px", cursor: "pointer" }}>
                    ★ {g.name}
                  </button>
                  <button type="button" onClick={() => deleteGroup(g.id)}
                    style={{ padding: "7px 9px",
                      background: "rgba(200,153,42,0.07)", border: "1px solid rgba(200,153,42,0.25)",
                      borderLeft: "none", color: "#4a3a5a",
                      borderRadius: "0 6px 6px 0", cursor: "pointer", fontSize: "14px" }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Main form ── */}
        <form onSubmit={crearPartida}>
          <div className="game-panel" style={{ padding: "28px", marginBottom: "14px" }}>

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(230,57,70,0.12)", border: "1px solid rgba(230,57,70,0.35)",
                borderRadius: "6px", padding: "10px 14px", marginBottom: "18px",
                color: "#e63946", fontFamily: FB, fontSize: "13px" }}>
                ⚠️ {error}
              </div>
            )}

            {/* Slots */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {slots.map((slot, idx) => (
                <PlayerSlot
                  key={slot.id}
                  slot={slot}
                  idx={idx}
                  players={players}
                  loadingPlayers={loadingPlayers}
                  takenColors={takenColors.filter(c => c !== slot.colorName)}
                  takenPlayers={takenPlayers.filter(p => p !== slot.playerId)}
                  pickerOpen={pickerOpen === slot.id}
                  onOpenPicker={() => setPickerOpen(pickerOpen === slot.id ? null : slot.id)}
                  onClosePicker={() => setPickerOpen(null)}
                  onSelectColor={(n, c) => handleSelectColor(slot.id, n, c)}
                  onSelectPlayer={(pid) => handleSelectPlayer(slot.id, pid)}
                  onRemove={slots.length > 2 ? () => removeSlot(slot.id) : null}
                />
              ))}
            </div>

            {/* Add slot */}
            {slots.length < 10 && (
              <button type="button" onClick={addSlot}
                className="w-full"
                style={{ padding: "10px", background: "rgba(255,255,255,0.02)",
                  border: "1px dashed rgba(255,255,255,0.12)", borderRadius: "8px",
                  color: "#4a3a5a", fontFamily: FB, fontSize: "13px", cursor: "pointer",
                  marginBottom: "20px", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,153,42,0.4)"; e.currentTarget.style.color = "#c8992a"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#4a3a5a"; }}>
                + Agregar jugador
              </button>
            )}

            {/* Copa toggle */}
            <div style={{
              padding: "14px 18px",
              background: todosConJugador ? "rgba(38,198,195,0.06)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${todosConJugador ? "rgba(38,198,195,0.25)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
            }}>
              <div>
                <p style={{ fontFamily: FB, fontWeight: 600, color: "#f0e8d6", fontSize: "13px", marginBottom: "3px" }}>
                  🏆 Sumar a Copa
                </p>
                <p style={{ fontFamily: FB, fontSize: "11px", color: todosConJugador ? "#26c6c3" : "#4a3a5a" }}>
                  {todosConJugador
                    ? "✓ Todos asignados — sumará a la copa activa"
                    : "Hay visitantes — no sumará a copa"}
                </p>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px",
                cursor: todosConJugador ? "pointer" : "not-allowed", opacity: todosConJugador ? 1 : 0.35 }}>
                <input type="checkbox" checked={asociarACopa}
                  onChange={e => setAsociarACopa(e.target.checked)}
                  disabled={!todosConJugador}
                  className="w-5 h-5 accent-teal-400" />
                <span style={{ fontFamily: FM, fontSize: "12px", color: "#f0e8d6" }}>
                  {asociarACopa ? "SÍ" : "NO"}
                </span>
              </label>
            </div>
          </div>

          {/* Bottom actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            {todosConColor && (
              <button type="button" onClick={() => setShowSaveModal(true)}
                style={{ padding: "14px 16px", background: "rgba(200,153,42,0.06)",
                  border: "1px solid rgba(200,153,42,0.2)", borderRadius: "8px",
                  color: "#8a7a9a", fontFamily: FM, fontSize: "11px",
                  cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.1em" }}>
                ★ GUARDAR
              </button>
            )}
            <button type="submit" disabled={!todosConColor}
              style={{
                flex: 1, padding: "14px",
                background: todosConColor
                  ? "linear-gradient(135deg, rgba(168,85,247,0.7), rgba(139,92,246,0.85))"
                  : "rgba(255,255,255,0.03)",
                border: `1px solid ${todosConColor ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "8px",
                color: todosConColor ? "#f0e8d6" : "#2a1a3a",
                fontFamily: FD, fontSize: "20px", letterSpacing: "0.1em",
                cursor: todosConColor ? "pointer" : "not-allowed",
                transition: "all 0.25s",
              }}
              onMouseEnter={e => { if (todosConColor) e.currentTarget.style.filter = "brightness(1.15)"; }}
              onMouseLeave={e => { e.currentTarget.style.filter = ""; }}>
              CREAR PARTIDA ✨
            </button>
          </div>
        </form>

        {/* ── Save group modal ── */}
        {showSaveModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
            onClick={e => { if (e.target === e.currentTarget) setShowSaveModal(false); }}>
            <div className="game-panel" style={{ width: "100%", maxWidth: "340px", padding: "28px" }}>
              <h3 style={{ fontFamily: FD, fontSize: "22px", color: "#f0e8d6", marginBottom: "14px", letterSpacing: "0.06em" }}>
                GUARDAR GRUPO
              </h3>
              <p style={{ fontFamily: FB, fontSize: "12px", color: "#8a7a9a", marginBottom: "14px" }}>
                {slots.filter(s => s.colorName).length} jugadores
              </p>
              <input
                autoFocus
                type="text"
                placeholder="Nombre del grupo..."
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); saveGroup(); } }}
                style={{
                  width: "100%", padding: "10px 14px", marginBottom: "16px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,153,42,0.25)",
                  borderRadius: "6px", color: "#f0e8d6", fontFamily: FB, fontSize: "14px", outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => { setShowSaveModal(false); setGroupName(""); }}
                  style={{ flex: 1, padding: "10px", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px",
                    color: "#8a7a9a", fontFamily: FB, cursor: "pointer" }}>
                  Cancelar
                </button>
                <button type="button" onClick={saveGroup} disabled={!groupName.trim()}
                  style={{ flex: 1, padding: "10px",
                    background: groupName.trim() ? "rgba(200,153,42,0.12)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${groupName.trim() ? "rgba(200,153,42,0.4)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: "6px", color: groupName.trim() ? "#c8992a" : "#2a1a3a",
                    fontFamily: FD, fontSize: "16px", letterSpacing: "0.08em", cursor: groupName.trim() ? "pointer" : "default" }}>
                  GUARDAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── PlayerSlot ─────────────────────────────────────────────────── */
function PlayerSlot({ slot, idx, players, loadingPlayers, takenColors, takenPlayers,
  pickerOpen, onOpenPicker, onClosePicker, onSelectColor, onSelectPlayer, onRemove }) {

  const pickerRef = useRef(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) onClosePicker();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen, onClosePicker]);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "12px 14px",
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "8px",
    }}>
      {/* Color button + picker */}
      <div ref={pickerRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          type="button"
          onClick={onOpenPicker}
          title={slot.colorName || "Elegir color"}
          style={{
            width: "40px", height: "40px", borderRadius: "8px",
            background: slot.colorCode || "rgba(255,255,255,0.06)",
            border: slot.colorName ? "2px solid rgba(255,255,255,0.5)" : "2px dashed rgba(255,255,255,0.15)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.08)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; }}>
          {!slot.colorName && <span style={{ color: "#4a3a5a", fontSize: "20px", lineHeight: 1 }}>+</span>}
        </button>

        {pickerOpen && (
          <div style={{
            position: "absolute", top: "48px", left: 0, zIndex: 50,
            background: "#1a1330", border: "1px solid rgba(200,153,42,0.3)",
            borderRadius: "10px", padding: "10px",
            display: "grid", gridTemplateColumns: "repeat(4, 36px)", gap: "6px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            {COLORES_ARRAY.map(({ name, code }) => {
              const taken = takenColors.includes(name);
              return (
                <button key={name} type="button"
                  onClick={() => !taken && onSelectColor(name, code)}
                  title={taken ? `${name} (en uso)` : name}
                  style={{
                    width: "36px", height: "36px", borderRadius: "6px", background: code,
                    border: slot.colorName === name ? "2px solid white" : "2px solid transparent",
                    cursor: taken ? "not-allowed" : "pointer",
                    opacity: taken ? 0.2 : 1,
                    transition: "transform 0.1s",
                  }}
                  onMouseEnter={e => { if (!taken) e.currentTarget.style.transform = "scale(1.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Color label */}
      <span style={{
        fontFamily: FM, fontSize: "10px", letterSpacing: "0.1em",
        color: slot.colorName ? "#f0e8d6" : "#2a1a3a",
        minWidth: "52px", textTransform: "uppercase",
      }}>
        {slot.colorName || "—"}
      </span>

      {/* Player select */}
      <div style={{ flex: 1 }}>
        {loadingPlayers ? (
          <span style={{ fontFamily: FB, fontSize: "12px", color: "#4a3a5a" }}>Cargando...</span>
        ) : (
          <select
            value={slot.playerId || ""}
            onChange={e => onSelectPlayer(e.target.value || null)}
            style={{
              width: "100%", padding: "7px 10px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: slot.playerId ? "#f0e8d6" : "#4a3a5a",
              fontFamily: FB, fontSize: "13px", outline: "none", cursor: "pointer",
            }}>
            <option value="" style={{ background: "#1a1330", color: "#4a3a5a" }}>
              — Visitante —
            </option>
            {players.map(p => {
              const taken = takenPlayers.includes(p.id);
              return (
                <option key={p.id} value={p.id} disabled={taken}
                  style={{ background: "#1a1330", color: taken ? "#2a1a3a" : "#f0e8d6" }}>
                  {p.name}{taken ? " (en uso)" : ""}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* Remove */}
      {onRemove && (
        <button type="button" onClick={onRemove}
          style={{
            width: "26px", height: "26px", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(230,57,70,0.08)", border: "1px solid rgba(230,57,70,0.15)",
            borderRadius: "4px", color: "#4a3a5a", cursor: "pointer", fontSize: "15px",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "#e63946"; e.currentTarget.style.borderColor = "rgba(230,57,70,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#4a3a5a"; e.currentTarget.style.borderColor = "rgba(230,57,70,0.15)"; }}>
          ×
        </button>
      )}
    </div>
  );
}

export default NewMatch;
