import React from "react";
import { Route } from "react-router-dom";
import Home from "../../shared/components/Home";
import Menu from "../../features/products/pages/Menu";
import Login from "../../features/auth/pages/Login";
import Admin from "../../features/admin/pages/Admin";
import ProtectedRoute from "../../features/auth/components/ProtectedRoute";

export const routes = (
  <>
    <Route path="/" element={<Home />} />
    <Route path="/menu" element={<Menu />} />
    <Route path="/login" element={<Login />} />
    <Route
      path="/admin"
      element={
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      }
    />
  </>
);
