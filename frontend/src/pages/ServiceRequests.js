// src/pages/ServiceRequests.js
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";

const ServiceRequests = () => {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await api.get("/service-requests/");
        setRequests(response.data);
      } catch (error) {
        console.error("Error fetching requests", error);

        // --- MOCK DATA (Use this until Group 3 API is ready) ---
        setRequests([
          {
            id: 1,
            role: "Frontend Dev",
            skill: "React",
            duration: "3 Months",
            start_date: "2025-01-01",
          },
          {
            id: 2,
            role: "Backend Dev",
            skill: "Python",
            duration: "6 Months",
            start_date: "2025-02-15",
          },
          {
            id: 3,
            role: "DevOps",
            skill: "Azure",
            duration: "12 Months",
            start_date: "2025-03-01",
          },
        ]);
        // -----------------------------------------------------
      }
    };
    fetchRequests();
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ padding: "20px" }}>
        <h1>Incoming Service Requests</h1>
        <table
          border="1"
          cellPadding="10"
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr style={{ background: "#f2f2f2" }}>
              <th>ID</th>
              <th>Role</th>
              <th>Required Skill</th>
              <th>Duration</th>
              <th>Start Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td>{req.id}</td>
                <td>{req.role}</td>
                <td>{req.skill}</td>
                <td>{req.duration}</td>
                <td>{req.start_date}</td>
                <td>
                  <button
                    style={{
                      cursor: "pointer",
                      background: "#007bff",
                      color: "white",
                      border: "none",
                      padding: "5px 10px",
                    }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServiceRequests;
