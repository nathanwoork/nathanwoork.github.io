/* Public planning snapshot: no automatic Trello sync. */
window.PROJECT_DATA = {
  "brand": {
    "name": "NeatRelay",
    "tagline": "Less chasing. Clearer work.",
    "vision": "Small business owners can run a growing team without personally chasing every next step.",
    "mission": "Turn messy daily work into clear, teachable processes, then implement and maintain the smallest useful system the team can own.",
    "palette": {
      "ink": "#17233D",
      "canvas": "#F5F7FA",
      "primary": "#007F78",
      "accent": "#D9F7EA",
      "surface": "#FFFFFF",
      "blueAlternative": "#2448BD"
    }
  },
  "asOf": "2026-10-06",
  "trelloUrl": "https://trello.com/b/EkpD9cQ1",
  "githubUrl": "https://github.com/nathanwoork/nathanwoork.github.io/tree/main/neatrelay",
  "workstreams": [
    {
      "id": "brand",
      "name": "Brand & direction",
      "summary": "Define a clear promise for a small workflow consulting studio. Working name awaits review and formal checks.",
      "status": "in-progress"
    },
    {
      "id": "learning",
      "name": "Learn the craft",
      "summary": "Learn process diagnosis and one automation stack. Demonstrate understanding through a working example.",
      "status": "ready"
    },
    {
      "id": "demo",
      "name": "Build the demo",
      "summary": "Rehearse a studio proposal-to-project handoff with synthetic data and deliberate failure cases.",
      "status": "planned"
    },
    {
      "id": "offer",
      "name": "Package the service",
      "summary": "Make the diagnostic, one-flow pilot and bounded support offer concrete and costed.",
      "status": "in-progress"
    },
    {
      "id": "marketing",
      "name": "Prepare to be found",
      "summary": "Prepare a useful demo, service page and ten plausible studio candidates before outreach.",
      "status": "planned"
    },
    {
      "id": "people",
      "name": "People & safeguards",
      "summary": "Identify a technical reviewer and the appropriate business advisers; no employees in month one.",
      "status": "planned"
    },
    {
      "id": "pilot",
      "name": "Pilot & operations",
      "summary": "Set acceptance rules now; verify demand and adoption with a real owner and daily user in month two or later.",
      "status": "planned"
    }
  ],
  "tasks": [
    {
      "id": "NR01",
      "title": "Focus the venture on workflow consulting",
      "workstream": "brand",
      "status": "done",
      "week": "1",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 0,
      "description": "Nathan selected the former KedaiFlow concept. GuestLoop and ShelfSignal are deferred. The studio niche is still a planning hypothesis.",
      "acceptance": "One venture has the active roadmap; deferred ideas do not consume the launch plan.",
      "dependencies": [],
      "trelloUrl": "https://trello.com/c/Ba72RcGo/8-nr01-w1-focus-the-venture-on-workflow-consulting"
    },
    {
      "id": "NR02",
      "title": "Draft the NeatRelay brand and positioning",
      "workstream": "brand",
      "status": "done",
      "week": "1",
      "priority": "high",
      "owner": "Astra",
      "estimatedHours": 0,
      "description": "A brand memo now contains a name shortlist, investor paragraph, vision, mission, teal palette and service positioning. Draft completion does not mean Nathan has approved the identity.",
      "acceptance": "A reviewable brand memo and colour options exist, with unvalidated claims labelled.",
      "dependencies": [
        "NR01"
      ],
      "trelloUrl": "https://trello.com/c/d6Oy7RWQ/9-nr02-w1-draft-the-neatrelay-brand-and-positioning"
    },
    {
      "id": "NR03",
      "title": "Review the name, palette and availability checks",
      "workstream": "brand",
      "status": "ready",
      "week": "1",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 2,
      "description": "Review NeatRelay and the teal/blue directions. Check relevant names, similar marks, domains and handles before committing to the permanent identity. No registration or purchase is assumed.",
      "acceptance": "Nathan records the brand direction; formal name/mark/domain checks are either evidenced or explicitly pending.",
      "dependencies": [
        "NR02"
      ],
      "trelloUrl": "https://trello.com/c/rtj6i0vB/10-nr03-w1-review-the-name-palette-and-availability-checks"
    },
    {
      "id": "NR04",
      "title": "Curate the learning and specialist resource map",
      "workstream": "learning",
      "status": "done",
      "week": "1",
      "priority": "medium",
      "owner": "Astra",
      "estimatedHours": 0,
      "description": "The learning and people memo lists official courses, specialist directories, verification routes and a first-month plan. No course completion, hiring or endorsement is claimed.",
      "acceptance": "Resources have purposes, links and limitations, including adviser-verification caveats.",
      "dependencies": [
        "NR01"
      ],
      "trelloUrl": "https://trello.com/c/f5F7VFmj/11-nr04-w1-curate-the-learning-and-specialist-resource-map"
    },
    {
      "id": "NR05",
      "title": "Learn to diagnose a process and name its owner",
      "workstream": "learning",
      "status": "ready",
      "week": "1",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 5,
      "description": "Study process-owner concepts: waiting, repeated entry, approvals, exceptions and responsibility. Keep a short glossary and explain the concepts using the fictional studio.",
      "acceptance": "Nathan can describe the current steps, one bottleneck, the responsible person and a sensible measure without prescribing software first.",
      "dependencies": [
        "NR04"
      ],
      "trelloUrl": "https://trello.com/c/nqK2mZum/12-nr05-w1-learn-to-diagnose-a-process-and-name-its-owner"
    },
    {
      "id": "NR06",
      "title": "Complete a focused Make learning session",
      "workstream": "learning",
      "status": "ready",
      "week": "1",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 4,
      "description": "Use Make Academy foundation/data/routing material and make one tiny synthetic example. Choose one platform; Power Automate is an alternative only if the eventual client stack justifies it.",
      "acceptance": "Nathan can explain triggers, field mapping, basic filters, logs and what happens when a step fails. Completion is demonstrated, not inferred from a course enrolment.",
      "dependencies": [
        "NR04"
      ],
      "trelloUrl": "https://trello.com/c/jmPvSG5u/13-nr06-w1-complete-a-focused-make-learning-session"
    },
    {
      "id": "NR07",
      "title": "Map one fictional studio handoff",
      "workstream": "demo",
      "status": "planned",
      "week": "1",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 4,
      "description": "Map approved proposal to delivery-ready project record for a fictional 2–8 person creative studio. Specify owner, approved scope, due date, next action and exception paths.",
      "acceptance": "One current/proposed process map identifies inputs, owner, outputs, manual fallback and two measurable problems. All data is labelled synthetic.",
      "dependencies": [
        "NR05"
      ],
      "trelloUrl": "https://trello.com/c/AkG2HibJ/14-nr07-w1-map-one-fictional-studio-handoff"
    },
    {
      "id": "NR08",
      "title": "Build the synthetic one-flow demonstration",
      "workstream": "demo",
      "status": "planned",
      "week": "2",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 9,
      "description": "Build one intake form, one work board and up to two internal reminder rules using fake records. Keep commercial approvals explicit and outgoing customer messages as drafts.",
      "acceptance": "A fictional approved proposal becomes one correctly assigned project with required fields and a visible next action; Nathan can operate the manual fallback.",
      "dependencies": [
        "NR06",
        "NR07"
      ],
      "trelloUrl": "https://trello.com/c/nCuKTx8F/15-nr08-w2-build-the-synthetic-one-flow-demonstration"
    },
    {
      "id": "NR09",
      "title": "Run twenty demo cases, including failures",
      "workstream": "demo",
      "status": "planned",
      "week": "2",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 6,
      "description": "Exercise twenty representative fake cases including duplicate input, missing fields, changed status, overdue items, revoked access and an unavailable service. Record findings and repairs.",
      "acceptance": "A dated test log records expected/actual behaviour and fixes; duplicate prevention, visible failure handling and export/recovery are demonstrated.",
      "dependencies": [
        "NR08"
      ],
      "trelloUrl": "https://trello.com/c/oaFoChmF/16-nr09-w2-run-twenty-demo-cases-including-failures"
    },
    {
      "id": "NR10",
      "title": "Write the operating and recovery runbook",
      "workstream": "demo",
      "status": "planned",
      "week": "3",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 4,
      "description": "Document setup, account ownership, required permissions, daily checks, common errors, data export and how to stop the automation safely. Include a short handover checklist.",
      "acceptance": "Nathan can restore or switch to the documented manual process using the runbook, with no passwords embedded in the document.",
      "dependencies": [
        "NR09"
      ],
      "trelloUrl": "https://trello.com/c/v2UGKyGZ/17-nr10-w3-write-the-operating-and-recovery-runbook"
    },
    {
      "id": "NR11",
      "title": "Draft the three service packages",
      "workstream": "offer",
      "status": "done",
      "week": "1",
      "priority": "high",
      "owner": "Astra",
      "estimatedHours": 0,
      "description": "The brand memo drafts Workflow Reset, One-Flow Pilot and Keep It Running with capped scope. RM650, RM1,800 and RM450/month are planning prices, not validated rates.",
      "acceptance": "Each proposed service states its deliverables, allowance, exclusions and price hypothesis.",
      "dependencies": [
        "NR01"
      ],
      "trelloUrl": "https://trello.com/c/9R5Q4xS3/18-nr11-w1-draft-the-three-service-packages"
    },
    {
      "id": "NR12",
      "title": "Prepare a scoped proposal and onboarding pack",
      "workstream": "offer",
      "status": "planned",
      "week": "3",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 4,
      "description": "Draft the client inputs, one-flow boundary, milestones, acceptance, payment terms, change process, account ownership and offboarding/export steps. Flag terms requiring professional review.",
      "acceptance": "A prospect can tell what is included, excluded, needed from them and how changes are approved. The draft does not claim to be professionally reviewed.",
      "dependencies": [
        "NR11",
        "NR08"
      ],
      "trelloUrl": "https://trello.com/c/2qlhFj2R/19-nr12-w3-prepare-a-scoped-proposal-and-onboarding-pack"
    },
    {
      "id": "NR13",
      "title": "Reprice the pilot from hours and external quotes",
      "workstream": "offer",
      "status": "planned",
      "week": "4",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 3,
      "description": "Record demo hours, likely review costs and support capacity. Reforecast the smaller RM1,800 pilot independently of the earlier RM6,000 setup model. Unknown quotes stay estimates.",
      "acceptance": "A costed pilot worksheet shows delivery effort, third-party cost, contribution and collection assumptions. No hiring or debt decision relies on the obsolete package mix.",
      "dependencies": [
        "NR09",
        "NR11"
      ],
      "trelloUrl": "https://trello.com/c/mi4q0WqU/20-nr13-w4-reprice-the-pilot-from-hours-and-external-quotes"
    },
    {
      "id": "NR14",
      "title": "Draft the public service page and checklist",
      "workstream": "marketing",
      "status": "planned",
      "week": "3",
      "priority": "medium",
      "owner": "Nathan",
      "estimatedHours": 4,
      "description": "Prepare a service page explaining the problem, one-flow pilot, exclusions and next step, plus a useful studio-handoff checklist. Label the business pre-launch and examples illustrative.",
      "acceptance": "The page is understandable without a sales call and contains no invented clients, testimonials, savings or launch claims.",
      "dependencies": [
        "NR03",
        "NR11"
      ],
      "trelloUrl": "https://trello.com/c/I7msbNFC/21-nr14-w3-draft-the-public-service-page-and-checklist"
    },
    {
      "id": "NR15",
      "title": "Record a three-minute illustrative walkthrough",
      "workstream": "marketing",
      "status": "planned",
      "week": "3",
      "priority": "medium",
      "owner": "Nathan",
      "estimatedHours": 3,
      "description": "Show a fictional enquiry/proposal handoff, its assigned owner and the next action. Explain one failure path and why the workflow is useful. Use synthetic data throughout.",
      "acceptance": "A short captioned or transcribed recording clearly says Illustrative demo and contains no real customer data or unproven outcome claim.",
      "dependencies": [
        "NR09"
      ],
      "trelloUrl": "https://trello.com/c/G1xd5Jm0/22-nr15-w3-record-a-three-minute-illustrative-walkthrough"
    },
    {
      "id": "NR16",
      "title": "Research ten possible studio pilot candidates",
      "workstream": "marketing",
      "status": "planned",
      "week": "4",
      "priority": "medium",
      "owner": "Nathan",
      "estimatedHours": 4,
      "description": "Privately note ten plausible Malaysian independent studios, public website/source date and an honest fit reason. Keep fit unverified; no contacting, bulk scraping or guesses about private operations.",
      "acceptance": "Ten candidates have public-source references and explicit qualification gaps. Personal contact details and the prospect list are kept off this public dashboard.",
      "dependencies": [
        "NR07"
      ],
      "trelloUrl": "https://trello.com/c/Ac2FcqSB/23-nr16-w4-research-ten-possible-studio-pilot-candidates"
    },
    {
      "id": "NR17",
      "title": "Prepare a technical reviewer brief and shortlist",
      "workstream": "people",
      "status": "planned",
      "week": "4",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 3,
      "description": "Use official partner/hiring directories to shortlist suitable practitioners. Prepare the same paid synthetic review exercise, including duplicates, missing data, permissions and a failed service.",
      "acceptance": "A private shortlist and scoped brief define deliverables, hours, account ownership, evidence and a budget allowance. No person is described as hired or endorsed.",
      "dependencies": [
        "NR10",
        "NR04"
      ],
      "trelloUrl": "https://trello.com/c/fde3I2zq/24-nr17-w4-prepare-a-technical-reviewer-brief-and-shortlist"
    },
    {
      "id": "NR18",
      "title": "Commission an independent technical review",
      "workstream": "people",
      "status": "planned",
      "week": "future",
      "priority": "high",
      "owner": "Nathan + reviewer",
      "estimatedHours": 0,
      "description": "When ready, obtain a quote and commission a 4–6 hour review of the demo and runbook before live deployment. Keep builder self-review distinguishable from an independent review.",
      "acceptance": "A competent reviewer records findings; critical failures are resolved, recovery is demonstrated and Nathan understands the remaining limits.",
      "dependencies": [
        "NR17",
        "NR13"
      ],
      "trelloUrl": "https://trello.com/c/Q1sdUce3/25-nr18-later-commission-an-independent-technical-review"
    },
    {
      "id": "NR19",
      "title": "Confirm the appropriate business and data advisers",
      "workstream": "people",
      "status": "planned",
      "week": "future",
      "priority": "high",
      "owner": "Nathan + advisers",
      "estimatedHours": 0,
      "description": "Before taking live client work, obtain relevant advice on structure, records, invoicing and contract/data terms. Verify practitioner credentials. A company secretary is conditional on the entity choice.",
      "acceptance": "Applicable business setup and adviser actions are documented; reviewed terms are distinguishable from drafts; engagement costs are quoted before commitment.",
      "dependencies": [
        "NR12",
        "NR13"
      ],
      "trelloUrl": "https://trello.com/c/AM5CsaX6/30-nr19-later-confirm-the-appropriate-business-and-data-advisers"
    },
    {
      "id": "NR20",
      "title": "Prepare the pilot intake and baseline form",
      "workstream": "pilot",
      "status": "planned",
      "week": "4",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 2,
      "description": "Ask about one recurring handoff, current tools, owner authority, daily users and redacted examples. Capture sample size, time spent and missing-owner/next-action counts without claiming savings.",
      "acceptance": "The draft gathers enough information to accept or decline a small pilot and measures the same process before and after.",
      "dependencies": [
        "NR07",
        "NR11"
      ],
      "trelloUrl": "https://trello.com/c/w9dmF38N/27-nr20-w4-prepare-the-pilot-intake-and-baseline-form"
    },
    {
      "id": "NR21",
      "title": "Review month-one readiness and the next gate",
      "workstream": "pilot",
      "status": "planned",
      "week": "4",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 3,
      "description": "Review the 60-hour preparation month, demo evidence, offer, costs and remaining gaps. Decide whether to begin limited discovery in month two or extend preparation. Solo preparation does not validate demand.",
      "acceptance": "A dated readiness decision lists completed evidence, unresolved requirements, remaining human review and the next stage; no paid pilot is invented.",
      "dependencies": [
        "NR10",
        "NR12",
        "NR13",
        "NR14",
        "NR15",
        "NR16",
        "NR17",
        "NR20"
      ],
      "trelloUrl": "https://trello.com/c/YlZPnaIq/28-nr21-w4-review-month-one-readiness-and-the-next-gate"
    },
    {
      "id": "NR22",
      "title": "Validate the problem with owners and daily users",
      "workstream": "pilot",
      "status": "planned",
      "week": "future",
      "priority": "high",
      "owner": "Nathan",
      "estimatedHours": 0,
      "description": "After Nathan chooses to launch, use warm introductions or relevant invitations and asynchronous intake where practical. A planning target is ten substantive conversations/responses and three scoped opportunities.",
      "acceptance": "Actual owner/user evidence establishes a recurring valued problem and current alternatives. Responses, proposals and payments are counted separately.",
      "dependencies": [
        "NR21"
      ],
      "trelloUrl": "https://trello.com/c/bNqH0Odw/31-nr22-later-validate-the-problem-with-owners-and-daily-users"
    },
    {
      "id": "NR23",
      "title": "Deliver and evaluate one paid, bounded pilot",
      "workstream": "pilot",
      "status": "planned",
      "week": "future",
      "priority": "high",
      "owner": "Nathan + client",
      "estimatedHours": 0,
      "description": "Secure the scope and payment, baseline the agreed handoff, deploy only after access/review gates, train the daily user and observe for fourteen days. Keep one implementation active.",
      "acceptance": "Collected payment, accepted behaviours, actual hours, owner/user feedback and comparable observations are recorded privately. A useful outcome is demonstrated without a guaranteed percentage claim.",
      "dependencies": [
        "NR18",
        "NR19",
        "NR22"
      ],
      "trelloUrl": "https://trello.com/c/d8Qb8Sgd/26-nr23-later-deliver-and-evaluate-one-paid-bounded-pilot"
    },
    {
      "id": "NR24",
      "title": "Review retention, support capacity and the next year",
      "workstream": "pilot",
      "status": "planned",
      "week": "future",
      "priority": "medium",
      "owner": "Nathan",
      "estimatedHours": 0,
      "description": "After pilot evidence, decide continue/refine/stop, offer bounded support where useful and update the rolling cash/capacity plan. Plan monthly reviews and quarterly decisions; no recurring automation is claimed active.",
      "acceptance": "Renewal or next-phase evidence, actual contribution and manageable support load justify the next commitment; future hiring follows funded recurring demand.",
      "dependencies": [
        "NR23"
      ],
      "trelloUrl": "https://trello.com/c/w17ueRQZ/29-nr24-later-review-retention-support-capacity-and-the-next-year"
    }
  ],
  "services": [
    {
      "name": "Workflow Reset",
      "price": "RM650 · test price",
      "scope": "One workflow diagnosis, process map, bottlenecks and prioritised recommendations. About 4–6 founder hours; one clarification round.",
      "exclusions": "Implementation, live system access and professional legal/tax advice. Software and additional specialist work separately scoped."
    },
    {
      "name": "One-Flow Pilot",
      "price": "RM1,800 · test price",
      "scope": "One intake form, one board, up to two basic internal reminder rules, SOP, handover and a fourteen-day observation period. Up to five users; about 12–20 delivery hours.",
      "exclusions": "Custom apps, complex API/accounting/WhatsApp integration, migration, executing payments, unlimited revisions or 24/7 support. Diagnostic is separate."
    },
    {
      "name": "Keep It Running",
      "price": "RM450/month · test price",
      "scope": "Monthly workflow health check and up to two hours of minor changes/support. Business-hours service; acknowledge within two business days.",
      "exclusions": "Guaranteed resolution time, emergency cover, new workflows and unused-hour rollover. Available only after a functioning implementation."
    }
  ],
  "learning": [
    {
      "title": "Microsoft Learn · Process owner concepts",
      "url": "https://learn.microsoft.com/en-us/training/paths/process-mining-process-owner/",
      "why": "Learn to describe waiting, ownership and exceptions before choosing tools. Use the concepts without buying process-mining software."
    },
    {
      "title": "Make Academy",
      "url": "https://academy.make.com/",
      "why": "Self-paced foundation, data and routing lessons; build one fake enquiry-to-board example as evidence of understanding."
    },
    {
      "title": "Make Help Center",
      "url": "https://help.make.com/",
      "why": "Use official troubleshooting guidance to explain logs, failures, retries and the manual fallback."
    },
    {
      "title": "Microsoft Learn · Power Automate",
      "url": "https://learn.microsoft.com/en-us/training/modules/get-started-flows/",
      "why": "An optional alternative if the future pilot relies on Microsoft 365. Account/licence prerequisites still apply."
    },
    {
      "title": "Malaysia data-protection principles",
      "url": "https://www.pdp.gov.my/ppdpv1/en/principles-of-personal-data-protection/",
      "why": "Prepare a data map, access/retention checklist and incident path; confirm applicable obligations before live work."
    },
    {
      "title": "n8n Academy · later option",
      "url": "https://learn.n8n.io/",
      "why": "Only when an actual integration requirement justifies a second platform; not part of the month-one learning goal."
    }
  ],
  "people": [
    {
      "role": "Nathan · consultant and delivery owner",
      "when": "Month one",
      "scope": "Own diagnosis, scope, synthetic demo, documentation and decisions. Astra supports research, practice and drafts.",
      "budget": "60 founder hours; no employee required"
    },
    {
      "role": "Independent automation mentor/reviewer",
      "when": "Demo ready; before live deployment",
      "scope": "A 4–6 hour review of correctness, duplicates, access, recovery and handover; teach Nathan to troubleshoot.",
      "budget": "RM600–1,200 planning allowance; obtain quote"
    },
    {
      "role": "Malaysia accountant / appropriate tax adviser",
      "when": "Before the first paid engagement",
      "scope": "Review structure questions, business records, invoicing and applicable tax responsibilities; verify credentials.",
      "budget": "RM300–800 initial planning allowance; obtain quote"
    },
    {
      "role": "Commercial/privacy lawyer",
      "when": "Before client contracts/data processing where needed",
      "scope": "Review scope, access/data terms, liability and subcontractor clauses; complexity may change the fee.",
      "budget": "RM600–1,500 planning allowance; obtain quote"
    },
    {
      "role": "Company secretary",
      "when": "Conditional: if a company is incorporated",
      "scope": "Incorporation and statutory administration with an appropriately qualified practitioner.",
      "budget": "Current package quote required; not needed for every structure"
    },
    {
      "role": "Freelance automation implementer",
      "when": "Only if the live build exceeds Nathan's competence",
      "scope": "One approved deliverable, runbook and workflow export; engage only when price and delivery margin justify it.",
      "budget": "RM1,000–3,000 planning allowance; not an automatic pilot cost"
    },
    {
      "role": "Client owner and daily user",
      "when": "Discovery and every live pilot",
      "scope": "Explain real work, authorise changes, confirm the baseline, test the handoff and approve acceptance.",
      "budget": "Client time agreed in scope; no salary assumption"
    },
    {
      "role": "Part-time operations assistant",
      "when": "After repeated paid demand",
      "scope": "Routine checklists, documentation and support only when recurring contribution can fund the role.",
      "budget": "Quote later; no current headcount commitment"
    }
  ],
  "sources": [
    {
      "title": "SSM · Company name search",
      "url": "https://www.ssm.com.my/Pages/Register_Business_Company_LLP/Company/Name-Search-Company.aspx"
    },
    {
      "title": "MyIPO · IP Online",
      "url": "https://iponline2u.myipo.gov.my/"
    },
    {
      "title": "Make · Partner Directory",
      "url": "https://www.make.com/en/partners-directory"
    },
    {
      "title": "Make Community · Hire a Pro",
      "url": "https://community.make.com/c/hire-a-pro/50"
    },
    {
      "title": "Malaysian Bar · Legal Directory",
      "url": "https://legaldirectory.malaysianbar.org.my/"
    },
    {
      "title": "MIA · Member/firm verification form (older document; confirm procedure)",
      "url": "https://mia.org.my/storage/2022/05/MIA_Membership_Member_Firms_Search_Form-1.pdf"
    },
    {
      "title": "SSM · Company secretary information",
      "url": "https://www.ssm.com.my/Pages/Product/Company-Information.aspx"
    },
    {
      "title": "Malaysian Digital Association · Ecosystem context",
      "url": "https://malaysiandigitalassociation.org.my/about-us/"
    },
    {
      "title": "4As Malaysia · Agency ecosystem",
      "url": "https://aaaa.org.my/v2/"
    },
    {
      "title": "SME Association of Malaysia",
      "url": "https://smemalaysia.org/"
    },
    {
      "title": "MDEC · Business Digitalisation Initiative",
      "url": "https://www.mdec.my/programmes/business-digitalisation-initiative"
    }
  ],
  "decisions": [
    {
      "title": "One active venture",
      "status": "Decided",
      "detail": "Nathan selected workflow consulting. GuestLoop and ShelfSignal are deferred; archived material remains available."
    },
    {
      "title": "NeatRelay working brand",
      "status": "Review pending",
      "detail": "English-led naming and teal palette are proposed. Public-web screening is limited; SSM, trademark, domain and handle checks remain pending."
    },
    {
      "title": "Creative/marketing studios, 2–8 people",
      "status": "Hypothesis",
      "detail": "Selected for a remotely demonstrable handoff problem. Owner age informs tone, not eligibility. Demand and ability to pay are unvalidated."
    },
    {
      "title": "A quiet first month",
      "status": "Planning assumption",
      "detail": "Four relative weeks at fifteen hours each: understand, build, package and prepare. No outreach is required during the sixty-hour preparation month."
    },
    {
      "title": "Modern tools, practical management",
      "status": "Proposed",
      "detail": "Use asynchronous intake, visual maps and modest automation; retain clear owners, approval rules, training and a manual fallback."
    },
    {
      "title": "Pilot pricing replaces the old package mix",
      "status": "Reforecast required",
      "detail": "RM650 / RM1,800 / RM450 are test prices. The earlier RM6,000 setup forecast cannot support decisions for this narrower pilot. Reforecast before hiring, debt or expansion."
    },
    {
      "title": "No employee in month one",
      "status": "Proposed",
      "detail": "Prepare a technical review brief; engage appropriate advisers and a competent reviewer before live work. A permanent team follows evidence and funded capacity."
    },
    {
      "title": "Public dashboard and Trello are separate views",
      "status": "Manual reconciliation",
      "detail": "Browser edits are local until exported or deliberately copied. The Trello board is the shared execution record; this website is a planning companion. No automatic two-way sync is connected."
    },
    {
      "title": "Evidence before traction claims",
      "status": "Required",
      "detail": "Synthetic demos establish capability only. Real owner/user discovery, collected payment and observed adoption are future work."
    }
  ]
};
