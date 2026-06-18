from django.db import models


class ProgressEvent(models.Model):
    STAGE_CREATED = "created"
    STAGE_CLAIMED = "claimed"
    STAGE_ASSIGNED = "assigned"
    STAGE_DEPARTED = "departed"
    STAGE_LOADING = "loading"
    STAGE_IN_TRANSIT = "in_transit"
    STAGE_UNLOADING = "unloading"
    STAGE_COMPLETED = "completed"
    STAGE_CHOICES = [
        (STAGE_CREATED, "已预约"),
        (STAGE_CLAIMED, "已抢单"),
        (STAGE_ASSIGNED, "已派单"),
        (STAGE_DEPARTED, "已出发"),
        (STAGE_LOADING, "装车中"),
        (STAGE_IN_TRANSIT, "运输中"),
        (STAGE_UNLOADING, "卸货中"),
        (STAGE_COMPLETED, "已完成"),
    ]

    STAGE_ORDER = [
        STAGE_CREATED,
        STAGE_CLAIMED,
        STAGE_ASSIGNED,
        STAGE_DEPARTED,
        STAGE_LOADING,
        STAGE_IN_TRANSIT,
        STAGE_UNLOADING,
        STAGE_COMPLETED,
    ]

    order = models.ForeignKey("orders.MoveOrder", related_name="progress_events", on_delete=models.CASCADE)
    worker = models.ForeignKey("workers.Worker", null=True, blank=True, on_delete=models.SET_NULL)
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES)
    message = models.CharField(max_length=220)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.order_id} - {self.get_stage_display()}"

    @classmethod
    def get_stage_index(cls, stage):
        try:
            return cls.STAGE_ORDER.index(stage)
        except ValueError:
            return -1

    @classmethod
    def can_transition(cls, current_stage, next_stage):
        current_idx = cls.get_stage_index(current_stage)
        next_idx = cls.get_stage_index(next_stage)
        if next_idx == -1:
            return False
        if current_stage is None:
            return next_idx <= cls.get_stage_index(cls.STAGE_ASSIGNED)
        if current_idx >= cls.get_stage_index(cls.STAGE_COMPLETED):
            return False
        return next_idx == current_idx + 1

    @classmethod
    def get_valid_next_stages(cls, current_stage):
        if current_stage is None:
            current_idx = -1
        else:
            current_idx = cls.get_stage_index(current_stage)
        if current_idx >= cls.get_stage_index(cls.STAGE_COMPLETED):
            return []
        next_idx = current_idx + 1
        if next_idx < len(cls.STAGE_ORDER):
            return [cls.STAGE_ORDER[next_idx]]
        return []

    @classmethod
    def get_order_current_stage(cls, order):
        from orders.models import MoveOrder

        progress_events = getattr(order, "_prefetched_progress_events", None)
        if progress_events is not None:
            if progress_events:
                last_event = max(progress_events, key=lambda e: e.created_at)
                return last_event.stage
        else:
            last_event = order.progress_events.order_by("-created_at").first()
            if last_event:
                return last_event.stage

        if order.status == MoveOrder.STATUS_PENDING:
            return cls.STAGE_CREATED
        if order.status == MoveOrder.STATUS_CLAIMED:
            return cls.STAGE_CLAIMED
        if order.status == MoveOrder.STATUS_ASSIGNED:
            return cls.STAGE_ASSIGNED
        if order.status == MoveOrder.STATUS_COMPLETED:
            return cls.STAGE_COMPLETED
        return None
