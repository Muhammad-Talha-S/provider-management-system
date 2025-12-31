// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Dashboard } from "./pages/Dashboard/Dashboard";
import { ServiceRequestsPage } from "./pages/ServiceRequest/ServiceRequestsPage";
import { ServiceOffersPage } from "./pages/ServiceOffer/ServiceOffersPage";
import { ServiceOrdersPage } from "./pages/ServiceOrder/ServiceOrderPage";
import { ContractsPage } from "./pages/Contracts/ContractsPage";
import { SpecialistsPage } from "./pages/Specialists/SpecialistsPage";
import { UsersPage } from "./pages/Users/UsersPage";
import { ActivityLogPage } from "./pages/ActivityLog/ActivityLogPage";
import { MyOrders } from "./pages/MyOrders/MyOrdersPage";
import { ServiceRequestDetail } from "./pages/ServiceRequestDetail/ServiceRequestDetail";
import { ServiceOfferDetail } from "./pages/ServiceOfferDetail/ServiceOfferDetail";
import { ServiceOrderDetail } from "./pages/ServiceOrderDetail/ServiceOrderDetail";
import { ContractDetail } from "./pages/ContractDetail/ContractDetail";
import { UserProfile } from "./pages/UserProfile/UserProfile";

const App = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex h-screen bg-gray-50">
          <Sidebar />
          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/service-requests" element={<ServiceRequestsPage />} />
              <Route path="/service-requests/:id" element={<ServiceRequestDetail />} />
              <Route path="/service-offers" element={<ServiceOffersPage />} />
              <Route path="/service-offers/:id" element={<ServiceOfferDetail />} />
              <Route path="/service-orders" element={<ServiceOrdersPage />} />
              <Route path="/service-orders/:id" element={<ServiceOrderDetail />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/contracts/:id" element={<ContractDetail />} />
              <Route path="/specialists" element={<SpecialistsPage />} />
              <Route path="/specialists/:id" element={<UserProfile />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserProfile />} />
              <Route path="/activity-log" element={<ActivityLogPage />} />
              <Route path="/my-orders" element={<MyOrders />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
