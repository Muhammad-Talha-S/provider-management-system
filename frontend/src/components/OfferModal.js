// src/components/OfferModal.js
import React, { useState } from "react";
import "./OfferModal.css";

const OfferModal = ({ request, onClose, onSubmit }) => {
  // State for the offer form
  const [offer, setOffer] = useState({
    price: "",
    expertName: "",
    availabilityDate: "",
    comments: "",
  });

  const handleChange = (e) => {
    setOffer({ ...offer, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Send the data back to the parent component
    onSubmit(request.id, offer);
  };

  if (!request) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Submit Offer</h2>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="request-summary">
          <p>
            <strong>Role:</strong> {request.role}
          </p>
          <p>
            <strong>Skill:</strong> {request.skill}
          </p>
          <p>
            <strong>Duration:</strong> {request.duration}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Daily Rate (€):</label>
            <input
              type="number"
              name="price"
              required
              placeholder="e.g. 850"
              value={offer.price}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Expert Name / Profile URL:</label>
            <input
              type="text"
              name="expertName"
              required
              placeholder="Link to CV or Name"
              value={offer.expertName}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Earliest Start Date:</label>
            <input
              type="date"
              name="availabilityDate"
              required
              value={offer.availabilityDate}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Comments:</label>
            <textarea
              name="comments"
              rows="3"
              placeholder="Additional details..."
              value={offer.comments}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn">
              Send Offer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfferModal;
