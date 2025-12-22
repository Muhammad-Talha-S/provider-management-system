import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { toast } from "react-toastify";
import "./Contracts.css";

const Contracts = () => {
  const [contracts, setContracts] = useState([]);

  // Modal State
  const [selectedContract, setSelectedContract] = useState(null);
  const [proposalText, setProposalText] = useState("");

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await api.get("/contracts/");
      setContracts(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSign = async (id) => {
    try {
      await api.post(`/sign-contract/${id}/`);
      toast.success("✍️ Contract Signed!");
      fetchContracts(); // Reload list
    } catch (error) {
      toast.error("Failed to sign.");
    }
  };

  const handleNegotiateSubmit = async () => {
    if (!proposalText) return toast.warning("Please type your changes.");

    try {
      await api.post(`/negotiate-contract/${selectedContract.id}/`, {
        proposal: proposalText,
      });
      toast.info("🔄 Counter-offer sent to Group 2!");
      setSelectedContract(null); // Close modal
      setProposalText("");
      fetchContracts(); // Reload list
    } catch (error) {
      toast.error("Failed to send counter-offer.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="contracts-container">
        <h1>Contract Management</h1>
        <p className="subtitle">Review, Sign, or Negotiate legal agreements.</p>

        <div className="contract-list">
          {contracts.map((contract) => (
            <div
              key={contract.id}
              className={`contract-card ${contract.status.toLowerCase()}`}
            >
              <div className="card-header">
                <h3>📄 {contract.title}</h3>
                <span
                  className={`status-badge ${contract.status.toLowerCase()}`}
                >
                  {contract.status}
                </span>
              </div>

              <p>
                <strong>Client:</strong> {contract.client_name}
              </p>
              <p>
                <strong>Date:</strong> {contract.date}
              </p>

              {/* Logic for Buttons */}
              <div className="card-actions">
                {contract.status === "Pending" && (
                  <>
                    <button
                      className="btn-negotiate"
                      onClick={() => setSelectedContract(contract)}
                    >
                      Modify / Counter-Offer
                    </button>
                    <button
                      className="btn-sign"
                      onClick={() => handleSign(contract.id)}
                    >
                      Sign Agreement
                    </button>
                  </>
                )}

                {contract.status === "Negotiation" && (
                  <p className="wait-msg">⏳ Waiting for Client Response...</p>
                )}

                {contract.status === "Signed" && (
                  <p className="success-msg">✅ Legally Binding</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* --- NEGOTIATION MODAL --- */}
        {selectedContract && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Negotiate: {selectedContract.title}</h2>
              <p>
                Describe the changes you require (e.g., price, date, scope).
              </p>

              <textarea
                className="input-field"
                rows="5"
                placeholder="Example: We require a rate of €95/hr instead of €85..."
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
              />

              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setSelectedContract(null)}
                >
                  Cancel
                </button>
                <button className="btn-submit" onClick={handleNegotiateSubmit}>
                  Send Counter-Offer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contracts;
