import type { TemplateInput } from "../src/lib/scorecards";

/**
 * Heya scorecard templates v4 (revised 31 July 2026), verbatim from
 * docs/scorecard-templates.md. Nine templates; seven built from the
 * holder's own role submission, templates 4 (Head of HR) and 9 (COO) are
 * drafts awaiting the holder's input.
 *
 * Every template holds 12-13 measures — at ~20 seconds per measure that is
 * the four-to-five-minute check-in promised to the team. 13 is a hard
 * ceiling, enforced by templateInputSchema.
 */

const m = (code: string, name: string, definition: string, anchor3: string) => ({
  code,
  name,
  definition,
  anchor3,
  weight: 1,
});

export const SEED_TEMPLATES: TemplateInput[] = [
  // ------------------------------------------------------------------ 1
  {
    name: "HR Administrator",
    description:
      "Jesse Figueiredo. Reports to Head of HR and Recruitment. v4 — built from Jesse's own role submission.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 40,
        measures: [
          m(
            "1.1",
            "Workforce tracking currency",
            "Headcount and workforce tracking sheets kept current so leadership has a real-time view.",
            "Trackers updated the same day a change occurs, and no discrepancies found when the data is checked against source records."
          ),
          m(
            "1.2",
            "Onboarding execution",
            "Onboarding, induction, Zoho setup, and clock-in system registration completed for every new hire.",
            "100% of onboarding documentation completed on or before the start date, and the new hire is clocked into the system without needing manual follow-up."
          ),
          m(
            "1.3",
            "Contract and documentation accuracy",
            "Contracts, offer letters, and employee information forms issued complete, correct, and on time.",
            "Turnaround met on every document with no more than one minor correction per week."
          ),
          m(
            "1.4",
            "Records and compliance readiness",
            "Personnel records and contracts maintained so the business is audit-ready and meets labour law and BPO regulatory requirements.",
            "No missing or outdated record, and no compliance gap attributable to documentation."
          ),
          m(
            "1.5",
            "Leave and attendance administration",
            "Leave captured accurately with BCEA accrual applied correctly, and absenteeism reported on schedule.",
            "Applications captured within 24 hours, balances reconcile, absenteeism reported on schedule without prompting."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 20,
        measures: [
          m(
            "1.6",
            "Employee query handling",
            "First point of contact for staff HR queries, with escalation of complex matters.",
            "Acknowledged same day, resolved or escalated within 48 hours, and the employee always knows where their query stands."
          ),
          m(
            "1.7",
            "Casework support to the HR Manager",
            "Timely, accurate support on grievances, disciplinary processes, and investigations.",
            "No missed step in a disciplinary or grievance procedure, and the HR Manager gets what they need without chasing."
          ),
          m(
            "1.8",
            "HR and client reporting",
            "Headcount, attrition, leave, and absenteeism reports for leadership and clients.",
            "Delivered on schedule with no rework needed, and the data matches source records."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 15,
        measures: [
          m(
            "1.9",
            "Process improvement",
            "Identifies friction in HR processes and gets improvements implemented.",
            "At least one improvement suggestion raised per month, with a track record of some being implemented."
          ),
          m(
            "1.10",
            "Escalation economy",
            "Handles what sits at his level rather than passing it up.",
            "Minimal errors, rework, or escalations back to the HR Manager on matters he could have closed himself."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 25,
        measures: [
          m(
            "1.11",
            "Quality over speed",
            "Work is checked before it goes out. Capacity concerns are raised before committing rather than absorbed and delivered rushed.",
            "Nothing submitted unchecked. When the workload will not fit, says so before committing rather than after missing."
          ),
          m(
            "1.12",
            "Confidentiality and judgement",
            "Handles sensitive employee information appropriately and escalates rather than guessing.",
            "No confidentiality lapses. Uncertain situations escalated rather than decided alone."
          ),
          m(
            "1.13",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 2
  {
    name: "Account Manager",
    description:
      "Demetri Bitirimoglu and Zozo Nyokani. Report to COO. Scope note: Heya owns conduct, attendance, system access, and escalation for placed staff; training outcomes and performance management sit with the client. Measures 2.6, 2.8 and 2.10 are not derived from the AMs' submissions — confirm with Demetri and Zozo whether client contact, cover, and coaching sit with the AM or with the COO.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 35,
        measures: [
          m(
            "2.1",
            "Daily floor walks",
            "Floor walks conducted daily to monitor productivity and engagement, with observations logged.",
            "A walk completed every working day, observations logged the same day, actions assigned where needed."
          ),
          m(
            "2.2",
            "Attendance and policy compliance monitoring",
            "Attendance, punctuality, extended breaks, phone usage, and client-specific policy requirements monitored and recorded.",
            "Both adherences and concerns recorded, not just problems. Patterns identified rather than each instance treated in isolation."
          ),
          m(
            "2.3",
            "Conduct and behaviour monitoring",
            "Team Member professionalism and workplace conduct monitored, with client and Team Lead feedback reviewed and actioned.",
            "Feedback from clients and Team Leads actioned within the week, behavioural concerns recorded with enough detail to support an HR process."
          ),
          m(
            "2.4",
            "Escalation judgement and timing",
            "Recurring or serious concerns escalated to the right department at the right time.",
            "No issue reaches the client that Heya should have caught and raised first, and no recurring concern left to accumulate."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 30,
        measures: [
          m(
            "2.5",
            "Timely client communication",
            "Attendance and operational issues communicated to the client promptly.",
            "The client hears it from us first, on the day, rather than discovering it themselves."
          ),
          m(
            "2.6",
            "Client relationship health",
            "Proactive, credible, regular contact with the client contact.",
            "Scheduled contact maintained without slipping, no unresolved client concern carried into the next week."
          ),
          m(
            "2.7",
            "Internal partnership",
            "Escalations to IT, HR, Payroll, and senior management raised through the right channel and properly scoped.",
            "The receiving department can act on the escalation without going back and forth for detail."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 10,
        measures: [
          m(
            "2.8",
            "Headcount and cover",
            "Seats filled and cover arranged so the client agreement is met.",
            "No unplanned vacancy left uncovered, cover arranged before the gap rather than after."
          ),
          m(
            "2.9",
            "Blocker resolution",
            "Operational blockers affecting Team Members or clients resolved or routed, not left sitting.",
            "No blocker raised in one week still sitting untouched in the next."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 25,
        measures: [
          m(
            "2.10",
            "Team leadership within remit",
            "Develops and manages Heya staff on the account across conduct, attendance, access, and escalation.",
            "One-to-ones held and documented, issues addressed at first occurrence."
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
  // ------------------------------------------------------------------ 3
  {
    name: "Senior IT Technician",
    description:
      "Stephen Kandorozu. Reports to COO. v4 — measures 3.9 and 3.10 come directly from Stephen naming them himself; 3.10 is deliberately written to run in both directions.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 35,
        measures: [
          m(
            "3.1",
            "End-user ticket resolution",
            "Hardware, software, and access issues resolved. Speed is the priority here: anything blocking someone's ability to work now.",
            "Blocking issues resolved same day, non-blocking within the agreed turnaround, and no ticket closed that is not actually resolved."
          ),
          m(
            "3.2",
            "Network and infrastructure integrity",
            "VLAN and port configuration, connectivity across teams and departments, access to portals and resources. Quality is the priority here.",
            "No team loses connectivity through a configuration error, and infrastructure changes are done properly the first time."
          ),
          m(
            "3.3",
            "Onboarding and workstation setup",
            "New staff emails, equipment, workstation setup, and domain sign-in. Workstation relocations when teams move.",
            "Every new starter fully set up before day one, and equipment stays tracked and with the assigned person through any relocation."
          ),
          m(
            "3.4",
            "Surveillance monitoring and investigation support",
            "Camera monitoring, footage provided on request, and support to investigations into staff transgressions.",
            "Footage requests fulfilled within the agreed turnaround, investigation support documented well enough to stand up in a disciplinary process."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 20,
        measures: [
          m(
            "3.5",
            "User communication",
            "Keeps users informed, explains in plain language, stays professional when people are frustrated.",
            "Users always know the status of their issue. No complaints about tone or communication."
          ),
          m(
            "3.6",
            "Vendor liaison",
            "Escalations to IronPoint (Azure and Microsoft) and Du Pont (network) properly scoped.",
            "The vendor can act on the escalation without going back and forth. Vendor relationship stays constructive."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 20,
        measures: [
          m(
            "3.7",
            "Asset and inventory control",
            "Assigned and storage equipment tracked and reconciled.",
            "Inventory reconciles, nothing unaccounted for, and the register survives office moves and staff changes."
          ),
          m(
            "3.8",
            "Priority management under competing demands",
            "Handles being pulled in several directions without losing clarity on what matters.",
            "Finishes the priority item rather than making partial progress on several. When priorities genuinely conflict, asks rather than guessing."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 25,
        measures: [
          m(
            "3.9",
            "Ownership and early communication",
            "Takes ownership when accountability is ambiguous rather than waiting for explicit assignment. Flags slippage early with the reason. Notifies the right person on completion.",
            'Raises ambiguous ownership rather than defaulting to "not my responsibility" or going quiet. Any at-risk deadline flagged before the date, with a reason.'
          ),
          m(
            "3.10",
            "Quality over speed",
            "Matching the response to the situation. This measure runs in both directions.",
            "A blocking user issue gets the fast fix. An infrastructure change gets the durable one. Temporary fixes are always logged as temporary with a permanent action attached, and he does not over-engineer when a temporary fix was what the situation called for."
          ),
          m(
            "3.11",
            "Security posture",
            "Applies and enforces access, MFA, and data-handling standards, and flags risks rather than absorbing them.",
            "No standard bypassed for convenience. Risks raised as soon as spotted rather than carried quietly."
          ),
          m(
            "3.12",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 4
  {
    name: "Head of HR and Recruitment",
    description:
      "DRAFT — Khomotso Manaka. Reports to COO. Submission outstanding (off sick on the due date): this template is not informed by her own view of the role. Do not treat it as agreed — it needs her input before going live, particularly because she manages Jesse and Aidan, whose templates were built from theirs.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 25,
        measures: [
          m(
            "4.1",
            "Compliance and process integrity",
            "HR records, contracts, and statutory obligations audit-ready. Documented processes current and followed across the function.",
            "No compliance gap outstanding beyond its agreed remediation date, processes current, exceptions logged rather than quietly tolerated."
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
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 25,
        measures: [
          m(
            "4.4",
            "Line manager enablement",
            "Managers equipped and confident to handle people matters at their level.",
            "Managers report they had the guidance they needed. Nothing escalated to HR that a manager should have handled."
          ),
          m(
            "4.5",
            "Employee relations handling",
            "Disciplinary, grievance, and poor-performance matters managed fairly and procedurally.",
            "Procedurally sound and properly documented in every case, with no avoidable CCMA exposure created."
          ),
          m(
            "4.6",
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
            "4.7",
            "Cost of hire and agency spend",
            "Recruitment delivered efficiently with agency reliance actively managed.",
            "Within budget, direct-sourcing ratio at target, agency use justified case by case."
          ),
          m(
            "4.8",
            "Attrition and retention",
            "Attrition managed within target with root causes understood and acted on.",
            "Attrition at or below target, exit themes documented, at least one action taken against the leading cause."
          ),
          m(
            "4.9",
            "Function capacity and delegation",
            "Work distributed appropriately across the HR team.",
            "No critical process dependent on one person, team workload visibly balanced."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 25,
        measures: [
          m(
            "4.10",
            "Team development and culture",
            "Develops the HR and recruitment team and visibly builds Heya's people-first culture.",
            "Structured one-to-ones held with every report, each with an active development objective. Committed culture initiatives delivered."
          ),
          m(
            "4.11",
            "Quality over speed",
            "Delivers considered work and pushes back on unrealistic timeframes rather than committing and under-delivering.",
            "Negotiates the deadline up front. Does not commit to something the function cannot deliver properly."
          ),
          m(
            "4.12",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 5
  {
    name: "Recruitment and Administration",
    description:
      "Aidan Le Fleur. Reports to Head of HR and Recruitment. v4 — built from Aidan's own submission. Note: his role contains the sharpest speed-vs-thoroughness tension in the business (pipeline speed vs vetting depth); raise 5.11 explicitly when agreeing the scorecard with him.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 35,
        measures: [
          m(
            "5.1",
            "Pipeline depth",
            "Proactive sourcing maintaining a live pipeline with vetted backup candidates ready before a request arrives.",
            "At least one pre-vetted backup candidate available for every active or recently filled role."
          ),
          m(
            "5.2",
            "Vetting and verification completeness",
            "Fingerprint background checks, reference calls verifying past performance, and work history confirmation.",
            "Zero compliance gaps across checks, references, and fingerprinting before any candidate is placed."
          ),
          m(
            "5.3",
            "Advert and job board management",
            "Job descriptions written, updated, and optimised across local platforms and social channels.",
            "All live roles advertised and current, with a steady flow of applications rather than a dry pipeline."
          ),
          m(
            "5.4",
            "First-day coordination",
            "New hires welcomed, equipped, and introduced on their first day.",
            "Every new starter is met, set up, and introduced without needing to chase anyone."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 30,
        measures: [
          m(
            "5.5",
            "Client standards enforcement",
            "Client requirements, from years of experience through to soft-skill profile, met strictly before a candidate is presented.",
            "No candidate presented who does not meet the brief as written. Where the brief cannot be met, that is raised rather than the bar quietly lowered."
          ),
          m(
            "5.6",
            "Candidate pack quality",
            "Candidate profiles organised and formatted so a client can decide quickly.",
            "Packs need no reformatting or clarification before the client can review them."
          ),
          m(
            "5.7",
            "Candidate experience",
            "Clear, timely communication to candidates whether advancing or being declined.",
            "Every candidate hears back within the agreed turnaround, including the unsuccessful ones."
          ),
          m(
            "5.8",
            "Search calibration",
            "Search criteria adjusted based on feedback from recent interviews.",
            "Feedback from a declined candidate visibly changes the next shortlist rather than the same search being repeated."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 15,
        measures: [
          m(
            "5.9",
            "Time to fill",
            "Speed from request to placement, using the pipeline rather than starting cold.",
            "Time-to-fill at target, with the pipeline actually shortening it rather than existing on paper."
          ),
          m(
            "5.10",
            "Floor support contribution",
            "Shift floor walks, attendance monitoring, and stepping in where the team needs help.",
            "Assigned walks completed and logged, and available when operations needs cover without it derailing recruitment delivery."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 20,
        measures: [
          m(
            "5.11",
            "Quality over speed",
            "Vetting standards hold under time pressure. Capacity concerns raised before committing.",
            "No candidate presented under-vetted in order to hit a turnaround target. When a deadline would force a shortcut, says so before committing."
          ),
          m(
            "5.12",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 6
  {
    name: "Software Developer and Business Systems",
    description:
      'Tiago Figueiredo. Reports to COO. "Client and Stakeholder" here means internal managers and leadership, who are the users of what he builds. Tiago named visibility (6.5, 6.6) as the part he most wants judged on, and deliberately wrote his documentation commitment as reducing his own indispensability — worth acknowledging when agreeing the scorecard.',
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 30,
        measures: [
          m(
            "6.1",
            "Testing before release",
            "Nothing goes live until it has been tested against real cases and verified by someone other than the person who built it.",
            "Every release tested with the people who will use it, and no manager has had to discover a broken number themselves."
          ),
          m(
            "6.2",
            "Delivery against committed dates",
            "Committed dates met, or the risk raised before the date arrives with a revised plan. Forecasts labelled as forecasts.",
            "No date passes without leadership already knowing it was at risk. A missed date nobody knew about counts as a 1 regardless of cause."
          ),
          m(
            "6.3",
            "Architecture and single source of truth",
            "Deciding and enforcing which system owns which data, so there is one version of every number.",
            "Two managers looking at the same figure reach the same conclusion, because the definition sits under the number rather than in someone's head."
          ),
          m(
            "6.4",
            "Data governance",
            "Sensitive personal information sits only where it should, and access can be demonstrated rather than asserted.",
            "Medical notes, pay, and disciplinary detail visible only to those whose job requires them, and he can show who can see what and why on request."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 25,
        measures: [
          m(
            "6.5",
            "Self-service visibility",
            "Managers get answers from the system rather than from him.",
            "The same question is never asked of him twice. The second time, there is a report that answers it."
          ),
          m(
            "6.6",
            "Leadership dashboard coverage",
            "One place showing sales, delivery, people, support, and margin.",
            "Leadership asks why a number moved rather than what the number is, and does not wait on anyone to go and find it."
          ),
          m(
            "6.7",
            "Alignment before building",
            "Raises the decisions that need Dean's input before committing: anything changing how a department works, anything moving ownership of data or a process, anything changing what a manager, employee, or client can see, and anything committing to a platform, licence, or spend.",
            "Options and honest trade-offs brought before the build starts, not after. Nothing in those four categories is discovered after the fact."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 20,
        measures: [
          m(
            "6.8",
            "Documentation and business continuity",
            "Current schema document, custom code in version control, and a runbook for every automated process.",
            "A competent Zoho developer could pick up any system from written material rather than needing a discovery phase."
          ),
          m(
            "6.9",
            "Platform and spend discipline",
            "No licence, platform, or spend commitment made without alignment.",
            "Every commitment agreed in advance, with the alternatives and the cost of reversal laid out."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 25,
        measures: [
          m(
            "6.10",
            "Quality over speed",
            "Delivers considered work and raises the trade-off rather than shipping something untested to hit a date.",
            "Where the date and the standard conflict, he raises it before the date rather than quietly choosing one."
          ),
          m(
            "6.11",
            "Business intelligence",
            "Moving from making data available to interpreting it and saying where the business should act.",
            "Reports come with a reading of what they mean, not just the numbers."
          ),
          m(
            "6.12",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 7
  {
    name: "Financial Assistant and LEA Clinical Team Leader",
    description:
      "Debbie Derman. Two functions — finance (dominant in this weighting) and LEA clinical team leadership. Confirm the split with her: if LEA leadership is genuinely half her week this needs two scorecards or a different weighting. Measure 7.6 is written to Heya's contractual remit (conduct, attendance, access, escalation); if LEA has delegated task quality and throughput to her, confirm that in writing first.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 35,
        measures: [
          m(
            "7.1",
            "Monthly billing",
            "Client billing issued accurately and by the deadline.",
            "All client invoices issued accurately by the 25th, with no corrections needed after issue."
          ),
          m(
            "7.2",
            "Expense processing",
            "Expenses uploaded to Hubdoc and prepared for payment.",
            "Every expense uploaded on receipt and prepared within the payment cycle, nothing sitting unprocessed."
          ),
          m(
            "7.3",
            "Insurance and asset protection",
            "Policy maintained and claims prepared so the business is correctly insured and lost, stolen, or damaged items are replaced.",
            "No gap in cover at any point, claims lodged promptly, replacements actioned without being chased."
          ),
          m(
            "7.4",
            "Recurring administration",
            "Vehicle licences renewed and pantry, stationery, gift, and IT stock maintained.",
            "No licence lapses, and nothing runs out before it is reordered."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 25,
        measures: [
          m(
            "7.5",
            "Debt collection",
            "Client accounts followed up so they are paid.",
            "No account ages beyond agreed terms without follow-up already under way and documented."
          ),
          m(
            "7.6",
            "LEA clinical team oversight",
            "Day-to-day oversight of the clinical team members within Heya's remit: attendance, conduct, system access, and escalation.",
            "Attendance and conduct issues addressed the same day and escalated per SOP. The team knows what is expected of them day to day."
          ),
          m(
            "7.7",
            "Billing query handling",
            "Client billing queries and disputes resolved.",
            "Acknowledged same day, resolved or escalated within 48 hours, nothing left unanswered into the next week."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 20,
        measures: [
          m(
            "7.8",
            "Cash flow visibility",
            "Leadership sees the ageing position and any cash risk in time to act.",
            "Cash risk flagged before it becomes urgent, not reported after it has bitten."
          ),
          m(
            "7.9",
            "Purchasing and cost discipline",
            "Purchases made against a genuine need at a sensible price.",
            "Within budget, no panic buying caused by stock running out, and price checked on anything material."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 20,
        measures: [
          m(
            "7.10",
            "Quality over speed",
            "Figures are checked before they go out. Capacity concerns raised before committing.",
            "Nothing issued unchecked. When a deadline would force an unverified number, says so before committing."
          ),
          m(
            "7.11",
            "Financial controls and confidentiality",
            "Controls followed and sensitive financial and employee information handled appropriately.",
            "No control bypassed for convenience, no exception made without approval."
          ),
          m(
            "7.12",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 8
  {
    name: "New Business Development Analyst",
    description:
      'Jess Kallenbach. "Client and Stakeholder" here means prospects and internal leadership. Before this goes live: 8.7 needs an agreed number (target conversion rate or weekly qualified-prospect count) — it is the only output measure on the card and unusable without one. 8.10 deliberately makes the executive-support work for Yehuda visible so it cannot silently eat the analyst role.',
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 35,
        measures: [
          m(
            "8.1",
            "Prospect identification and qualification",
            "Companies identified against Heya's ICP and qualified using the agreed research criteria.",
            "New prospects added each week that meet the ICP, qualified against the framework rather than added on impression."
          ),
          m(
            "8.2",
            "Research accuracy",
            "Research and insight that holds up when someone acts on it.",
            "No prospect approached on the basis of a fact that turns out to be wrong or out of date."
          ),
          m(
            "8.3",
            "Database currency",
            "Prospect records, contact details, research notes, and engagement history kept accurate and accessible.",
            "Someone else could pick up the database and use it without asking her anything."
          ),
          m(
            "8.4",
            "Growth signal monitoring",
            "Funding, hiring, and expansion signals tracked as indicators of offshore staffing demand.",
            "Relevant signals surfaced while still current, not after a competitor has already acted on them."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 20,
        measures: [
          m(
            "8.5",
            "LinkedIn network and engagement",
            "Network of target decision-makers grown and engaged with.",
            "Network grows each week with genuine target decision-makers, and engagement is considered rather than volume commenting."
          ),
          m(
            "8.6",
            "Research delivered to leadership",
            "Findings and recommendations presented in a form leadership can act on.",
            "Findings come with a reading of what they mean and a recommendation, not a data dump for someone else to interpret."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 20,
        measures: [
          m(
            "8.7",
            "Pipeline contribution",
            "Qualified prospects that turn into actual conversations.",
            "Conversion from qualified prospect to conversation at the agreed rate, rather than the database growing without anything coming out of it."
          ),
          m(
            "8.8",
            "Process and tooling improvement",
            "Research methodologies refined and new tools evaluated.",
            "At least one improvement proposed per month with a view on whether it is worth adopting."
          ),
          m(
            "8.9",
            "Documentation and playbooks",
            "Documentation and playbooks that make business development activity consistent.",
            "Current enough that another person could run the same research process and get the same quality."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 25,
        measures: [
          m(
            "8.10",
            "Balancing executive support against the analyst role",
            "Ad hoc priorities and coordination for Yehuda delivered without silently displacing research commitments.",
            "The ad hoc work gets done, and where it would push out a research commitment that trade-off is raised rather than absorbed."
          ),
          m(
            "8.11",
            "Quality over speed",
            "Research verified before it is presented. Capacity concerns raised before committing.",
            "Nothing presented unverified. When a deadline would force an unchecked conclusion, says so before committing."
          ),
          m(
            "8.12",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
  // ------------------------------------------------------------------ 9
  {
    name: "Chief Operating Officer",
    description:
      "DRAFT — Dean Ormsby. Reports to CEO. Assembled from Laz's stated direction, Dean's known scope, and his two named growth areas — not from a submission. Write your own definition and have Laz confirm it, exactly as the team was asked to; otherwise the one person exempt from the exercise is the person who launched it.",
    perspectives: [
      {
        kind: "DELIVERY_QUALITY",
        weightPct: 30,
        measures: [
          m(
            "9.1",
            "Quality gate before work leaves Heya",
            "Nothing reaches a client or the CEO in a state Heya should have caught internally.",
            "No work reached a client or Laz that should have had another set of eyes on it. Where something did, the process gap was identified and closed the same week rather than treated as a one-off."
          ),
          m(
            "9.2",
            "Proximity to execution",
            "Knows what is on the team's plates, what risks they are carrying, and where things are drifting, before it becomes a problem.",
            "No problem in the function reached Laz that Dean did not already know about and already have a plan for."
          ),
          m(
            "9.3",
            "Commitments met and risks raised early",
            "The same standard set for the team, applied to himself.",
            "Committed dates met, or the risk raised before the date with a revised plan. A date missed without prior warning is a 1 regardless of cause."
          ),
          m(
            "9.4",
            "Momentum on strategic projects",
            "The programmes he owns actually move: office move and continuity, HR system rebuild, contract programme, asset management, performance framework, onboarding and offboarding redesign.",
            "Every active project moved this week, or its pause is deliberate and stated. Nothing stalled silently."
          ),
        ],
      },
      {
        kind: "CLIENT_STAKEHOLDER",
        weightPct: 25,
        measures: [
          m(
            "9.5",
            "Executive reporting to the CEO",
            "Reporting that is accurate, on time, and contains the bad news.",
            "Delivered on schedule with the problems in it, and Laz never learns something material from another source first."
          ),
          m(
            "9.6",
            "Client health and senior relationships",
            "Account health known across the portfolio, and the relationships that need a COO maintained.",
            "No client escalation that Heya should have raised first. Senior contact maintained on the accounts that need it, with nothing drifting."
          ),
        ],
      },
      {
        kind: "COMMERCIAL_EFFICIENCY",
        weightPct: 20,
        measures: [
          m(
            "9.7",
            "Prioritisation",
            "High-impact work gets the time. Low-impact work is declined, delegated, or deferred deliberately.",
            "The week's time went to what mattered most. Where it did not, he can say why and what he is changing next week."
          ),
          m(
            "9.8",
            "Business continuity and operational risk",
            "Continuity, connectivity, systems, and single points of failure.",
            "Every known risk has an owner and a date. No continuity risk sitting unowned."
          ),
          m(
            "9.9",
            "Cost and resource discipline",
            "Vendor spend, headcount, and utilisation.",
            "Spend decisions made against a case, utilisation at target, no commitment made without alignment where it is required."
          ),
        ],
      },
      {
        kind: "PEOPLE_GROWTH",
        weightPct: 25,
        measures: [
          m(
            "9.10",
            "Developing the management team",
            "The check-ins happen, and the conversation happens, not just the form.",
            "Weekly check-in completed and discussed with every direct report. Each has an active development objective with visible movement."
          ),
          m(
            "9.11",
            "Holding the standard evenly",
            "Consistency rather than intensity. The standard applies when it is inconvenient too.",
            "No issue tolerated in one person that would be raised in another. The standard set in week one is the same standard in week twelve."
          ),
          m(
            "9.12",
            "Quality over speed",
            "Pushing back on a timeframe rather than passing pressure down unchanged.",
            "Where a deadline would force the team into rushed work, he renegotiates it rather than transmitting it. Does not commit the team to something they cannot deliver properly."
          ),
          m(
            "9.13",
            "Own development",
            "Progress against the current agreed development objective.",
            "Actively working on the objective with visible movement this period."
          ),
        ],
      },
    ],
  },
];
