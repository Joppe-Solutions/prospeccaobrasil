import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import './styles.css';
import './system.css';
import { getToken } from './lib/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Imoveis from './pages/Imoveis';
import ImovelWizard from './pages/ImovelWizard';
import ImovelDetalhe from './pages/ImovelDetalhe';
import Empresas from './pages/Empresas';
import EmpresaWizard from './pages/EmpresaWizard';
import Oportunidades from './pages/Oportunidades';
import Perfil from './pages/Perfil';
import Usuarios from './pages/Usuarios';

const Private = ({ children }) => getToken() ? children : <Navigate to="/login" />;

function App() {
  const location = useLocation();
  const background = location.state?.backgroundLocation;
  return <>
    <Routes location={background || location}>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Layout /></Private>}>
        <Route index element={<Dashboard />} />
        <Route path="imoveis" element={<Imoveis />} />
        <Route path="imoveis/novo" element={<ImovelWizard />} />
        <Route path="imoveis/:id" element={<ImovelDetalhe />} />
        <Route path="imoveis/:id/editar" element={<ImovelWizard />} />
        <Route path="empresas" element={<Empresas />} />
        <Route path="empresas/nova" element={<EmpresaWizard />} />
        <Route path="empresas/:id/editar" element={<EmpresaWizard />} />
        <Route path="oportunidades" element={<Oportunidades />} />
        <Route path="perfil" element={<Perfil />} />
        <Route path="usuarios" element={<Usuarios />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
    {background && <Routes>
      <Route path="/imoveis/novo" element={<Private><ImovelWizard /></Private>} />
      <Route path="/imoveis/:id/editar" element={<Private><ImovelWizard /></Private>} />
      <Route path="/empresas/nova" element={<Private><EmpresaWizard /></Private>} />
      <Route path="/empresas/:id/editar" element={<Private><EmpresaWizard /></Private>} />
    </Routes>}
  </>;
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter><App /></BrowserRouter>
);
