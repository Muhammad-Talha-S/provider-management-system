import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios"; // <--- The Bridge to Backend
import { toast } from "react-toastify";
import "./ServiceRequests.css";

const ServiceRequests = () => {
  const [requests, setRequests] = useState([]);

  // 1. Fetch Real Data from Django when the page loads
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await api.get("/service-requests/");
        setRequests(response.data);
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast.error("Could not load new jobs.");
      }
    };

    fetchRequests();
  }, []);

  const handleSubmitOffer = async (id) => {
    try {
      // 2. Send the "Offer" to the Backend (which sends to Group 3)
      // Note: We send dummy price/availability for now
      const offerData = {
        price: 15000,
        availability: "Immediate",
        expert_profile: "Senior Dev",
      };

      await api.post(`/submit-offer/${id}/`, offerData);

      toast.success("Offer Sent Successfully! 🚀");

      // Update the UI locally to show "Offer Sent"
      setRequests(
        requests.map((req) =>
          req.id === id ? { ...req, status: "Offer Sent" } : req
        )
      );
    } catch (error) {
      console.error("Error sending offer:", error);
      // If the simulation fails, we show an error
      toast.error("Failed to submit offer.");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="requests-container">
        <h1>Incoming Service Requests</h1>
        <p>New job opportunities from the Service Management Tool (Group 3)</p>

        <div className="request-list">
          {requests.length === 0 ? (
            <p>No open requests at the moment.</p>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="card-header">
                  <h3>{request.role}</h3>
                  <span
                    className={`status-badge status-${request.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {request.status}
                  </span>
                </div>
                <div className="card-body">
                  <p>
                    <strong>Skill Required:</strong> {request.skill}
                  </p>
                  <p>
                    <strong>Duration:</strong> {request.duration}
                  </p>
                  <p>
                    <strong>Start Date:</strong> {request.start_date}
                  </p>
                </div>
                <div className="card-footer">
                  {request.status === "Open" ? (
                    <button
                      className="btn-offer"
                      onClick={() => handleSubmitOffer(request.id)}
                    >
                      Submit Offer
                    </button>
                  ) : (
                    <button className="btn-disabled" disabled>
                      Offer Submitted
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

export default ServiceRequests;
