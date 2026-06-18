import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";

const STAGE_ORDER = [
  "created",
  "claimed",
  "assigned",
  "departed",
  "loading",
  "in_transit",
  "unloading",
  "completed",
];

const STAGE_LABELS = {
  created: "已预约",
  claimed: "已抢单",
  assigned: "已派单",
  departed: "已出发",
  loading: "装车中",
  in_transit: "运输中",
  unloading: "卸货中",
  completed: "已完成",
};

const TRACKABLE_STAGES = [
  ["departed", "已出发"],
  ["loading", "装车中"],
  ["in_transit", "运输中"],
  ["unloading", "卸货中"],
  ["completed", "已完成"],
];

function getStageIndex(stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? -1 : idx;
}

function getValidNextStages(currentStage) {
  const currentIdx = getStageIndex(currentStage);
  const completedIdx = getStageIndex("completed");
  if (currentIdx >= completedIdx) return [];
  const nextIdx = currentIdx + 1;
  if (nextIdx < STAGE_ORDER.length) return [STAGE_ORDER[nextIdx]];
  return [];
}

function canTransition(currentStage, nextStage) {
  const currentIdx = getStageIndex(currentStage);
  const nextIdx = getStageIndex(nextStage);
  if (nextIdx === -1) return false;
  if (currentStage === undefined || currentStage === null) return nextIdx <= getStageIndex("assigned");
  if (currentIdx >= getStageIndex("completed")) return false;
  return nextIdx === currentIdx + 1;
}

export default function TrackingPanel({ orders, onProgress }) {
  const activeOrders = orders.filter((order) => order.status !== "completed");
  const [orderId, setOrderId] = useState("");
  const [stage, setStage] = useState("departed");
  const [localError, setLocalError] = useState("");

  const selectedOrder = orders.find((o) => String(o.id) === String(orderId));
  const currentStage = selectedOrder?.current_stage;

  const validNextStages = getValidNextStages(currentStage);
  const availableStages = TRACKABLE_STAGES.filter(([value]) => validNextStages.includes(value));

  useEffect(() => {
    setLocalError("");
    if (availableStages.length > 0 && !availableStages.find(([v]) => v === stage)) {
      setStage(availableStages[0][0]);
    }
  }, [orderId]);

  async function submit(event) {
    event.preventDefault();
    setLocalError("");
    if (!orderId) {
      setLocalError("请先选择订单");
      return;
    }
    if (!canTransition(currentStage, stage)) {
      const currentLabel = STAGE_LABELS[currentStage] || currentStage || "未知";
      const stageLabel = STAGE_LABELS[stage] || stage;
      const validLabels = validNextStages.map((s) => STAGE_LABELS[s] || s);
      if (getStageIndex(currentStage) >= getStageIndex("completed")) {
        setLocalError("订单已完成，无法继续更新进度");
      } else {
        let msg = `非法进度跳转：当前状态「${currentLabel}」不能直接提交「${stageLabel}」`;
        if (validLabels.length > 0) {
          msg += `，合法的下一步为：${validLabels.join("、")}`;
        }
        setLocalError(msg);
      }
      return;
    }
    const label = STAGE_LABELS[stage] || stage;
    await onProgress(Number(orderId), { stage, message: `师傅更新进度：${label}` });
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <MapPin size={20} />
        <h3>进度跟踪</h3>
      </div>
      {localError && <div className="form-error" style={{ marginBottom: 12, color: "#dc2626", fontSize: 14 }}>{localError}</div>}
      <form className="inline-form" onSubmit={submit}>
        <select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
          <option value="">选择订单</option>
          {activeOrders.map((order) => (
            <option value={order.id} key={order.id}>
              {order.customer_name} · {order.origin}（{order.current_stage_label}）
            </option>
          ))}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value)} disabled={availableStages.length === 0}>
          {availableStages.length === 0 ? (
            <option value="">无可用进度</option>
          ) : (
            availableStages.map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))
          )}
        </select>
        <button className="primary-button" type="submit" disabled={!orderId || availableStages.length === 0}>
          更新进度
        </button>
      </form>
      <div className="timeline">
        {orders.slice(0, 4).map((order) => (
          <div className="timeline-item" key={order.id}>
            <span />
            <div>
              <strong>{order.customer_name}</strong>
              <p>{order.current_stage_label || order.status_label} · {order.assigned_to?.name || order.claimed_by?.name || "待安排"}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
