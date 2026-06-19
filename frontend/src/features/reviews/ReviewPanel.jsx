import { Star } from "lucide-react";
import { useState } from "react";
import { api } from "../../api/client.js";

const panelErrorStyle = {
  marginBottom: 12,
  padding: "10px 12px",
  background: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: 8,
  color: "#dc2626",
  fontSize: 14,
};

export default function ReviewPanel({ orders, onRefresh }) {
  const completedOrders = orders.filter((order) => order.status === "completed");
  const [orderId, setOrderId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function submit(event) {
    event.preventDefault();
    setErrorMsg("");
    if (!orderId) {
      setErrorMsg("请先选择订单");
      return;
    }
    setSubmitting(true);
    try {
      await api.createReview(Number(orderId), { rating: Number(rating), comment });
      setComment("");
      setOrderId("");
      if (onRefresh) await onRefresh();
    } catch (err) {
      setErrorMsg(err.message || "提交评价失败，请重试");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <div className="panel-title">
        <Star size={20} />
        <h3>完成评价</h3>
      </div>
      {errorMsg && <div style={panelErrorStyle}>{errorMsg}</div>}
      <form className="review-form" onSubmit={submit}>
        <select value={orderId} onChange={(e) => setOrderId(e.target.value)} disabled={submitting}>
          <option value="">选择已完成订单</option>
          {completedOrders.map((order) => (
            <option value={order.id} key={order.id}>{order.customer_name} · {order.destination}</option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max="5"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          disabled={submitting}
        />
        <textarea
          rows="3"
          placeholder="客户评价"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={submitting}
        />
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "提交中…" : "提交评价"}
        </button>
      </form>
    </div>
  );
}
