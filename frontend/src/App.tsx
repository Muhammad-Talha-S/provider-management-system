// frontend/src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ServiceRequestsPage } from "./pages/ServiceRequestsPage";
import { ServiceOffersPage } from "./pages/ServiceOffersPage";
import { ServiceOrdersPage } from "./pages/ServiceOrdersPage";
import { ContractsPage } from "./pages/ContractsPage";
import { SpecialistsPage } from "./pages/SpecialistsPage";
import { ActivityLogPage } from "./pages/ActivityLogPage";
import { ServiceRequestDetail } from "./pages/ServiceRequestDetail";
import { ServiceOfferDetail } from "./pages/ServiceOfferDetail";
import { ServiceOrderDetail } from "./pages/ServiceOrderDetail";
import { UserProfile } from "./pages/UserProfile";
import { MyOrders } from "./pages/MyOrders";
import { ContractDetail } from "./pages/ContractDetail";
import { ProviderPage } from "./pages/ProviderPage";
import { CreateServiceOffer } from "./pages/CreateServiceOffer";
import CreateContractOfferPage from "./pages/CreateContractOffer";


const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />

          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

          <Route path="/service-requests" element={<ProtectedRoute><ServiceRequestsPage /></ProtectedRoute>} />
          <Route path="/service-requests/:id" element={<ProtectedRoute><ServiceRequestDetail /></ProtectedRoute>} />

          <Route path="/service-offers" element={<ProtectedRoute><ServiceOffersPage /></ProtectedRoute>} />
          <Route path="/service-offers/create" element={<ProtectedRoute><CreateServiceOffer /></ProtectedRoute>} />
          <Route path="/service-offers/:id" element={<ProtectedRoute><ServiceOfferDetail /></ProtectedRoute>} />

          <Route path="/service-orders" element={<ProtectedRoute><ServiceOrdersPage /></ProtectedRoute>} />
          <Route path="/service-orders/:id" element={<ProtectedRoute><ServiceOrderDetail /></ProtectedRoute>} />

          <Route path="/contracts" element={<ProtectedRoute><ContractsPage /></ProtectedRoute>} />
          <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />

          {/* SINGLE USERS PAGE */}
          <Route path="/specialists" element={<ProtectedRoute><SpecialistsPage /></ProtectedRoute>} />
          <Route path="/specialists/:id" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

          <Route path="/provider" element={<ProtectedRoute><ProviderPage /></ProtectedRoute>} />
          <Route path="/activity-log" element={<ProtectedRoute><ActivityLogPage /></ProtectedRoute>} />
          <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
          <Route path="/contract-offers/create" element={<ProtectedRoute><CreateContractOfferPage /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
