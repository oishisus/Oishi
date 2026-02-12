import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/admin');
    } catch (err) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      console.error('Error login:', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card glass animate-fade">
        <header className="login-header">
          <div className="login-icon">
            <Lock size={32} />
          </div>
          <h2>Acceso Admin</h2>
          <p>Ingresa tus credenciales para continuar</p>
        </header>

        <form onSubmit={handleLogin} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@oishi.cl"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <span>Iniciar Sesión</span>
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050505;
          padding: 20px;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 40px 30px;
          border-radius: 20px;
          border: 1px solid var(--card-border);
          text-align: center;
        }

        .login-icon {
          width: 60px;
          height: 60px;
          background: rgba(230, 57, 70, 0.1);
          color: var(--accent-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .login-header h2 {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }

        .login-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 30px;
        }

        .login-form {
          text-align: left;
        }

        .login-error {
          background: rgba(230, 57, 70, 0.1);
          color: var(--accent-primary);
          padding: 12px;
          border-radius: 10px;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 8px;
          font-weight: 600;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-with-icon :global(svg) {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          background: var(--bg-tertiary);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          color: white;
          font-family: inherit;
          transition: var(--transition-fast);
        }

        input:focus {
          border-color: var(--accent-primary);
          outline: none;
          background: rgba(255,255,255,0.05);
        }

        .btn-block {
          width: 100%;
          margin-top: 10px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
