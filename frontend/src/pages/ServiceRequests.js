import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { toast } from "react-toastify";
import "./ServiceRequests.css";

const ServiceRequests = () => {
  const [requests, setRequests] = useState([]);
  const [experts, setExperts] = useState([]);

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedExpertId, setSelectedExpertId] = useState("");
  const [offerPrice, setOfferPrice] = useState("");

  // 1. Fetch Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const reqRes = await api.get("/service-requests/");
      const expRes = await api.get("/experts/");
      setRequests(reqRes.data);
      setExperts(expRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Handle Inputs
  const handleExpertChange = (e) => {
    const expertId = e.target.value;
    setSelectedExpertId(expertId);
    const expert = experts.find((ex) => ex.id === parseInt(expertId));
    if (expert) setOfferPrice(expert.rate);
  };

  // 3. Submit Offer
  const handleSubmitOffer = async () => {
    const expert = experts.find((ex) => ex.id === parseInt(selectedExpertId));
    if (!expert) return toast.error("Please select an expert");

    try {
      await api.post(`/submit-offer/${selectedRequest.id}/`, {
        price: offerPrice,
        expert_name: expert.name,
        status: "Offer Sent",
      });

      toast.success("Offer Sent Successfully!");
      setSelectedRequest(null);

      // RELOAD DATA to immediately move the card to the other list
      loadData();
    } catch (error) {
      toast.error("Failed to send offer");
    }
  };

  // --- FILTERS ---
  // Split the list into two groups
  const newRequests = requests.filter((req) => req.status !== "Offer Sent");
  const historyRequests = requests.filter((req) => req.status === "Offer Sent");

  return (
    <div>
      <Navbar />
      <div className="requests-container">
        {/* SECTION 1: ACTION NEEDED */}
        <div className="section-header">
          <h1>📥 New Requests</h1>
          <p className="subtitle">Action required on these items</p>
        </div>

        {newRequests.length === 0 ? (
          <p className="empty-state">No new requests pending.</p>
        ) : (
          <div className="request-list">
            {newRequests.map((req) => (
              <div key={req.id} className="request-card active-card">
                <div className="card-header">
                  <h3>{req.role} Needed</h3>
                  <span className="badge-new">New</span>
                </div>
                <p>
                  <strong>Skill:</strong> {req.skill}
                </p>
                <p>
                  <strong>Duration:</strong> {req.duration}
                </p>
                <button
                  className="btn-offer"
                  onClick={() => setSelectedRequest(req)}
                >
                  Create Offer
                </button>
              </div>
            ))}
          </div>
        )}

        <hr className="divider" />

        {/* SECTION 2: HISTORY */}
        <div className="section-header">
          <h1>✅ Submitted Offers</h1>
          <p className="subtitle">Waiting for Group 3 to respond</p>
        </div>

        <div className="request-list">
          {historyRequests.map((req) => (
            <div key={req.id} className="request-card history-card">
              <div className="card-header">
                <h3>{req.role}</h3>
                <span className="badge-sent">Offer Sent</span>
              </div>
              <p>
                <strong>Skill:</strong> {req.skill}
              </p>
              <div className="status-message">⏳ Pending Client Review</div>
            </div>
          ))}
        </div>

        {/* --- MODAL (Same as before) --- */}
        {selectedRequest && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2>Submit Offer for {selectedRequest.role}</h2>
              <label>Select Expert:</label>
              <select className="input-field" onChange={handleExpertChange}>
                <option value="">-- Choose from Inventory --</option>
                {experts.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.name} ({exp.role})
                  </option>
                ))}
              </select>
              <label>Hourly Rate (€):</label>
              <input
                type="number"
                className="input-field"
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setSelectedRequest(null)}
                >
                  Cancel
                </button>
                <button className="btn-submit" onClick={handleSubmitOffer}>
                  Send Offer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceRequests;
