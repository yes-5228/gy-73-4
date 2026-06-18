from tracking.models import ProgressEvent
from reviews.models import ServiceReview


def worker_summary(worker):
    if not worker:
        return None
    return {
        "id": worker.id,
        "name": worker.name,
        "phone": worker.phone,
        "vehicle": worker.vehicle,
        "rating": float(worker.rating),
    }


def order_to_dict(order, include_detail=False):
    current_stage = ProgressEvent.get_order_current_stage(order)
    data = {
        "id": order.id,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "origin": order.origin,
        "destination": order.destination,
        "move_date": order.move_date.isoformat(),
        "move_time": order.move_time.strftime("%H:%M"),
        "items": order.items,
        "note": order.note,
        "status": order.status,
        "status_label": order.get_status_display(),
        "current_stage": current_stage,
        "current_stage_label": dict(ProgressEvent.STAGE_CHOICES).get(current_stage, current_stage or "未知"),
        "claimed_by": worker_summary(order.claimed_by),
        "assigned_to": worker_summary(order.assigned_to),
        "created_at": order.created_at.isoformat(),
        "updated_at": order.updated_at.isoformat(),
    }
    if include_detail:
        progress_events = getattr(order, "_prefetched_progress_events", None)
        if progress_events is None:
            progress_events = list(ProgressEvent.objects.filter(order=order))
        data["progress"] = [
            {
                "id": event.id,
                "stage": event.stage,
                "stage_label": event.get_stage_display(),
                "message": event.message,
                "created_at": event.created_at.isoformat(),
            }
            for event in progress_events
        ]
        review = ServiceReview.objects.filter(order=order).first()
        data["review"] = (
            {
                "id": review.id,
                "rating": review.rating,
                "comment": review.comment,
                "created_at": review.created_at.isoformat(),
            }
            if review
            else None
        )
    return data
