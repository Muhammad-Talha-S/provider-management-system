import React, { useMemo, useState } from "react";
import { createContractOffer} from "../api/contracts";
import type { Contract, CreateContractOfferPayload} from "../api/contracts";
import { useApp } from "../context/AppContext";

type Props = {
  contract: Contract;
  onSubmitted?: () => void;
};

function pretty(v: any) {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function safeParseJson(text: string): any {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  return JSON.parse(trimmed);
}

export const ContractOfferForm: React.FC<Props> = ({ contract, onSubmitted }) => {
  const { accessToken } = useApp();

  const snapshot = useMemo(() => {
    return contract.externalSnapshot ?? contract;
  }, [contract]);

  const [note, setNote] = useState("");
  const [responseJson, setResponseJson] = useState(pretty({ proposal: { note: "" } }));
  const [deltasJson, setDeltasJson] = useState(pretty([]));

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!accessToken) return;
    setError(null);

    let response: any = null;
    let deltas: any[] | null = null;

    try {
      response = safeParseJson(responseJson);
    } catch (e: any) {
      setError(`Response JSON is invalid: ${e?.message || ""}`);
      return;
    }

    try {
      const parsed = safeParseJson(deltasJson);
      if (parsed === null) {
        deltas = [];
      } else if (Array.isArray(parsed)) {
        deltas = parsed;
      } else {
        setError("Deltas must be a JSON array.");
        return;
      }
    } catch (e: any) {
      setError(`Deltas JSON is invalid: ${e?.message || ""}`);
      return;
    }

    const payload: CreateContractOfferPayload = {
      requestSnapshot: snapshot,
      response,
      deltas,
      note: note || undefined,
    };

    setLoading(true);
    try {
      await createContractOffer(accessToken, contract.id, payload);
      onSubmitted?.();
    } catch (e: any) {
      setError(e?.message || "Failed to submit offer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Contract snapshot (read-only)</div>
        <textarea
          value={pretty(snapshot)}
          readOnly
          rows={10}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Provider response (JSON)</div>
        <textarea
          value={responseJson}
          onChange={(e) => setResponseJson(e.target.value)}
          rows={10}
          style={{ width: "100%", fontFamily: "monospace" }}
          placeholder='{"proposal": {"pricing": {...}, "exceptions": [...]}}'
        />
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Deltas / requested changes (JSON array)</div>
        <textarea
          value={deltasJson}
          onChange={(e) => setDeltasJson(e.target.value)}
          rows={6}
          style={{ width: "100%", fontFamily: "monospace" }}
          placeholder='[{"path":"terms.paymentDays","op":"replace","value":30,"reason":"..."}]'
        />
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Note</div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ width: "100%" }} />
      </div>

      {error ? <div style={{ color: "crimson" }}>{error}</div> : null}

      <button disabled={!accessToken || loading} onClick={submit}>
        {loading ? "Submitting..." : "Submit contract offer"}
      </button>
    </div>
  );
};
