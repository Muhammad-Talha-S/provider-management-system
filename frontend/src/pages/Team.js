import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import "./Team.css";

const Team = () => {
  const [experts, setExperts] = useState([]);

  useEffect(() => {
    api
      .get("/experts/")
      .then((res) => setExperts(res.data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <Navbar />
      <div className="team-container">
        <div className="header-section">
          <h1>Our Experts</h1>
          <p>Manage your pool of IT talent and their hourly rates.</p>
        </div>

        <div className="expert-grid">
          {experts.map((expert) => (
            <div key={expert.id} className="expert-card">
              <div className="expert-avatar">{expert.name.charAt(0)}</div>
              <div className="expert-info">
                <h3>{expert.name}</h3>
                <span className="role-badge">{expert.role}</span>
                <div className="rate-info">
                  <span className="label">Hourly Rate:</span>
                  <span className="value">€{expert.rate}</span>
                </div>
                <span className={`status-dot ${expert.status.toLowerCase()}`}>
                  {expert.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Team;
