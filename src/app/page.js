'use client';
import Link from 'next/link';
import { CTAButton } from './components/CTAButton';
import RandomAlien from './sections/RandomAlien';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-4 drop-shadow-lg">
            🌌 CosmicAPP
          </h1>
          <p className="text-xl text-purple-200 mb-2">
            Elige aliens poderosos y compite contra tus amigos
          </p>
          <p className="text-sm text-purple-300">
            Un juego de estrategia cósmico en tiempo real
          </p>
        </div>

        {/* CTA Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <CTAButton
            href="/nuevaPartida"
            icon="➕"
            title="Crear Partida"
            description="Selecciona colores, invita amigos y asigna aliens"
          />
          <CTAButton
            href="/cargarPartida"
            icon="🔗"
            title="Unirse a Partida"
            description="Ingresa el código de tu amigo"
          />
          <CTAButton
            href="/alienList"
            icon="👽"
            title="Ver Todos los Aliens"
            description="Explora todas las opciones disponibles"
          />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 justify-center mb-16">
          <div className="flex-1 h-px bg-gradient-to-r from-purple-600 to-transparent"></div>
          <p className="text-purple-300 font-semibold">O prueba tu suerte</p>
          <div className="flex-1 h-px bg-gradient-to-l from-purple-600 to-transparent"></div>
        </div>
      </section>

      {/* Random Alien Section */}
      <section className="bg-black/30 backdrop-blur-sm py-16 border-y border-purple-500/30">
        <div className="container mx-auto">
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-white mb-8 text-center">
              Genera un alien aleatorio
            </h2>
            <RandomAlien />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          ¿Cómo funciona?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            number="1"
            title="Crea o Únete"
            description="Crea una nueva partida o únete a una existente con un código"
          />
          <FeatureCard
            number="2"
            title="Elige Aliens"
            description="Selecciona estratégicamente from una variedad de aliens con diferentes poderes"
          />
          <FeatureCard
            number="3"
            title="¡Compite!"
            description="Batalla con tus amigos y descubre quién es el mejor estratega"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ number, title, description }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 hover:border-purple-500/50 transition-colors">
      <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4">
        {number}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-purple-200">{description}</p>
    </div>
  );
}

