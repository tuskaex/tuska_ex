"""Admin Dashboard Service — stats and revenue series.

Every figure here is either platform-wide or pool-scoped, decided by the
`scope_ids` argument: `None` means the caller sees the whole platform (admin /
super_admin), a subquery of user ids means they see only their own clients.

That argument is what lets a white-label sub-admin have a dashboard at all.
Without it these numbers are the PLATFORM's — total users across every tenant,
platform P&L, every tenant's pending deposits — and showing them to one tenant
would hand them a live readout of a competitor's book.
"""
from datetime import datetime, timedelta, date

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.models import (
    User, Position, Deposit, Withdrawal, Transaction, SupportTicket, PositionStatus,
    TradingAccount,
)
from packages.common.src.admin_schemas import (
    DashboardStats, DashboardRevenueSeries, DashboardRevenuePoint,
)


def _accounts_in_scope(scope_ids):
    """Trading-account ids belonging to the caller's pool.

    Position and TradeHistory key on `account_id`, not `user_id`, so a pool
    filter has to hop through trading_accounts.
    """
    return select(TradingAccount.id).where(TradingAccount.user_id.in_(scope_ids))


async def get_dashboard_stats(db: AsyncSession, scope_ids=None) -> DashboardStats:
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    from packages.common.src.models import TradingAccount

    # Total Users: real trader accounts only. Exclude every staff role
    # (admin / super_admin / employee / manager / support) AND the shared
    # demo user — those shouldn't inflate the customer count on the
    # dashboard.
    total_users_stmt = select(func.count(User.id)).where(
        User.role.notin_(["admin", "super_admin", "employee", "manager", "support"]),
        User.is_demo == False,  # noqa: E712 — SQLAlchemy needs literal False
    )
    if scope_ids is not None:
        total_users_stmt = total_users_stmt.where(User.id.in_(scope_ids))
    total_users_q = await db.execute(total_users_stmt)
    total_users = total_users_q.scalar() or 0

    # Active Traders: distinct users who traded in the last 30 days
    # (opened a position OR closed a trade). Broader than "has open position now".
    from packages.common.src.models import TradeHistory
    thirty_days_ago = today_start - timedelta(days=30)

    # Users with positions opened in last 30 days
    open_users_q = (
        select(TradingAccount.user_id)
        .select_from(Position)
        .join(TradingAccount, TradingAccount.id == Position.account_id)
        .where(Position.created_at >= thirty_days_ago)
    )
    if scope_ids is not None:
        open_users_q = open_users_q.where(TradingAccount.user_id.in_(scope_ids))
    # Users with trades closed in last 30 days
    closed_users_q = (
        select(TradingAccount.user_id)
        .select_from(TradeHistory)
        .join(TradingAccount, TradingAccount.id == TradeHistory.account_id)
        .where(TradeHistory.closed_at >= thirty_days_ago)
    )
    if scope_ids is not None:
        closed_users_q = closed_users_q.where(TradingAccount.user_id.in_(scope_ids))
    combined = open_users_q.union(closed_users_q).subquery()
    # Same staff / demo exclusion as Total Users so the two numbers stay
    # consistent — admin test trades shouldn't inflate Active Traders.
    active_traders_q = await db.execute(
        select(func.count(func.distinct(combined.c.user_id)))
        .select_from(combined)
        .join(User, User.id == combined.c.user_id)
        .where(
            User.role.notin_(["admin", "super_admin", "employee", "manager", "support"]),
            User.is_demo == False,  # noqa: E712
        )
    )
    active_traders = active_traders_q.scalar() or 0

    # Deposits Today: approved deposits since midnight UTC.
    dep_today_stmt = select(func.coalesce(func.sum(Deposit.amount), 0)).where(
        Deposit.status.in_(["approved", "auto_approved"]),
        Deposit.created_at >= today_start,
    )
    if scope_ids is not None:
        dep_today_stmt = dep_today_stmt.where(Deposit.user_id.in_(scope_ids))
    deposits_today_q = await db.execute(dep_today_stmt)
    deposits_today = float(deposits_today_q.scalar() or 0)

    # Withdrawals Today.
    wdr_today_stmt = select(func.coalesce(func.sum(Withdrawal.amount), 0)).where(
        Withdrawal.status.in_(["approved", "completed"]),
        Withdrawal.created_at >= today_start,
    )
    if scope_ids is not None:
        wdr_today_stmt = wdr_today_stmt.where(Withdrawal.user_id.in_(scope_ids))
    withdrawals_today_q = await db.execute(wdr_today_stmt)
    withdrawals_today = float(withdrawals_today_q.scalar() or 0)

    # Platform P&L (all-time): broker wins when traders lose → negate total user profit.
    # Also add commissions earned (always positive for broker).
    pnl_stmt = select(func.coalesce(func.sum(Position.profit), 0)).where(
        Position.status == PositionStatus.CLOSED.value,
    )
    if scope_ids is not None:
        pnl_stmt = pnl_stmt.where(Position.account_id.in_(_accounts_in_scope(scope_ids)))
    pnl_q = await db.execute(pnl_stmt)
    user_pnl = float(pnl_q.scalar() or 0)

    comm_all_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.type == "commission",
    )
    if scope_ids is not None:
        comm_all_stmt = comm_all_stmt.where(Transaction.user_id.in_(scope_ids))
    commission_all_q = await db.execute(comm_all_stmt)
    total_commission = float(commission_all_q.scalar() or 0)

    platform_pnl = -user_pnl + total_commission

    # Commission paid today (separate stat, kept for schema compat).
    comm_today_stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.type == "commission",
        Transaction.created_at >= today_start,
    )
    if scope_ids is not None:
        comm_today_stmt = comm_today_stmt.where(Transaction.user_id.in_(scope_ids))
    commission_q = await db.execute(comm_today_stmt)
    commission_paid = float(commission_q.scalar() or 0)

    # Pending Deposits count.
    pending_stmt = select(func.count(Deposit.id)).where(Deposit.status == "pending")
    if scope_ids is not None:
        pending_stmt = pending_stmt.where(Deposit.user_id.in_(scope_ids))
    pending_deposits_q = await db.execute(pending_stmt)
    pending_deposits_count = pending_deposits_q.scalar() or 0

    # Open Support Tickets.
    tickets_stmt = select(func.count(SupportTicket.id)).where(
        SupportTicket.status.in_(["open", "in_progress"])
    )
    if scope_ids is not None:
        tickets_stmt = tickets_stmt.where(SupportTicket.user_id.in_(scope_ids))
    open_tickets_q = await db.execute(tickets_stmt)
    open_tickets_count = open_tickets_q.scalar() or 0

    return DashboardStats(
        total_users=total_users,
        active_traders=active_traders,
        deposits_today=deposits_today,
        withdrawals_today=withdrawals_today,
        platform_pnl=platform_pnl,
        commission_paid=commission_paid,
        pending_deposits_count=pending_deposits_count,
        open_tickets_count=open_tickets_count,
    )


