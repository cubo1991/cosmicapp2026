'use client';
import Link from 'next/link';
import { useState } from 'react';



export default function NavBar() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    return (
        <nav className="navBar-navbar">
            <div className="navBar-container">
                <Link href="/" className="navBar-logo">
                    <span className="navBar-logoIcon">🌌</span>
                    CosmicApp
                </Link>

                <a className='navBar-slogan'>Me chupa la pija la UI</a>

                <button className="navBar-hamburger" onClick={toggleMenu}>
                    <span className="navBar-bar"></span>
                    <span className="navBar-bar"></span>
                    <span className="navBar-bar"></span>
                </button>

                <ul className={`navBar-menu ${isOpen ? 'navBar-active' : ''}`}>
                    <li>
                        <Link href="/" onClick={() => setIsOpen(false)}>Home</Link>
                    </li>
                    <li>
                        <Link href="/nuevaPartida" onClick={() => setIsOpen(false)}>Crear Partida</Link>
                    </li>
                    <li>
                        <Link href="/cargarPartida" onClick={() => setIsOpen(false)}>Cargar Partida</Link>
                    </li>
                </ul>
            </div>
        </nav>
    );
}