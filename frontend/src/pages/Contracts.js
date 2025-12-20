import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios"; // <--- Connects to Django
import { toast } from "react-toastify";
import "./Contracts.css";

const Contracts = () => {
  const [contracts, setContracts] = useState([]);

  // 1. Fetch Real Contracts from Database
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const response = await api.get("/contracts/");
        setContracts(response.data);
      } catch (error) {
        console.error("Error fetching contracts:", error);
        toast.error("Could not load contracts.");
      }
    };

    fetchContracts();
  }, []);

  // 2. Handle Signing (Connects to Backend -> Group 2)
  const handleSignContract = async (id) => {
    try {
      // Call the Django Endpoint
      await api.post(`/contracts/${id}/sign/`);

      toast.success("Contract Signed! Notified Group 2. ✍️");

      // Update UI locally
      setContracts(
        contracts.map((contract) =>
          contract.id === id ? { ...contract, status: "Signed" } : contract
        )
      );
    } catch (error) {
      console.error("Error signing contract:", error);
      toast.error("Failed to sign contract.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="contracts-container">
        <h1>Contract Management</h1>
        <p>Review and manage legal agreements with Group 2 (Contract Tool).</p>

        <div className="contracts-list">
          {contracts.length === 0 ? (
            <p>No pending contracts available.</p>
          ) : (
            contracts.map((contract) => (
              <div key={contract.id} className="contract-card">
                <div className="contract-header">
                  <h3>{contract.title}</h3>
                  <span
                    className={`status-badge status-${contract.status.toLowerCase()}`}
                  >
                    {contract.status}
                  </span>
                </div>
                <div className="contract-body">
                  <p>
                    <strong>Client:</strong> {contract.client_name}
                  </p>
                  <p>
                    <strong>Date:</strong> {contract.date}
                  </p>
                </div>
                <div className="contract-footer">
                  {contract.status === "Pending" ? (
                    <button
                      className="btn-sign"
                      onClick={() => handleSignContract(contract.id)}
                    >
                      Sign Contract
                    </button>
                  ) : (
                    <button className="btn-disabled" disabled>
                      Signed & Active
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Contracts;
