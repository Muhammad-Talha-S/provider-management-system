import React, { useState } from "react";
import type { CreateContractOfferPayload } from "../api/contracts";

export const ContractOfferForm: React.FC<{
  onSubmit: (payload: CreateContractOfferPayload) => Promise<void>;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [note, setNote] = useState("");
  const [proposedDailyRate, setProposedDailyRate] = useState<string>("");
  const [proposedTerms, setProposedTerms] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload: CreateContractOfferPayload = {
        note: note.trim() || undefined,
        proposedDailyRate: proposedDailyRate ? Number(proposedDailyRate) : null,
        proposedTerms: proposedTerms.trim() || null,
      };
      await onSubmit(payload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-500 block mb-1">Proposed Daily Rate (optional)</label>
        <input
          value={proposedDailyRate}
          onChange={(e) => setProposedDailyRate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="e.g. 850"
          inputMode="decimal"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Offer Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          rows={3}
          placeholder="Short summary of your offer..."
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Proposed Terms (optional)</label>
        <textarea
          value={proposedTerms}
          onChange={(e) => setProposedTerms(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          rows={4}
          placeholder="Any proposed changes to terms..."
        />
      </div>

      <div className="flex gap-2">
        <button
          disabled={loading}
          onClick={handleSubmit}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit Offer"}
        </button>
        <button
          disabled={loading}
          onClick={onCancel}
          className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ContractOfferForm;
