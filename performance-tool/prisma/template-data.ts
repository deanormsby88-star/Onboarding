import type { TemplateInput } from "../src/lib/scorecards";

/**
 * The opening set of role templates, verbatim from
 * docs/scorecard-templates.md. Measure weights default to equal (1) within
 * a perspective and are editable in the app.
 */

const m = (code: string, name: string, definition: string, anchor3: string) => ({
  code,
  name,
  definition,
  anchor3,
  weight: 1,
});

export const SEED_TEMPLATES: TemplateInput[] = [
  {
    name: "HR Administrator",
    description:
      "Reports to Head of HR and Recruitment. Opening draft — revise after the first four weeks of live use.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 40,
        measures: [
          m(
            "1.1",
            "Contract and documentation accuracy",
            "Contracts, amendments, and personnel documents issued complete, correct, and on time.",
            "Every contract issued within 48 hours of a signed offer, with no more than one minor correction needed per week."
          ),
          m(
            "1.2",
            "Leave administration accuracy",
            "Leave applications captured correctly, balances accurate, BCEA accrual rules applied properly.",
            "All applications captured within 24 hours, balances reconcile, no leave query unresolved beyond three working days."
          ),
          m(
            "1.3",
            "Payroll input readiness",
            "New starters, terminations, and changes submitted to Finance complete and by the deadline.",
            "Submitted by cut-off with zero omissions and no post-deadline corrections."
          ),
          m(
            "1.4",
            "Personnel file completeness",
            "Every active employee has the full set of required contractual and statutory documents on file.",
            "No file missing a required document at week end, and any gap already logged with a remediation date."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 20,
        measures: [
          m(
            "1.5",
            "Employee query handling",
            "Responsiveness, clarity, and tone when staff raise HR queries.",
            "Acknowledged the same day, resolved or properly escalated within 48 hours, employee knows where their query stands."
          ),
          m(
            "1.6",
            "Line manager support",
            "Responsiveness to managers needing HR information or process support.",
            "Requests actioned within the agreed timeframe without the manager needing to follow up."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 15,
        measures: [
          m(
            "1.7",
            "Process discipline",
            "Follows the documented HR process rather than working around it, and flags where the process itself is broken.",
            "No shortcuts taken around a documented process, and at least one improvement suggestion raised per month."
          ),
          m(
            "1.8",
            "System hygiene",
            "HR system data kept current, accurate, and reconciled.",
            "Weekly reconciliation completed, discrepancies logged and cleared within the week."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 25,
        measures: [
          m(
            "1.9",
            "Quality over speed",
            "Work is checked before it goes out. Capacity concerns are raised up front rather than absorbed and delivered rushed.",
            "Nothing submitted unchecked. When the workload will not fit, says so before committing rather than after missing."
          ),
          m(
            "1.10",
            "Confidentiality and judgement",
            "Handles sensitive employee information appropriately and knows when to escalate rather than decide.",
            "No confidentiality lapses. Uncertain situations escalated rather than guessed at."
          ),
          m(
            "1.11",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  {
    name: "Account Manager",
    description:
      "Reports to COO. Scope note: Heya owns conduct, attendance, system access, and escalation for placed staff. Training outcomes and performance management sit with the client. These measures are drawn deliberately inside Heya's contractual remit and must stay there.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 30,
        measures: [
          m(
            "2.1",
            "Floor presence and walk completion",
            "Scheduled floor walks completed and observations logged per the Floor Walk SOP.",
            "All scheduled walks completed, observations logged the same day, actions assigned where needed."
          ),
          m(
            "2.2",
            "Attendance and adherence management",
            "Manages absenteeism, late arrivals, and schedule adherence for the account within Heya's remit.",
            "Every absence addressed the same day, adherence within target, patterns escalated per SOP rather than absorbed."
          ),
          m(
            "2.3",
            "Escalation judgement",
            "Identifies issues early and escalates the right thing to the right person at the right time.",
            "No issue reaches the client that Heya should have caught and raised first."
          ),
          m(
            "2.4",
            "Reporting accuracy and timeliness",
            "Client and internal reports submitted accurate, complete, and on deadline.",
            "On deadline every time, no corrections requested, figures traceable."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 30,
        measures: [
          m(
            "2.5",
            "Client relationship health",
            "Proactive, credible, regular contact with the client contact.",
            "Scheduled contact maintained without slipping, client concerns surfaced by the AM rather than by the client."
          ),
          m(
            "2.6",
            "Client satisfaction signal",
            "Client feedback on Heya's service delivery over the period.",
            "No negative feedback received and the client confirms expectations are being met."
          ),
          m(
            "2.7",
            "Internal partnership",
            "Works with HR, IT, Finance, and Recruitment through the proper channels with adequate notice.",
            "Requests raised through the correct channel with enough lead time, no last-minute demands on other functions."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 20,
        measures: [
          m(
            "2.8",
            "Headcount and cover",
            "Seats filled and cover arranged so the client agreement is met.",
            "No unplanned vacancy left uncovered, cover arranged before the gap rather than after."
          ),
          m(
            "2.9",
            "Growth and opportunity identification",
            "Surfaces opportunities to expand the account or improve how it runs.",
            "At least one credible opportunity or improvement raised per month with enough detail to act on."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 20,
        measures: [
          m(
            "2.10",
            "Team leadership within remit",
            "Develops and manages the Heya staff on the account across conduct, attendance, access, and escalation.",
            "Regular one-to-ones held and documented, issues addressed at first occurrence rather than allowed to accumulate."
          ),
          m(
            "2.11",
            "Quality over speed",
            "Output is considered and checked. Capacity concerns raised before committing.",
            "Nothing sent unchecked. When a deadline is not achievable, says so early rather than delivering rushed work."
          ),
          m(
            "2.12",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  {
    name: "IT Technician",
    description: "Reports to COO. Opening draft.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 35,
        measures: [
          m(
            "3.1",
            "Ticket resolution within SLA",
            "Tickets responded to and resolved within the agreed internal service levels.",
            "SLA met on 90% or more of tickets, with any breach explained and the cause noted."
          ),
          m(
            "3.2",
            "First-time fix",
            "Issues resolved properly the first time without reopens or repeat visits.",
            "Reopen rate within target, and repeat issues traced to a root cause rather than re-fixed."
          ),
          m(
            "3.3",
            "Ticket documentation quality",
            "Tickets logged with enough detail that someone else could pick the issue up cold.",
            "Every ticket has a clear problem statement, what was done, and the outcome."
          ),
          m(
            "3.4",
            "Preventative maintenance",
            "Scheduled patching, backups, and system checks completed and evidenced.",
            "All scheduled tasks completed on schedule with evidence recorded, no silent skips."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 25,
        measures: [
          m(
            "3.5",
            "User experience and communication",
            "Keeps users informed, explains in plain language, stays professional when people are frustrated.",
            "Users always know the status of their issue. No complaints about tone or communication."
          ),
          m(
            "3.6",
            "Onboarding and offboarding execution",
            "New starter setups ready on time, leaver access removed immediately.",
            "Every new starter fully set up before day one, and every leaver's access removed on the exit date without exception."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 20,
        measures: [
          m(
            "3.7",
            "Asset control",
            "Asset register accurate, equipment issued and recovered with proper records.",
            "Register reconciles at month end, nothing unaccounted for, recovery chased before the leaver walks out."
          ),
          m(
            "3.8",
            "Vendor and cost discipline",
            "Works effectively with IronPoint and suppliers, escalates well-scoped, avoids unnecessary spend.",
            "Escalations properly scoped so IronPoint can act without going back and forth. No avoidable spend."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 20,
        measures: [
          m(
            "3.9",
            "Security posture",
            "Applies and enforces access, MFA, and data-handling standards, and flags risks rather than absorbing them.",
            "No standard bypassed for convenience. Risks raised as soon as they are spotted."
          ),
          m(
            "3.10",
            "Quality over speed",
            "Fixes properly rather than fastest. Temporary fixes are always flagged as temporary.",
            "Every workaround logged with a permanent action attached. Does not close a ticket that is not actually resolved."
          ),
          m(
            "3.11",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  {
    name: "Head of HR and Recruitment",
    description: "Reports to COO. Opening draft.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 25,
        measures: [
          m(
            "4.1",
            "Compliance and audit readiness",
            "HR records, contracts, and statutory obligations kept audit-ready at all times.",
            "No compliance gap outstanding beyond its agreed remediation date, and a current view of where the function stands."
          ),
          m(
            "4.2",
            "Recruitment delivery",
            "Roles filled to the agreed timeframe and quality standard.",
            "Time-to-fill at target, no role stalled without a stated plan and a revised date."
          ),
          m(
            "4.3",
            "Onboarding and offboarding execution",
            "The end-to-end process delivered consistently across the function.",
            "Every new starter fully onboarded by day one, no offboarding step missed on any exit."
          ),
          m(
            "4.4",
            "HR process and system integrity",
            "Documented processes current, followed across the function, and the HR system accurate.",
            "Processes current and being followed, exceptions logged rather than quietly tolerated."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 25,
        measures: [
          m(
            "4.5",
            "Line manager enablement",
            "Managers equipped and confident to handle people matters at their level.",
            "Managers report they had the guidance they needed. Nothing escalated to HR that a manager should have been able to handle."
          ),
          m(
            "4.6",
            "Employee relations handling",
            "Disciplinary, grievance, and poor-performance matters managed fairly and procedurally.",
            "Procedurally sound and properly documented in every case, with no avoidable CCMA exposure created."
          ),
          m(
            "4.7",
            "Executive reporting",
            "HR reporting to COO and CEO accurate, on time, and useful for decisions.",
            "Submitted on time with interpretation and a recommendation, not just numbers."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 25,
        measures: [
          m(
            "4.8",
            "Cost of hire and agency spend",
            "Recruitment delivered efficiently with agency reliance actively managed.",
            "Within budget, direct-sourcing ratio at target, agency use justified case by case."
          ),
          m(
            "4.9",
            "Attrition and retention",
            "Attrition managed within target with root causes understood and acted on.",
            "Attrition at or below target, exit themes documented, at least one action taken against the leading cause."
          ),
          m(
            "4.10",
            "Function capacity and delegation",
            "Work distributed appropriately across the HR team, with no single point of failure.",
            "No critical process dependent on one person, team workload visibly balanced."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 25,
        measures: [
          m(
            "4.11",
            "Team development",
            "Develops the HR and recruitment team.",
            "Structured one-to-ones held with every report, each with an active development objective and visible progress."
          ),
          m(
            "4.12",
            "Culture contribution",
            "Visibly upholds and builds Heya's people-first culture.",
            "Committed initiatives delivered, and staff feedback on the HR function is positive."
          ),
          m(
            "4.13",
            "Quality over speed",
            "Delivers considered work and pushes back on unrealistic timeframes rather than committing and under-delivering.",
            "Negotiates the deadline up front. Does not commit to something the function cannot deliver properly."
          ),
          m(
            "4.14",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
];
