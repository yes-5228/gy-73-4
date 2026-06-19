import { UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client.js";

import StatusBadge from "../../components/StatusBadge.jsx";

const panelErrorStyle = {
  marginBottom: 12,
  padding: "10px 12px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  color: "#dc2626",
  fontSize: 14,
};

const initialWorker = {
  name: "",
  phone: "",
  vehicle: "",
  service_area: "",
  rating: 5,
};

export default function WorkerPanel({ workers, onRefresh }) {
  const [form, setForm] = useState(initialWorker);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      await api.createWorker(form);
      setForm(initialWorker);
      if (onRefresh) await onRefresh();
    } catch (err) {
      setErrorMsg(err.message || "新增师傅失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <Users size={20} />
        <h3>师傅管理</h3>
      </div>
      {errorMsg && <div style={panelErrorStyle}>{errorMsg}</div>}
      <form className="worker-form" onSubmit={submit}>
        <input placeholder="姓名" value={form.name} onChange={(e) => update("name", e.target.value)} required disabled={submitting} />
        <input placeholder="电话" value={form.phone} onChange={(e) => update("phone", e.target.value)} required disabled={submitting} />
        <input placeholder="车辆" value={form.vehicle} onChange={(e) => update("vehicle", e.target.value)} required disabled={submitting} />
        <input placeholder="服务区域" value={form.service_area} onChange={(e) => update("service_area", e.target.value)} disabled={submitting} />
        <button className="icon-button" type="submit" title="新增师傅" disabled={submitting}>
          <UserPlus size={18} />
        </button>
      </form>
      <div className="worker-list">
        {workers.map((worker) => (
          <div className="worker-row" key={worker.id}>
            <div>
              <strong>{worker.name}</strong>
              <p>{worker.vehicle} · {worker.service_area}</p>
            </div>
            <div className="worker-meta">
              <span>{worker.rating.toFixed(1)} 星</span>
              <StatusBadge status={worker.status} label={worker.status_label} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
