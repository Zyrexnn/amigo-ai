// File: pages/login.tsx

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '../styles/Login.module.css'; // Anda perlu membuat file ini

export default function Login() {
  const [code, setCode] = useState('');
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctCode = '123'; // Kode rahasia Anda

    if (code === correctCode) {
      localStorage.setItem('isLoggedIn', 'true');
      router.push('/');
    } else {
      alert('Kode salah. Silakan coba lagi.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <h1 className={styles.title}>Selamat Datang di Amigo AI</h1>
        <p className={styles.subtitle}>Silakan masukkan kode untuk melanjutkan.</p>
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Masukkan kode..."
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Masuk
          </button>
        </form>
      </div>
    </div>
  );
}