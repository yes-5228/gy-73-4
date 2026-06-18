import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client.js";

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

export default function TrackingPanel({ orders, onRefresh }) {
  const activeOrders = orders.filter((order) => order.status !== "completed");
  const [orderId, setOrderId] = useState("");
  const [stage, setStage] = useState("departed");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find((o) => String(o.id) === String(orderId)),
    [orders, orderId]
  );
  const currentStage = selectedOrder?.current_stage;

  const validNextStages = useMemo(
    () => getValidNextStages(currentStage),
    [currentStage]
  );
  const availableStages = useMemo(
    () => TRACKABLE_STAGES.filter(([value]) => validNextStages.includes(value)),
    [validNextStages]
  );

  useEffect(() => {
    setErrorMsg("");
    const nextStages = getValidNextStages(currentStage);
    const nextTrackable = TRACKABLE_STAGES.filter(([value]) => nextStages.includes(value));
    if (nextTrackable.length > 0) {
      const firstValue = nextTrackable[0][0];
      setStage((prev) => (prev !== firstValue ? firstValue : prev));
    }
  }, [orderId, currentStage]);

  async function submit(event) {
    event.preventDefault();
    setErrorMsg("");

    if (!orderId) {
      setErrorMsg("请先选择订单");
      return;
    }
    if (!canTransition(currentStage, stage)) {
      const currentLabel = STAGE_LABELS[currentStage] || currentStage || "未知";
      const stageLabel = STAGE_LABELS[stage] || stage;
      const validLabels = validNextStages.map((s) => STAGE_LABELS[s] || s);
      if (getStageIndex(currentStage) >= getStageIndex("completed")) {
        setErrorMsg("订单已完成，无法继续更新进度");
      } else {
        let msg = `非法进度跳转：当前状态「${currentLabel}」不能直接提交「${stageLabel}」`;
        if (validLabels.length > 0) {
          msg += `，合法的下一步为：${validLabels.join("、")}`;
        }
        setErrorMsg(msg);
      }
      return;
    }

    setSubmitting(true);
    try {
      const label = STAGE_LABELS[stage] || stage;
      await api.addProgress(Number(orderId), { stage, message: `师傅更新进度：${label}` });
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setErrorMsg(err.message || "更新失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <MapPin size={20} />
        <h3>进度跟踪</h3>
      </div>
      {errorMsg && (
        <div className="panel-error" style={{
          marginBottom: 12,
          padding: "10px 12px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: 8,
          color: "#dc2626",
          fontSize: 14,
        }}>
          {errorMsg}
        </div>
      )}
      <form className="inline-form" onSubmit={submit}>
        <select
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          disabled={submitting}
        >
          <option value="">选择订单</option>
          {activeOrders.map((order) => (
            <option value={order.id} key={order.id}>
              {order.customer_name} · {order.origin}（{order.current_stage_label}）
            </option>
          ))}
        </select>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          disabled={availableStages.length === 0 || submitting}
        >
          {availableStages.length === 0 ? (
            <option value="">无可用进度</option>
          ) : (
            availableStages.map(([value, label]) => (
              <option value={value} key={value}>{label}</option>
            ))
          )}
        </select>
        <button
          className="primary-button"
          type="submit"
          disabled={!orderId || availableStages.length === 0 || submitting}
        >
          {submitting ? "提交中…" : "更新进度"}
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
