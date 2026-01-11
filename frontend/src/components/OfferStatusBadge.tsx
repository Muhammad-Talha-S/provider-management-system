import React from "react";

export const OfferStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const base = "inline-flex items-center px-2 py-1 rounded text-xs border";

  const cls =
    status === "Submitted"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : status === "Countered"
      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
      : status === "Accepted"
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "Rejected"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  return <span className={`${base} ${cls}`}>{status}</span>;
};

export default OfferStatusBadge;
