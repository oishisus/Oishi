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
    <div className="login-container">
      <div className="login-card glass animate-fade">
        <header style={{ marginBottom: '30px' }}>
          <div 
            style={{ 
              width: '64px', height: '64px', 
              background: 'rgba(230, 57, 70, 0.15)', 
              color: 'var(--accent-primary)', 
              borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 20px' 
            }}
          >
            <Lock size={32} />
          </div>
          <h2 className="section-title" style={{ marginBottom: '5px', fontSize: '1.8rem' }}>Acceso Admin</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Oishi Sushi & Cocktail</p>
        </header>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          {error && (
            <div 
              style={{ 
                background: 'rgba(230, 57, 70, 0.1)', 
                color: '#ff4d5a', 
                padding: '12px', 
                borderRadius: '12px', 
                fontSize: '0.9rem', 
                display: 'flex', gap: '10px', alignItems: 'center', 
                marginBottom: '20px', border: '1px solid rgba(230, 57, 70, 0.2)' 
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input 
                className="form-input"
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@oishi.cl"
                required
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              <input 
                className="form-input"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required
                style={{ paddingLeft: '44px' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <span>Iniciar Sesión</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;