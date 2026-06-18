import json

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from orders.models import MoveOrder
from workers.models import Worker

from .models import ProgressEvent


def event_to_dict(event):
    return {
        "id": event.id,
        "order_id": event.order_id,
        "stage": event.stage,
        "stage_label": event.get_stage_display(),
        "message": event.message,
        "created_at": event.created_at.isoformat(),
    }


def get_order_current_stage(order):
    last_event = order.progress_events.order_by("-created_at").first()
    if last_event:
        return last_event.stage
    if order.status == MoveOrder.STATUS_PENDING:
        return ProgressEvent.STAGE_CREATED
    if order.status == MoveOrder.STATUS_CLAIMED:
        return ProgressEvent.STAGE_CLAIMED
    if order.status == MoveOrder.STATUS_ASSIGNED:
        return ProgressEvent.STAGE_ASSIGNED
    if order.status == MoveOrder.STATUS_COMPLETED:
        return ProgressEvent.STAGE_COMPLETED
    return None


@csrf_exempt
@require_http_methods(["POST"])
def add_progress(request, order_id):
    order = get_object_or_404(MoveOrder, pk=order_id)
    payload = json.loads(request.body.decode("utf-8"))
    worker = None
    if payload.get("worker_id"):
        worker = get_object_or_404(Worker, pk=payload["worker_id"])

    stage = payload["stage"]

    current_stage = get_order_current_stage(order)
    if not ProgressEvent.can_transition(current_stage, stage):
        current_label = dict(ProgressEvent.STAGE_CHOICES).get(current_stage, current_stage or "未知")
        stage_label = dict(ProgressEvent.STAGE_CHOICES).get(stage, stage)
        valid_next = ProgressEvent.get_valid_next_stages(current_stage)
        valid_labels = [dict(ProgressEvent.STAGE_CHOICES).get(s, s) for s in valid_next]
        current_idx = ProgressEvent.get_stage_index(current_stage)
        completed_idx = ProgressEvent.get_stage_index(ProgressEvent.STAGE_COMPLETED)
        if current_idx >= completed_idx:
            error_msg = f"订单已完成，无法继续更新进度"
        else:
            error_msg = f"非法进度跳转：当前状态「{current_label}」不能直接提交「{stage_label}」"
            if valid_labels:
                error_msg += f"，合法的下一步为：{'、'.join(valid_labels)}"
        return JsonResponse({"error": error_msg}, status=400)

    event = ProgressEvent.objects.create(
        order=order,
        worker=worker,
        stage=stage,
        message=payload.get("message") or dict(ProgressEvent.STAGE_CHOICES).get(stage, stage),
    )
    if stage == ProgressEvent.STAGE_COMPLETED:
        order.status = MoveOrder.STATUS_COMPLETED
    elif stage in [ProgressEvent.STAGE_DEPARTED, ProgressEvent.STAGE_LOADING, ProgressEvent.STAGE_IN_TRANSIT, ProgressEvent.STAGE_UNLOADING]:
        order.status = MoveOrder.STATUS_IN_PROGRESS
    order.save(update_fields=["status", "updated_at"])
    return JsonResponse(event_to_dict(event), status=201)
