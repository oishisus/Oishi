import React from 'react';
import OrderCard from './OrderCard';
import '../../styles/AdminKanban.css';

const AdminKanban = ({ columns, isMobile, mobileTab, setMobileTab, moveOrder, setReceiptModalOrder }) => {
    return (
        <>
            <div className="mobile-tabs">
                <button onClick={() => setMobileTab('pending')} className={mobileTab === 'pending' ? 'active' : ''}>Entrantes ({columns.pending.length})</button>
                <button onClick={() => setMobileTab('active')} className={mobileTab === 'active' ? 'active' : ''}>Cocina ({columns.active.length})</button>
                <button onClick={() => setMobileTab('completed')} className={mobileTab === 'completed' ? 'active' : ''}>Listos ({columns.completed.length})</button>
            </div>

            <div className="kanban-board">
                <div className={`kanban-column col-pending ${isMobile && mobileTab !== 'pending' ? 'hidden' : ''}`}>
                    <div className="column-header"><span className="dot dot-orange"></span><h3>ENTRANTES</h3><span className="count">{columns.pending.length}</span></div>
                    <div className="column-body">
                        {columns.pending.length === 0 ? <div className="empty-zone">Sin pedidos</div> : columns.pending.map(o => (
                            <OrderCard
                                key={o.id}
                                order={o}
                                moveOrder={moveOrder}
                                setReceiptModalOrder={setReceiptModalOrder}
                            />
                        ))}
                    </div>
                </div>
                <div className={`kanban-column col-active ${isMobile && mobileTab !== 'active' ? 'hidden' : ''}`}>
                    <div className="column-header"><span className="dot dot-red"></span><h3>COCINANDO</h3><span className="count">{columns.active.length}</span></div>
                    <div className="column-body">
                        {columns.active.length === 0 ? <div className="empty-zone">Cocina libre</div> : columns.active.map(o => (
                            <OrderCard
                                key={o.id}
                                order={o}
                                moveOrder={moveOrder}
                                setReceiptModalOrder={setReceiptModalOrder}
                            />
                        ))}
                    </div>
                </div>
                <div className={`kanban-column col-completed ${isMobile && mobileTab !== 'completed' ? 'hidden' : ''}`}>
                    <div className="column-header"><span className="dot dot-green"></span><h3>LISTOS</h3><span className="count">{columns.completed.length}</span></div>
                    <div className="column-body">
                        {columns.completed.length === 0 ? <div className="empty-zone">Nada listo</div> : columns.completed.map(o => (
                            <OrderCard
                                key={o.id}
                                order={o}
                                moveOrder={moveOrder}
                                setReceiptModalOrder={setReceiptModalOrder}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminKanban;
