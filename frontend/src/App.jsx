import { useEffect, useState } from "react";

import { api } from "./api/client.js";
import Dashboard from "./pages/Dashboard.jsx";

const seedWorkers = [
  { name: "张师傅", phone: "13800000001", vehicle: "4.2米厢货", service_area: "浦东新区", rating: 4.9 },
  { name: "李师傅", phone: "13800000002", vehicle: "金杯面包车", service_area: "徐汇区", rating: 4.8 },
];

export default function App() {
  const [orders, setOrders] = useState([]);
  const [workers, setWorkers] = useState([]);

  async function refreshAll() {
    const [orderData, workerData] = await Promise.all([api.listOrders(), api.listWorkers()]);
    setOrders(orderData.orders);
    setWorkers(workerData.workers);
    if (workerData.workers.length === 0) {
      await Promise.all(seedWorkers.map((worker) => api.createWorker(worker)));
      const seeded = await api.listWorkers();
      setWorkers(seeded.workers);
    }
  }

  useEffect(() => {
    refreshAll().catch(() => {});
  }, []);

  return (
    <Dashboard orders={orders} workers={workers} onRefresh={refreshAll} />
  );
}
