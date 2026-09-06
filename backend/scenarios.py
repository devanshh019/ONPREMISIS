from typing import List, Dict, Any

PRELOADED_SCENARIOS: List[Dict[str, Any]] = [
    {
        "id": "scenario-api510",
        "title": "Refinery API 510 Pressure Vessel Inspection & Approval Note",
        "badge": "Asset Integrity & Board Note",
        "badge_color": "rose",
        "target_model": "Gemma 3 4B (Reasoning & Policy)",
        "deliverables": [".docx Approval Note", ".xlsx Formulas", ".pptx Deck"],
        "description": "Parses scanned ultrasonic thickness data for Crude Column C-101, calculates remaining safe life via API 510, and generates an official PSU Board Note.",
        "prompt": "Review scanned ultrasonic thickness testing (UTT) report for Distillation Column C-101 (operating at 350°C, 18.5 bar). Calculate corrosion rate and remaining life per API 510, check against ASME Sec VIII minimum wall thickness, and draft a formal PSU Approval Note (.docx) and calculation workbook (.xlsx) for the upcoming turnaround."
    },
    {
        "id": "scenario-thermal",
        "title": "Sandboxed Heat Exchanger Simulation & Code Verification",
        "badge": "Python Sandbox & Math",
        "badge_color": "cyan",
        "target_model": "Qwen 2.5 Coder 7B (Code Sandbox & Math)",
        "deliverables": [".py Executed Script", ".png Temperature Curve", "Thermal Summary"],
        "description": "Writes & runs an isolated Python simulation for Heat Exchanger E-204, calculating LMTD, thermal duty, and rendering Matplotlib temperature curves.",
        "prompt": "Write and execute a Python simulation for Shell & Tube Heat Exchanger E-204 in the sandbox. Calculate Heat Duty (Q), LMTD, and Overall Heat Transfer Coefficient (U) under counter-current flow (Hot: 280°C->160°C @ 35 kg/s; Cold: 45°C->130°C). Plot temperature profiles across tube length and verify energy conservation."
    },
    {
        "id": "scenario-pid",
        "title": "Multimodal P&ID Drawing Safety & Tag Discrepancy Audit",
        "badge": "Vision & Drawing OCR",
        "badge_color": "emerald",
        "target_model": "LLaVA 7B (Multimodal & P&ID Vision)",
        "deliverables": ["Annotated P&ID Blueprint", "Visual Bounding Boxes", "Safety Audit"],
        "description": "Visual coordinate inspection of P&ID drawing PID-ADU2-04-102, detecting control valves and flagging missing Double Block & Bleed isolation per SOP-SAF-402.",
        "prompt": "Inspect the P&ID drawing for Crude Feed Pre-Flash Train (PID-ADU2-04-102-REV4). Identify all control valves and transmitters, check the bypass line around FV-104 against refinery standard SOP-SAF-402, flag missing Double Block and Bleed (DBB) isolation, and generate a visual safety audit."
    },
    {
        "id": "scenario-procurement",
        "title": "PSU Tender Evaluation & GFR-2017 Public Procurement Note",
        "badge": "GFR 2017 & Governance",
        "badge_color": "amber",
        "target_model": "Gemma 3 4B (GFR 2017 & PSU Contracts)",
        "deliverables": [".docx Tender Note", "Commercial Deviation Matrix"],
        "description": "Evaluates PSU vendor bids against General Financial Rules (GFR 2017 Rule 144) and drafts a formal Tender Committee approval note.",
        "prompt": "Evaluate vendor technical bids for High-Pressure Boiler Feed Pump Spares against General Financial Rules (GFR 2017) Rule 144. Prepare a comparative evaluation note for the Tender Committee with commercial deviation analysis."
    }
]