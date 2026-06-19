import { ClipboardList, Truck } from "lucide-react";
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

export default function OrderBoard({ orders, workers, onRefresh }) {
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function runAction(orderId, label, action) {
    setErrorMsg("");
    setBusyOrderId(orderId);
    try {
      await action();
      if (onRefresh) await onRefresh();
    } catch (err) {
      setErrorMsg(`${label}失败：${err.message || "请重试"}`);
    } finally {
      setBusyOrderId(null);
    }
  }

  const isBusy = (orderId) => busyOrderId !== null && String(busyOrderId) === String(orderId);

  return (
    <div className="panel">
      <div className="panel-title">
        <ClipboardList size={20} />
        <h3>订单池与派单</h3>
      </div>
      {errorMsg && <div style={panelErrorStyle}>{errorMsg}</div>}
      <div className="order-list">
        {orders.map((order) => {
          const busy = isBusy(order.id);
          return (
            <article className="order-card" key={order.id}>
              <div className="order-card-head">
                <div>
                  <h4>{order.customer_name}</h4>
                  <p>{order.move_date} {order.move_time}</p>
                </div>
                <StatusBadge status={order.status} label={order.status_label} />
              </div>
              <div className="route">
                <span>{order.origin}</span>
                <Truck size={16} />
                <span>{order.destination}</span>
              </div>
              <p className="muted">物品：{order.items || "未填写"}</p>
              <div className="assignment">
                <span>抢单师傅：{order.claimed_by?.name || "暂无"}</span>
                <span>派单师傅：{order.assigned_to?.name || "暂无"}</span>
              </div>
              <div className="button-row">
                <select
                  aria-label="选择抢单师傅"
                  defaultValue=""
                  disabled={order.status !== "pending" || busy}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const workerId = Number(e.target.value);
                    const select = e.target;
                    runAction(order.id, "抢单", () => api.claimOrder(order.id, workerId))
                      .finally(() => { select.value = ""; });
                  }}
                >
                  <option value="">师傅抢单</option>
                  {workers.map((worker) => (
                    <option value={worker.id} key={worker.id}>{worker.name}</option>
                  ))}
                </select>
                <select
                  aria-label="选择派单师傅"
                  defaultValue=""
                  disabled={(order.status === "completed" || order.status === "in_progress") || busy}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const workerId = Number(e.target.value);
                    const select = e.target;
                    runAction(order.id, "派单", () => api.assignOrder(order.id, workerId))
                      .finally(() => { select.value = ""; });
                  }}
                >
                  <option value="">平台派单</option>
                  {workers.map((worker) => (
                    <option value={worker.id} key={worker.id}>{worker.name}</option>
                  ))}
                </select>
              </div>
            </article>
          );
        })}
        {orders.length === 0 && <p className="empty">暂无订单</p>}
      </div>
    </div>
  );
}
