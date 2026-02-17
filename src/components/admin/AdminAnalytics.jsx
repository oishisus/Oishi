import React, { useMemo } from 'react';
import { DollarSign, Package, Star, Trophy, PieChart, Loader2 } from 'lucide-react';
import '../../styles/AdminAnalytics.css'; // Asumiendo que los estilos están aquí o son globales

const AdminAnalytics = ({ orders }) => {
  // --- 8. ESTADÍSTICAS (MEMOIZADAS) ---
  // Extraído de Admin.jsx para limpieza
  const analyticsData = useMemo(() => {
    if (!orders || !orders.length) return null;

    // Filtramos solo completadas para dinero real
    const validOrders = orders.filter(o => o.status === 'completed' || o.status === 'picked_up');
    const totalIncome = validOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    const productCounts = {};
    validOrders.forEach(order => {
      // Defensive coding para items
      const items = Array.isArray(order.items) ? order.items : [];
      items.forEach(item => {
        if (!productCounts[item.name]) productCounts[item.name] = 0;
        productCounts[item.name] += (item.quantity || 0);
      });
    });

    const sortedProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const payments = { online: 0, tienda: 0 };
    validOrders.forEach(o => {
      if (o.payment_type === 'online' || o.payment_type === 'transfer') payments.online++;
      else payments.tienda++;
    });

    return { totalIncome, sortedProducts, payments, totalOrders: validOrders.length };
  }, [orders]);

  if (!orders || orders.length === 0) {
    return (
      <div className="analytics-view animate-fade flex-center" style={{ height: 300, color: 'var(--text-secondary)' }}>
        <p>No hay datos suficientes para generar reportes.</p>
      </div>
    );
  }

  if (!analyticsData) return <Loader2 className="animate-spin text-accent" />;

  const { totalIncome, sortedProducts, payments, totalOrders } = analyticsData;

  return (
    <div className="analytics-view animate-fade">
      <div className="kpi-grid">
        <div className="kpi-card glass">
          <div className="kpi-icon money"><DollarSign size={24} /></div>
          <div>
            <h4>Ingresos (Visible)</h4>
            <span className="kpi-value">${totalIncome.toLocaleString('es-CL')}</span>
          </div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-icon orders"><Package size={24} /></div>
          <div>
            <h4>Pedidos (Visible)</h4>
            <span className="kpi-value">{totalOrders}</span>
          </div>
        </div>
        <div className="kpi-card glass">
          <div className="kpi-icon star"><Star size={24} /></div>
          <div>
            <h4>Ticket Promedio</h4>
            <span className="kpi-value">
              ${totalOrders ? Math.round(totalIncome / totalOrders).toLocaleString('es-CL') : 0}
            </span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card glass">
          <div className="chart-header">
            <Trophy size={20} color="#f4a261" />
            <h3>Platos Más Vendidos</h3>
          </div>
          <div className="top-products-list">
            {sortedProducts.map((p, idx) => (
              <div key={idx} className="top-product-item">
                <div className="rank-num">#{idx + 1}</div>
                <div className="rank-info">
                  <div className="rank-name">{p.name}</div>
                  <div className="rank-bar-bg">
                    <div className="rank-bar-fill" style={{ width: `${sortedProducts[0]?.count ? (p.count / sortedProducts[0].count) * 100 : 0}%` }}></div>
                  </div>
                </div>
                <div className="rank-count">{p.count}</div>
              </div>
            ))}
            {sortedProducts.length === 0 && <div className="empty-chart">Aún no hay ventas suficientes</div>}
          </div>
        </div>

        <div className="chart-card glass">
          <div className="chart-header">
            <PieChart size={20} color="#38bdf8" />
            <h3>Métodos de Pago</h3>
          </div>
          <div className="payment-stats">
            <div className="pay-stat-row">
              <span>Online/Transfer</span>
              <div className="pay-bar">
                <div className="pay-fill online" style={{ width: `${(payments.online / (totalOrders || 1)) * 100}%` }}></div>
              </div>
              <span>{payments.online}</span>
            </div>
            <div className="pay-stat-row">
              <span>Local (Efec/Tarj)</span>
              <div className="pay-bar">
                <div className="pay-fill store" style={{ width: `${(payments.tienda / (totalOrders || 1)) * 100}%` }}></div>
              </div>
              <span>{payments.tienda}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
