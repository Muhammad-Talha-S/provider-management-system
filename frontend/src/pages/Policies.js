import React, { useState } from "react";
import Navbar from "../components/Navbar";
import "./Policies.css";

const Policies = () => {
  const [activeTab, setActiveTab] = useState("terms");

  return (
    <div className="policies-page">
      <Navbar />

      <div className="policies-container">
        <div className="policies-header">
          <h1>⚖️ Legal & Compliance Center</h1>
          <p>Current Version: 2.4 (Effective Dec 2025)</p>
        </div>

        <div className="policies-layout">
          {/* LEFT SIDEBAR NAVIGATION */}
          <div className="policies-sidebar">
            <button
              className={`nav-btn ${activeTab === "terms" ? "active" : ""}`}
              onClick={() => setActiveTab("terms")}
            >
              Terms & Conditions
            </button>
            <button
              className={`nav-btn ${activeTab === "privacy" ? "active" : ""}`}
              onClick={() => setActiveTab("privacy")}
            >
              Privacy Policy (GDPR)
            </button>
            <button
              className={`nav-btn ${activeTab === "sla" ? "active" : ""}`}
              onClick={() => setActiveTab("sla")}
            >
              SLA Guidelines
            </button>
          </div>

          {/* RIGHT CONTENT AREA */}
          <div className="policies-content">
            {/* --- TERMS & CONDITIONS --- */}
            {activeTab === "terms" && (
              <div className="document-body">
                <h2>Terms of Service</h2>
                <p className="last-updated">Last Updated: December 21, 2025</p>

                <h3>1. Introduction</h3>
                <p>
                  Welcome to the Group 4a Provider Portal. By accessing this
                  system, you agree to be bound by these Terms and Conditions.
                </p>

                <h3>2. Service Obligations</h3>
                <p>
                  Providers must maintain an availability rating of at least
                  95%. Failure to meet service obligations may result in
                  contract termination.
                </p>

                <h3>3. Payment Terms</h3>
                <p>
                  Invoices are processed on a Net-30 basis. All payments are
                  made in EUR (€) unless otherwise agreed in specific contract
                  addendums.
                </p>

                <h3>4. Intellectual Property</h3>
                <p>
                  All code, designs, and deliverables produced during the
                  contract period remain the property of the Client (Group 2)
                  upon full payment.
                </p>
              </div>
            )}

            {/* --- PRIVACY POLICY --- */}
            {activeTab === "privacy" && (
              <div className="document-body">
                <h2>Privacy Policy</h2>
                <p className="last-updated">Last Updated: December 10, 2025</p>

                <h3>1. Data Collection</h3>
                <p>
                  We collect basic company information, user logs, and
                  transaction history to facilitate contract management. We do
                  not sell your data to third parties.
                </p>

                <h3>2. GDPR Compliance</h3>
                <p>
                  As a German-based entity, we strictly adhere to the General
                  Data Protection Regulation (DSGVO). You have the right to
                  request a copy of your data or its deletion ("Right to be
                  Forgotten").
                </p>

                <h3>3. Data Security</h3>
                <p>
                  All sensitive data is encrypted at rest using AES-256
                  standards. Access logs are maintained for audit purposes for a
                  period of 12 months.
                </p>
              </div>
            )}

            {/* --- SLA GUIDELINES --- */}
            {activeTab === "sla" && (
              <div className="document-body">
                <h2>Service Level Agreement (SLA)</h2>
                <p className="last-updated">Last Updated: November 01, 2025</p>

                <h3>1. Response Times</h3>
                <ul>
                  <li>
                    <strong>Critical Priority:</strong> Response within 1 hour.
                  </li>
                  <li>
                    <strong>High Priority:</strong> Response within 4 hours.
                  </li>
                  <li>
                    <strong>Normal Priority:</strong> Response within 24 hours.
                  </li>
                </ul>

                <h3>2. Uptime Guarantee</h3>
                <p>
                  We guarantee 99.9% uptime for the Provider Portal. Maintenance
                  windows are scheduled for weekends (Saturday 02:00 - 04:00
                  CET).
                </p>

                <h3>3. Penalties</h3>
                <p>
                  If uptime falls below 99.0% in a given month, a 5% credit will
                  be applied to the next invoice.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Policies;
