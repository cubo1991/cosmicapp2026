'use client';
import React, { useState, useEffect } from 'react';
import { getAliens } from '@/firebase/db';

const AlienList = () => {
  const [aliens, setAliens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAliens = async () => {
      try {
        setLoading(true);
        const aliensList = await getAliens();   // 👈 usamos la función centralizada
        setAliens(aliensList);
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching aliens:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAliens();
  }, []);

  if (loading) return <div className="loading">Cargando aliens...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="alien-list">
      <h2>Lista de Aliens</h2>
      {aliens.length === 0 ? (
        <p>No hay aliens disponibles</p>
      ) : (
        <div className="aliens-grid">
          {aliens.map((alien) => (
            <div key={alien.id} className="alien-card">
              <h3>{alien.Nombre}</h3>
              <p>{alien.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlienList;
