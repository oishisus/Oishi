import React, { useMemo } from 'react';
import OrderCard from './OrderCard';
import '../../../styles/AdminKanban.css';

const AdminKanban = ({ columns, isMobile, mobileTab, setMobileTab, moveOrder, setReceiptModalOrder }) => {

    // 1. CONFIGURACIÓN CENTRALIZADA
    // Aquí defines tus columnas. Si quieres agregar una, solo la pones aquí y listo.
    const columnConfig = useMemo(() => [
        { 
            id: 'pending', 
            title: 'ENTRANTES', 
            shortTitle: 'Entrantes', // Para el botón móvil
            dotClass: 'dot-orange', 
            emptyMsg: 'Sin pedidos' 
        },
        { 
            id: 'active', 
            title: 'COCINANDO', 
            shortTitle: 'Cocina', 
            dotClass: 'dot-red', 
            emptyMsg: 'Cocina libre' 
        },
        { 
            id: 'completed', 
            title: 'LISTOS', 
            shortTitle: 'Listos', 
            dotClass: 'dot-green', 
            emptyMsg: 'Nada listo' 
        }
    ], []);

    return (
        <>
            {/* 2. TABS MÓVILES GENERADOS DINÁMICAMENTE */}
            <div className="mobile-tabs">
                {columnConfig.map(col => (
                    <button
                        key={col.id}
                        onClick={() => setMobileTab(col.id)}
                        className={mobileTab === col.id ? 'active' : ''}
                    >
                        {col.shortTitle} ({columns[col.id]?.length || 0})
                    </button>
                ))}
            </div>

            {/* 3. TABLERO KANBAN GENERADO DINÁMICAMENTE */}
            <div className="kanban-board">
                {columnConfig.map((col) => {
                    const ordersInColumn = columns[col.id] || [];
                    const isHiddenOnMobile = isMobile && mobileTab !== col.id;

                    return (
                        <div 
                            key={col.id} 
                            className={`kanban-column col-${col.id} ${isHiddenOnMobile ? 'hidden' : ''}`}
                        >
                            {/* Header */}
                            <div className="column-header">
                                <span className={`dot ${col.dotClass}`}></span>
                                <h3>{col.title}</h3>
                                <span className="count">{ordersInColumn.length}</span>
                            </div>

                            {/* Body */}
                            <div className="column-body">
                                {ordersInColumn.length === 0 ? (
                                    <div className="empty-zone">{col.emptyMsg}</div>
                                ) : (
                                    ordersInColumn.map(order => (
                                        <OrderCard
                                            key={order.id}
                                            order={order}
                                            moveOrder={moveOrder}
                                            setReceiptModalOrder={setReceiptModalOrder}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default AdminKanban;