async def dashboard_revenue_series(days: int, db: AsyncSession, scope_ids=None) -> DashboardRevenueSeries:
    end_d: date = datetime.utcnow().date()
    start_d: date = end_d - timedelta(days=days - 1)
    cutoff = datetime.combine(start_d, datetime.min.time())

    day_bucket = func.date_trunc("day", Deposit.created_at)
    dep_stmt = (
        select(day_bucket, func.coalesce(func.sum(Deposit.amount), 0))
        .where(
            Deposit.status.in_(["approved", "auto_approved"]),
            Deposit.created_at >= cutoff,
        )
    )
    if scope_ids is not None:
        dep_stmt = dep_stmt.where(Deposit.user_id.in_(scope_ids))
    dep_rows = (
        await db.execute(dep_stmt.group_by(day_bucket).order_by(day_bucket))
    ).all()

    w_bucket = func.date_trunc("day", Withdrawal.created_at)
    w_stmt = (
        select(w_bucket, func.coalesce(func.sum(Withdrawal.amount), 0))
        .where(
            Withdrawal.status.in_(["approved", "completed"]),
            Withdrawal.created_at >= cutoff,
        )
    )
    if scope_ids is not None:
        w_stmt = w_stmt.where(Withdrawal.user_id.in_(scope_ids))
    w_rows = (
        await db.execute(w_stmt.group_by(w_bucket).order_by(w_bucket))
    ).all()

    by_day: dict[str, tuple[float, float]] = {}

    def _add_dep(row):
        bkt, total = row[0], float(row[1] or 0)
        k = bkt.date().isoformat() if hasattr(bkt, "date") else str(bkt)[:10]
        d, w = by_day.get(k, (0.0, 0.0))
        by_day[k] = (d + total, w)

    def _add_w(row):
        bkt, total = row[0], float(row[1] or 0)
        k = bkt.date().isoformat() if hasattr(bkt, "date") else str(bkt)[:10]
        d, w = by_day.get(k, (0.0, 0.0))
        by_day[k] = (d, w + total)

    for row in dep_rows:
        _add_dep(row)
    for row in w_rows:
        _add_w(row)

    points: list[DashboardRevenuePoint] = []
    cur = start_d
    while cur <= end_d:
        key = cur.isoformat()
        dep_amt, wdr_amt = by_day.get(key, (0.0, 0.0))
        points.append(
            DashboardRevenuePoint(
                date=key,
                deposits=dep_amt,
                withdrawals=wdr_amt,
                net=dep_amt - wdr_amt,
            )
        )
        cur += timedelta(days=1)

    return DashboardRevenueSeries(points=points)
