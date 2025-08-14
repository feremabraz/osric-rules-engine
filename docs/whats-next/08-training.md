# Training & Level Advancement Gating

Summary: Optional subsystem imposing time and/or gold costs before newly earned XP confers level benefits.

Inputs:
- Pending level ups (from Level Progression rule)
- Character class, new level number
- Availability of trainer (boolean or quality tier)

Outputs:
- Training time (days/weeks)
- Training cost (gold)
- Status: completed, in-progress, blocked

Tables / Values (Example placeholders):
- Time: Level * 1 week baseline (modify by INT/WIS or performance checks).
- Cost: Level * 100 gp baseline (class variants possible).
- Success check: Optional; failure adds 1d3 extra days.

Procedure:
1. For each pending level, compute base time & cost from level.
2. Modify by trainer quality (poor: +50% time; superior: -25% time). Cost may scale similarly.
3. If resources (gold) available, deduct and start timer; else status = blocked.
4. On completion, mark training complete allowing Level Progression benefits to finalize.

Edge Cases:
- Multiple levels pending: process sequentially; cannot train for level N+2 before N+1 completed.
- Interrupted training: pause timer; resume later (track remaining days).

Future Extensions:
- Performance skill checks altering duration.
