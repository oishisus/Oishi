import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChefHat, ShoppingBag, BarChart3, Users, List, Settings, LogOut, DollarSign, Store, ChevronDown, ClipboardList } from 'lucide-react';
import logo from '../../../assets/logo.png';
import cashIcon from '../../../assets/cash.svg';
import categoryIcon from '../../../assets/category.svg';
import '../../../styles/AdminSidebar.css';

const CashIcon = ({ size }) => (
    <img 
        src={cashIcon} 
        alt="Caja" 
        style={{ 
            width: size, 
            height: size, 
            filter: 'brightness(0) invert(1)',
            opacity: 0.9 
        }} 
    />
);

const CategoryIcon = ({ size }) => (
    <img 
        src={categoryIcon} 
        alt="Categorías" 
        style={{ 
            width: size, 
            height: size, 
            filter: 'brightness(0) invert(1)',
            opacity: 0.9 
        }} 
    />
);

const AdminSidebar = ({ activeTab, setActiveTab, isMobile, kanbanColumns, onLogout }) => {
    const navigate = useNavigate();
    const pendingCount = kanbanColumns?.pending?.length || 0;

    // DEFINICIÓN DE LA ESTRUCTURA DEL MENÚ (Memoizada)
    const menuItems = useMemo(() => [
        { 
            id: 'orders', 
            label: 'Pedidos', 
            icon: ChefHat, 
            badge: pendingCount > 0 ? pendingCount : null 
        },
        {
            id: 'sales-group',
            label: 'Ventas',
            icon: DollarSign,
            isGroup: true,
            children: [
                { id: 'caja', label: 'Caja', icon: CashIcon },
                { id: 'analytics', label: 'Reportes', icon: BarChart3 }
            ]
        },
        {
            id: 'menu-group',
            label: 'Menú',
            icon: List,
            isGroup: true,
            children: [
                { id: 'categories', label: 'Categorías', icon: CategoryIcon },
                { id: 'products', label: 'Productos', icon: ShoppingBag },
                { id: 'inventory', label: 'Inventario', icon: ClipboardList }
            ]
        },
        { id: 'clients', label: 'Clientes', icon: Users },
        { id: 'settings', label: 'Herramientas', icon: Settings }
    ], [pendingCount]);

    // ESTADO PARA GRUPOS EXPANDIDOS (Inicialización perezosa)
    const [expandedGroups, setExpandedGroups] = useState(() => {
        const activeGroup = menuItems.find(item => item.isGroup && item.children?.some(child => child.id === activeTab));
        return activeGroup ? { [activeGroup.id]: true } : {};
    });

    // Efecto para abrir el grupo correcto si se cambia el tab desde fuera
    useEffect(() => {
        const activeGroup = menuItems.find(item => item.isGroup && item.children?.some(child => child.id === activeTab));
        
        if (activeGroup) {
            // Usar setTimeout para evitar warning de actualización síncrona durante render
            const timer = setTimeout(() => {
                setExpandedGroups(prev => {
                    if (prev[activeGroup.id]) return prev;
                    return { ...prev, [activeGroup.id]: true };
                });
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [activeTab, menuItems]);

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    return (
        <aside className="admin-sidebar glass">
            <div className="sidebar-top">
                {!isMobile && <div className="logo-circle"><img src={logo} alt="Logo" /></div>}
                {!isMobile && <h3 className="brand-title">Oishi Admin</h3>}
            </div>
            
            <nav className="sidebar-menu">
                {menuItems.map(item => {
                    if (item.isGroup) {
                        const isExpanded = expandedGroups[item.id];
                        const isActiveGroup = item.children.some(child => child.id === activeTab);
                        
                        return (
                            <div key={item.id} className="nav-group-wrapper">
                                <button 
                                    onClick={() => toggleGroup(item.id)} 
                                    className={`nav-item nav-group-header ${isActiveGroup ? 'active-group' : ''}`}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <item.icon size={22} />
                                        {!isMobile && item.label}
                                    </div>
                                    {!isMobile && (
                                        <ChevronDown 
                                            size={16} 
                                            className={`nav-chevron ${isExpanded ? 'expanded' : ''}`} 
                                        />
                                    )}
                                </button>
                                
                                <div className={`nav-sub-menu ${isExpanded ? 'expanded' : ''}`}>
                                    {item.children.map(child => (
                                        <button 
                                            key={child.id}
                                            onClick={() => setActiveTab(child.id)}
                                            className={`nav-item ${activeTab === child.id ? 'active' : ''}`}
                                        >
                                            <child.icon size={18} /> {/* Icono un poco más chico */}
                                            {!isMobile && child.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    } else {
                        // Item normal
                        return (
                            <button 
                                key={item.id}
                                onClick={() => setActiveTab(item.id)} 
                                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                            >
                                <item.icon size={22} /> 
                                {!isMobile && item.label}
                                {item.badge && <span className="badge-count">{item.badge}</span>}
                            </button>
                        );
                    }
                })}

                <button onClick={() => navigate('/')} className="nav-item" style={{ marginTop: 'auto', marginBottom: 10 }}>
                    <Store size={22} /> {!isMobile && 'Ver Tienda'}
                </button>
                <button onClick={onLogout} className="nav-item logout">
                    <LogOut size={22} /> {!isMobile && 'Cerrar Sesión'}
                </button>
            </nav>
        </aside>
    );
};

export default AdminSidebar;
