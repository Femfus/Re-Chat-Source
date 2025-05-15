import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import Pricing from './components/Pricing';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import Snow from './components/Snow';
import Auth from './components/Auth';
import Admin from './components/Admin';
import AdminLogin from './components/AdminLogin';
import PasswordReset from './components/PasswordReset';
import Dashboard from './components/Dashboard';
import PgpVerification from './components/PgpVerification';
import VerificationPage from './components/VerificationPage';
import TermsOfService from './components/TermsOfService';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={
          <div className="App">
            <Snow />
            <Auth />
          </div>
        } />
        <Route path="/register" element={
          <div className="App">
            <Snow />
            <Auth />
          </div>
        } />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route path="/admin/login" element={
          <div className="App">
            <Snow />
            <AdminLogin />
          </div>
        } />
        <Route path="/admin" element={
          <div className="App">
            <Snow />
            <Admin />
          </div>
        } />
        <Route path="/verify/:code" element={
          <div className="App">
            <Snow />
            <VerificationPage />
          </div>
        } />
        <Route path="/pgp-verification" element={
          <div className="App">
            <Snow />
            <PgpVerification />
          </div>
        } />
        <Route path="/password-reset/:token" element={
          <div className="App">
            <Snow />
            <PasswordReset />
          </div>
        } />
        <Route path="/terms" element={
          <div className="App">
            <Snow />
            <TermsOfService />
          </div>
        } />
        <Route path="/" element={
          <div className="App">
            <Snow />
            <Navbar />
            <main>
              <Hero />
              <Features />
              <HowItWorks />
              <Pricing />
              <FAQ />
            </main>
            <Footer />
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
