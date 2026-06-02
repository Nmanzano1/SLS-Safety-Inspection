import { useState, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import "jspdf-autotable";

// ─── FIREBASE CONFIG ───────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyB9TclNJFPnLIawkPNBLxUKbSZctRboleo",
  authDomain: "sls-safety-inspection.firebaseapp.com",
  projectId: "sls-safety-inspection",
  storageBucket: "sls-safety-inspection.firebasestorage.app",
  messagingSenderId: "429326685754",
  appId: "1:429326685754:web:c54ef96173829612934703",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STORAGE_KEYS = {
  INSPECTIONS: "sls_inspections",
  DEFICIENCIES: "sls_deficiencies",
};

async function loadData(key) {
  try {
    const docRef = doc(db, "sls_data", key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().items || [];
    }
    return [];
  } catch (e) {
    console.error("Load error:", e);
    return [];
  }
}

async function saveData(key, data) {
  try {
    const docRef = doc(db, "sls_data", key);
    await setDoc(docRef, { items: data });
    return true;
  } catch (e) {
    console.error("Save error:", e);
    return false;
  }
}

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const INSPECTORS = ["Nathan Salinas (Safety Department)", "Nicholas Manzano (Safety Department)", "Other"];
const INSPECTION_TYPES = ["Daily Safety Inspection", "Periodic Safety Inspection"];
const WEATHER_CONDITIONS = ["Clear / Sunny", "Partly Cloudy", "Overcast / Cloudy", "Rain / Thunderstorm", "High Winds / Dust"];
const SUBCONTRACTORS = [
  "Ultimate Concrete, LLC",
  "S&K Design Build",
  "Strong Steel",
  "P&C Utility Locators",
  "H&S Construction",
  "Fuqua Construction",
  "Other",
];

const INSPECTION_SECTIONS = [
  {
    id: "admin",
    label: "General Site & Administrative",
    items: [
      "Emergency contact numbers posted on site (bathrooms / site office)",
      "Emergency muster point sign posted and location communicated to all workers",
      "First aid kit stocked, accessible, and inspected",
      "SDS / HazCom binder available on site and accessible to all workers digitally",
      "Activity Hazard Analyses (AHAs) on site with subcontractor foreman",
      "Competent Person identified and on site for applicable tasks",
      "Personnel have valid site badges",
      "No unauthorized personnel observed in the construction area",
      "Heat illness prevention plan in effect; workers monitored when temp ≥80°F (EM 385-1-1 §06.B)",
      "Subcontractor supervisor has documented cool down break schedule for the day",
      "Adequate potable water on site and accessible to all workers",
    ],
  },
  {
    id: "ppe",
    label: "PPE & General Safety",
    items: [
      "Hard hats worn by all personnel in the work area",
      "All personnel wearing safety glasses",
      "Face shields used when required (cutting, chipping, chemicals)",
      "Hi-vis vest (ANSI Class 2 minimum) worn in work zone",
      "Safety footwear (steel-toed) worn by all field personnel",
      "Appropriate gloves worn for task (cut, chemical, heat, etc.)",
      "Hearing protection in place when required",
      "Dust masks used where required",
      "All PPE in serviceable condition — damaged PPE removed from service",
    ],
  },
  {
    id: "fall",
    label: "Elevated Work",
    items: [
      "Fall protection in use at 6 ft or greater above lower level",
      "Personal fall arrest systems properly donned and connected to rated anchor",
      "Harnesses inspected — no visible defects",
      "Lanyards / SRL inspected — no damage, hooks latch and lock properly",
      "Hole covers in place, labeled 'HOLE,' and secured against displacement",
      "Leading edges protected",
      "All workers using fall protection have documented training on file — trained by Competent Person (EM 385-1-1 §21.C.05 / §1926.503)",
      "MEWP/aerial lift operator is authorized in writing; operator certification on file (EM 385-1-1 §22.M.03 / §1926.453(b)(2)(ii))",
      "Ladders in good condition — no broken rungs, rails, or hardware",
      "Ladders secured at top and/or bottom; extend 3 ft above landing",
      "Correct ladder angle maintained (4:1 ratio) for straight ladders",
      "Three points of contact maintained while climbing",
    ],
  },
  {
    id: "excavation",
    label: "Excavation & Trenching",
    items: [
      "Competent Person has visually and manually inspected excavation / assessed soil conditions; protective system appropriate for conditions observed",
      "Excavations >5 ft protected — sloped, shored, shield/box in place, delineator barricades in place",
      "Spoil piles ≥2 ft from excavation edge",
      "Safe egress within 25 ft of all workers in trench — required at 4 ft depth",
      "No water accumulation in excavations; dewatering in place if needed",
      "Open excavations protected with cones or delineators",
      "Concrete trucks and heavy equipment staying ≥6 ft from excavation edge — surcharge load controlled",
    ],
  },
  {
    id: "equipment",
    label: "Equipment Operations",
    items: [
      "I have verified with a minimum of 3 equipment operators (excavator, motor grader, articulated truck, or similar) that their daily inspection forms have been filled out — forms physically confirmed",
      "Operators have valid certifications / authorizations on file",
      "Backup / reverse alarms functional on all equipment",
      "Seat belts in use on all applicable equipment",
      "Drip pans in place under stationary equipment to contain fluids",
      "All POVs and equipment parked only in designated areas — no vehicles in active work zones or equipment travel paths",
      "Equipment operators not traveling with a load that obstructs forward visibility; eye contact established with ground personnel and spotter assigned when view is obstructed",
      "Equipment travel paths clear of personnel and obstructions",
      "No equipment left running and unattended in active work zone",
    ],
  },
  {
    id: "rigging",
    label: "Rigging & Lifting",
    items: [
      "Qualified Rigger designated and present for all rigging operations",
      "All slings, shackles, hooks, and hardware inspected before each use — no damage, kinks, cuts, heat damage, or deformation; tagged out if found deficient",
      "SWL / WLL ratings visible and legible on all rigging hardware",
      "Tag lines in use to control suspended loads",
      "Lift plans approved, on site, and reviewed with crew prior to lift",
      "No personnel standing directly underneath MEWP during clamp installation",
      "No personnel under suspended load at any time",
      "All tools tethered when working at height",
    ],
  },
  {
    id: "electrical",
    label: "Electrical",
    items: [
      "GFCI protection in use on all temporary power outlets and cords",
      "Extension cords in good condition — no cuts, splices, exposed wire, or damage; correct gauge for amperage load",
      "Electrical panels labeled; knockouts and covers in place",
      "LOTO procedures active for all energy isolation tasks",
      "Locks and tags applied by authorized employees — verified before work began",
    ],
  },
  {
    id: "hotwork",
    label: "Hot Work",
    items: [
      "Hot work permit issued / valid for all cutting/welding",
      "Area surveyed and clear of combustible materials within 35 ft of hot work",
      "Fire extinguisher (min. 10 lbs ABC) immediately available at hot work location",
      "Fire watch assigned and present during hot work operations",
      "Fire watch maintained for ≥1 hour after hot work completion",
    ],
  },
  {
    id: "housekeeping",
    label: "Housekeeping",
    items: [
      "Work area housekeeping acceptable — debris and scrap removed or controlled",
      "Materials stored safely — stacked and stable, not blocking egress",
      "Concrete rubble piles removed or protected from vehicle impact",
      "Walking / working surfaces clear of slip, trip, and fall hazards",
      "Emergency access routes and site entrance clear at all times",
      "Sanitation / portable toilet facilities clean and accessible on site",
    ],
  },
  {
    id: "traffic",
    label: "Traffic Control",
    items: [
      "All required traffic control signs in place, upright, and legible",
      "Flaggers certified and properly equipped",
      "Staged material protected from vehicles",
    ],
  },
  {
    id: "environmental",
    label: "Environmental",
    items: [
      "Spill kit available, stocked, and in accessible location",
      "Concrete washout pits not overflowing",
      "SWPPP BMPs maintained and inspected",
      "Concrete washout contained",
      "Noise and dust controls implemented",
    ],
  },
  {
    id: "utility",
    label: "Utility Locates",
    items: [
      "811 one-call notification completed, clearance confirmed, and field markers align with KMZ / project utility file",
      "Utilities potholed to maintain positive ID prior to mechanical excavation where applicable",
      "Is a utility rep / owner representative on site?",
      "Are the utility markings in the field maintained and legible throughout the work area?",
      "Are crews maintaining a 2-foot buffer by hand digging or using a hydrovac within the tolerance zone?",
    ],
  },
];

const STATUS_OPTIONS = ["✓ Satisfactory", "✗ Deficiency", "N/A"];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem("sls_auth") === "true";
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [view, setView] = useState("dashboard");
  const [inspections, setInspections] = useState([]);
  const [deficiencies, setDeficiencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");

  const handleLogin = () => {
    if (passwordInput === "Fishing") {
      localStorage.setItem("sls_auth", "true");
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
      setPasswordInput("");
    }
  };

  useEffect(() => {
    // Always stop loading after 3 seconds max
    const timeout = setTimeout(() => setLoading(false), 3000);
    if (!authenticated) {
      clearTimeout(timeout);
      setLoading(false);
      return;
    }
    async function init() {
      try {
        const [insp, defs] = await Promise.all([
          loadData(STORAGE_KEYS.INSPECTIONS),
          loadData(STORAGE_KEYS.DEFICIENCIES),
        ]);
        setInspections(insp);
        setDeficiencies(defs);
      } catch(e) {
        console.error("Firebase load error:", e);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    }
    init();
  }, [authenticated]);

  const submitInspection = useCallback(async (formData) => {
    const newInspection = {
      id: genId(),
      submittedAt: new Date().toISOString(),
      ...formData,
    };
    // extract deficiencies
    const newDefs = [];
    INSPECTION_SECTIONS.forEach((sec) => {
      sec.items.forEach((item, i) => {
        const key = `${sec.id}_${i}`;
        if (formData.itemStatus?.[key] === "✗ Deficiency") {
          newDefs.push({
            id: genId(),
            inspectionId: newInspection.id,
            date: formData.date,
            inspector: formData.inspector,
            subcontractors: formData.subcontractors || [],
            section: sec.label,
            item,
            itemKey: key,
            remarks: formData.itemRemarks?.[key] || "",
            correctiveAction: "",
            responsibleParty: "",
            dueDate: "",
            status: "Open",
            closedDate: "",
            enforcementAction: "Verbal Notice",
            enforcementHistory: [
              { action: "Verbal Notice", date: formData.date, note: "Identified during inspection" }
            ],
            notifiedDate: "",
            verifiedDate: "",
            isRepeat: false,
          });
        }
      });
    });

    const updatedInspections = [newInspection, ...inspections];
    // Mark repeats — same itemKey flagged before in any prior inspection
    const priorItemKeys = new Set(deficiencies.map((d) => d.itemKey).filter(Boolean));
    newDefs.forEach((d) => { if (priorItemKeys.has(d.itemKey)) d.isRepeat = true; });
    const updatedDefs = [...newDefs, ...deficiencies];

    setSaveStatus("saving");
    const ok1 = await saveData(STORAGE_KEYS.INSPECTIONS, updatedInspections);
    const ok2 = await saveData(STORAGE_KEYS.DEFICIENCIES, updatedDefs);

    if (ok1 && ok2) {
      setInspections(updatedInspections);
      setDeficiencies(updatedDefs);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 3000);
      setView("dashboard");
    } else {
      setSaveStatus("error");
    }
  }, [inspections, deficiencies]);

  const updateDeficiency = useCallback(async (id, updates) => {
    const updated = deficiencies.map((d) => d.id === id ? { ...d, ...updates } : d);
    await saveData(STORAGE_KEYS.DEFICIENCIES, updated);
    setDeficiencies(updated);
  }, [deficiencies]);

  const deleteInspection = useCallback(async (id) => {
    if (!window.confirm("Delete this inspection? This cannot be undone.")) return;
    const updatedInspections = inspections.filter((i) => i.id !== id);
    const updatedDefs = deficiencies.filter((d) => d.inspectionId !== id);
    await saveData(STORAGE_KEYS.INSPECTIONS, updatedInspections);
    await saveData(STORAGE_KEYS.DEFICIENCIES, updatedDefs);
    setInspections(updatedInspections);
    setDeficiencies(updatedDefs);
  }, [inspections, deficiencies]);

  if (!authenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1923", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif", padding: 24 }}>
        <div style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderTop: "3px solid #D4AF37", borderRadius: 12, padding: 40, width: "100%", maxWidth: 380, textAlign: "center" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 28, color: "#D4AF37", letterSpacing: 2 }}>SLS</div>
            <div style={{ fontSize: 13, color: "#888", marginTop: 4, letterSpacing: 1 }}>SAFETY INSPECTION SYSTEM</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>RGV Barriers & Attributes</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter password"
              style={{ width: "100%", background: "#0a1018", border: `1px solid ${passwordError ? "#f44336" : "#1e3a5f"}`, borderRadius: 8, color: "#e8e8e8", padding: "14px 16px", fontSize: 15, boxSizing: "border-box", outline: "none", textAlign: "center", letterSpacing: 2 }}
            />
            {passwordError && <div style={{ color: "#f44336", fontSize: 12, marginTop: 8 }}>Incorrect password. Try again.</div>}
          </div>
          <button
            onClick={handleLogin}
            style={{ width: "100%", background: "linear-gradient(135deg,#B8972A,#D4AF37)", border: "none", borderRadius: 8, padding: "14px", fontWeight: 800, fontSize: 15, color: "#0a1018", cursor: "pointer", letterSpacing: 1 }}
          >
            ACCESS SYSTEM
          </button>
          <div style={{ marginTop: 20, fontSize: 11, color: "#444" }}>Contract #70B01C23F00001236</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1923", fontFamily: "'Barlow', 'Segoe UI', sans-serif", color: "#e8e8e8" }}>
      {/* TOP NAV */}
      <nav style={{ background: "#0a1018", borderBottom: "3px solid #B8972A", padding: "0 24px", display: "flex", alignItems: "center", gap: 0, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 20px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 12, padding: "4px 0", flexShrink: 0 }}>
          <img src="data:image/png;base64,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" alt="SLS" style={{ height: 28, width: "auto", objectFit: "contain" }} />
          <div style={{ borderLeft: "1px solid #1e3a5f", paddingLeft: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#D4AF37", whiteSpace: "nowrap" }}>Safety Inspection</div>
            <div style={{ fontSize: 9, color: "#666", letterSpacing: 0.5, whiteSpace: "nowrap" }}>RGV Barriers & Attributes</div>
          </div>
        </div>
        {[
          { key: "dashboard", label: "📊 Dashboard" },
          { key: "form", label: "📋 New Inspection" },
          { key: "deficiencies", label: "⚠️ Deficiency Log" },
          { key: "reports", label: "📈 Reports" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "16px 12px", fontSize: 12, fontWeight: view === tab.key ? 700 : 400,
              color: view === tab.key ? "#D4AF37" : "#888",
              borderBottom: view === tab.key ? "3px solid #D4AF37" : "3px solid transparent",
              marginBottom: -3, transition: "all 0.2s", letterSpacing: 0.5,
            }}
          >
            {tab.label}
          </button>
        ))}
        {saveStatus && (
          <div style={{ marginLeft: "auto", fontSize: 12, padding: "6px 14px", borderRadius: 4,
            background: saveStatus === "saved" ? "#1a3a1a" : saveStatus === "error" ? "#3a1a1a" : "#1a2a3a",
            color: saveStatus === "saved" ? "#4caf50" : saveStatus === "error" ? "#f44336" : "#64b5f6",
            border: `1px solid ${saveStatus === "saved" ? "#4caf50" : saveStatus === "error" ? "#f44336" : "#64b5f6"}`,
          }}>
            {saveStatus === "saving" ? "⏳ Saving..." : saveStatus === "saved" ? "✓ Saved" : "✗ Save Error"}
          </div>
        )}
      </nav>

      {/* VIEWS */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 16px" }}>
        {view === "dashboard" && <Dashboard inspections={inspections} deficiencies={deficiencies} onDelete={deleteInspection} />}
        {view === "form" && <InspectionForm onSubmit={submitInspection} />}
        {view === "deficiencies" && <DeficiencyLog deficiencies={deficiencies} onUpdate={updateDeficiency} />}
        {view === "reports" && <Reports inspections={inspections} deficiencies={deficiencies} />}
      </div>
    </div>
  );
}

// ─── PDF GENERATOR ─────────────────────────────────────────────────────────────
function cleanStatus(raw) {
  if (!raw) return "--";
  const s = String(raw);
  if (s.includes("Satisfactory") || s.includes("Satisf")) return "PASS";
  if (s.includes("Deficiency") || s.includes("Defic")) return "DEFICIENCY";
  if (s.includes("N/A")) return "N/A";
  if (s.includes("PASS")) return "PASS";
  if (s.includes("DEFICIENCY")) return "DEFICIENCY";
  return "--";
}

function cleanText(str) {
  if (!str) return "";
  // Force ASCII only - replace any non-ASCII with empty string
  const s = String(str);
  let result = "";
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code >= 32 && code <= 126) result += s[i];
    else if (code === 10 || code === 13) result += " ";
  }
  return result.replace(/\s+/g, " ").trim();
}
function generateInspectionPDF(inspection, deficiencies) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gold = [184, 151, 42];
  const navy = [15, 25, 35];
  const dark = [30, 40, 55];

  // Header background
  doc.setFillColor(...navy);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFillColor(...gold);
  doc.rect(0, 28, pageW, 1, "F");

  // Logo text
  doc.setTextColor(...gold);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("SLS", margin, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text("SAFETY INSPECTION SYSTEM", margin + 14, 13);
  doc.text("RGV Barriers & Attributes  |  Contract #70B01C23F00001236", margin + 14, 19);

  // Report title
  doc.setTextColor(...gold);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(inspection.inspectionType || "Daily Safety Inspection", pageW - margin, 18, { align: "right" });

  // Project Info Table
  let y = 35;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  const infoData = [
    ["Date", inspection.date || "--", "Inspector", inspection.inspector || "--"],
    ["Project Area", inspection.projectArea || "--", "Weather", inspection.weather || "--"],
    ["Subcontractors", Array.isArray(inspection.subcontractors) ? inspection.subcontractors.join(", ") : (inspection.subcontractors || "--"), "Temp High / Low", `${inspection.tempHigh || "--"}°F / ${inspection.tempLow || "--"}°F`],
    ["AHA Sign-In Verified", inspection.ahaSignedIn ? "YES" : "NO", "Toolbox Talk", inspection.toolboxTopic || "None"],
  ];

  doc.autoTable({
    startY: y,
    body: infoData,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 30, 30] },
    columnStyles: {
      0: { fontStyle: "bold", fillColor: [240, 240, 240], cellWidth: 35 },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", fillColor: [240, 240, 240], cellWidth: 35 },
      3: { cellWidth: 55 },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Inspection Sections
  INSPECTION_SECTIONS.forEach((sec) => {
    const rows = sec.items.map((item, i) => {
      const key = `${sec.id}_${i}`;
      const rawStatus = inspection.itemStatus?.[key] || "";
      const status = cleanStatus(rawStatus);
      const remark = cleanText(inspection.itemRemarks?.[key] || "");
      // Clean the item text - remove special chars like >= symbols, section signs
      const cleanItem = cleanText(item)
        .replace(/>=/g, ">=")
        .replace(/sec\./gi, "Sec.");
      return [cleanItem, status, remark];
    });

    const hasContent = rows.some(r => r[1] !== "--");
    if (!hasContent) return;

    doc.autoTable({
      startY: y,
      head: [[{ content: sec.label, colSpan: 3, styles: { fillColor: navy, textColor: gold, fontStyle: "bold", fontSize: 9 } }],
             ["Inspection Item", "Status", "Remarks"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: dark, textColor: [200, 200, 200], fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 110 },
        1: { cellWidth: 28, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 42 },
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && data.cell.raw === "DEFICIENCY") {
          data.cell.styles.textColor = [220, 50, 50];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.column.index === 1 && data.cell.raw === "PASS") {
          data.cell.styles.textColor = [40, 160, 40];
        }
      },
      margin: { left: margin, right: margin },
    });

    y = doc.lastAutoTable.finalY + 4;
  });

  // Deficiencies section
  const inspDefs = deficiencies.filter(d => d.inspectionId === inspection.id);
  if (inspDefs.length > 0) {
    doc.autoTable({
      startY: y,
      head: [[{ content: "DEFICIENCIES & CORRECTIVE ACTIONS", colSpan: 5, styles: { fillColor: [150, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 } }],
             ["#", "Section", "Deficiency", "Corrective Action", "Status"]],
      body: inspDefs.map((d, i) => [
        i + 1,
        d.section,
        d.item,
        d.correctiveAction || "Pending",
        d.status,
      ]),
      theme: "grid",
      headStyles: { fillColor: [80, 20, 20], textColor: [220, 180, 180], fontSize: 7.5 },
      styles: { fontSize: 7.5, cellPadding: 2, overflow: "linebreak" },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 32 },
        2: { cellWidth: 68 },
        3: { cellWidth: 52 },
        4: { cellWidth: 20, halign: "center" },
      },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  // Notes
  if (inspection.generalObservations || inspection.nearMisses || inspection.additionalNotes) {
    doc.autoTable({
      startY: y,
      head: [[{ content: "ADDITIONAL NOTES & OBSERVATIONS", colSpan: 2, styles: { fillColor: dark, textColor: gold, fontStyle: "bold", fontSize: 9 } }]],
      body: [
        inspection.generalObservations ? ["General Observations", inspection.generalObservations] : null,
        inspection.nearMisses ? ["Near-Miss / Incident", inspection.nearMisses] : null,
        inspection.additionalNotes ? ["Additional Notes", inspection.additionalNotes] : null,
      ].filter(Boolean),
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2.5, overflow: "linebreak" },
      columnStyles: { 0: { cellWidth: 40, fontStyle: "bold", fillColor: [240, 240, 240] }, 1: { cellWidth: 140 } },
      margin: { left: margin, right: margin },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  // Signature block
  const sigY = Math.max(y, doc.internal.pageSize.getHeight() - 35);
  doc.setFillColor(...navy);
  doc.rect(0, sigY, pageW, 35, "F");
  doc.setFillColor(...gold);
  doc.rect(0, sigY, pageW, 0.5, "F");

  doc.setTextColor(...gold);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICATION", margin, sigY + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(7);
  doc.text("I certify that to the best of my knowledge, the information in this inspection is accurate and complete, and that all identified deficiencies", margin, sigY + 12);
  doc.text("have been or are being corrected per OSHA 29 CFR 1926, EM 385-1-1, and project-specific Activity Hazard Analyses.", margin, sigY + 16);

  doc.setDrawColor(...gold);
  doc.line(margin, sigY + 26, margin + 80, sigY + 26);
  doc.line(pageW - margin - 50, sigY + 26, pageW - margin, sigY + 26);
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.text("Signature / SSHO", margin, sigY + 30);
  doc.text("Date", pageW - margin - 50, sigY + 30);

  // Footer
  doc.setTextColor(...gold);
  doc.setFontSize(6.5);
  doc.text(`SLS Safety  |  ${inspection.inspectionType || "Daily Safety Inspection"}  |  ${inspection.date || ""}  |  OSHA 29 CFR 1926 Compliant`, pageW / 2, sigY + 33, { align: "center" });

  const filename = `SLS_Inspection_${(inspection.date || "").replace(/-/g, "")}_${(inspection.inspector || "").split(" ")[0]}.pdf`;
  doc.save(filename);
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ inspections, deficiencies, onDelete }) {
  const now = new Date();
  const thisMonth = inspections.filter((i) => {
    const d = new Date(i.submittedAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisWeek = inspections.filter((i) => {
    const d = new Date(i.submittedAt);
    const diff = (now - d) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  const openDefs = deficiencies.filter((d) => d.status === "Open");
  const closedDefs = deficiencies.filter((d) => d.status === "Closed");
  const overdueDefs = openDefs.filter((d) => d.dueDate && new Date(d.dueDate) < now);

  const totalItems = inspections.reduce((sum, ins) => {
    return sum + Object.values(ins.itemStatus || {}).filter((v) => v !== "N/A").length;
  }, 0);
  const defItems = inspections.reduce((sum, ins) => {
    return sum + Object.values(ins.itemStatus || {}).filter((v) => v === "✗ Deficiency").length;
  }, 0);
  const complianceRate = totalItems > 0 ? Math.round(((totalItems - defItems) / totalItems) * 100) : 100;

  const Card = ({ label, value, sub, color = "#D4AF37", accent }) => (
    <div style={{ background: "#111d2b", border: `1px solid ${accent || "#1e3a5f"}`, borderTop: `3px solid ${color}`, borderRadius: 8, padding: "20px 24px", flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>{sub}</div>}
    </div>
  );

  const recentByInspector = {};
  inspections.slice(0, 30).forEach((ins) => {
    const name = ins.inspector || "Unknown";
    if (!recentByInspector[name]) recentByInspector[name] = 0;
    recentByInspector[name]++;
  });

  const defsBySection = {};
  deficiencies.forEach((d) => {
    if (!defsBySection[d.section]) defsBySection[d.section] = 0;
    defsBySection[d.section]++;
  });

  // ── Controlling Employer Alert Logic ──
  const staleVerbalDefs = openDefs.filter((d) => {
    if (d.enforcementAction !== "Verbal Notice") return false;
    const identified = new Date(d.date);
    const daysSince = (now - identified) / (1000 * 60 * 60 * 24);
    return daysSince >= 3;
  });
  const repeatDefs = deficiencies.filter((d) => d.isRepeat && d.status === "Open");
  const unnotifiedDefs = openDefs.filter((d) => !d.notifiedDate);
  const unverifedClosedDefs = deficiencies.filter((d) => d.status === "Closed" && !d.verifiedDate);

  const hasAlerts = staleVerbalDefs.length > 0 || repeatDefs.length > 0 || overdueDefs.length > 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#D4AF37", marginBottom: 4 }}>Safety Dashboard</h1>
        <p style={{ color: "#666", fontSize: 13 }}>Contract #70B01C23F00001236 · RGV Barriers & Attributes</p>
      </div>

      {inspections.length === 0 ? (
        <div style={{ background: "#111d2b", border: "2px dashed #1e3a5f", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#D4AF37", marginBottom: 8 }}>No inspections yet</div>
          <div style={{ color: "#666", fontSize: 14 }}>Submit your first inspection to populate the dashboard.</div>
        </div>
      ) : (
        <>
          {/* ── CONTROLLING EMPLOYER ALERTS ── */}
          {hasAlerts && (
            <div style={{ marginBottom: 24, background: "#1a0a0a", border: "2px solid #f44336", borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: "#f44336", textTransform: "uppercase", marginBottom: 14 }}>
                ⚠ Controlling Employer Action Required
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {repeatDefs.length > 0 && (
                  <div style={{ background: "#2a0a0a", border: "1px solid #f44336", borderRadius: 6, padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f44336", marginBottom: 6 }}>
                      🔁 {repeatDefs.length} Repeat Violation{repeatDefs.length > 1 ? "s" : ""} — Escalation Required
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa" }}>These items were previously identified and remain open. Verbal notice is no longer sufficient — issue a Written Violation or Stop-Work Order.</div>
                    {repeatDefs.slice(0, 3).map((d) => (
                      <div key={d.id} style={{ fontSize: 12, color: "#ff9800", marginTop: 6 }}>→ {d.section}: {d.item.slice(0, 70)}{d.item.length > 70 ? "..." : ""}</div>
                    ))}
                  </div>
                )}

                {staleVerbalDefs.length > 0 && (
                  <div style={{ background: "#1a1200", border: "1px solid #ff9800", borderRadius: 6, padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ff9800", marginBottom: 6 }}>
                      ⏱ {staleVerbalDefs.length} Deficiencie{staleVerbalDefs.length > 1 ? "s" : "y"} Stalled at Verbal Notice ≥3 Days
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa" }}>Verbal notice with no escalation after 3+ days does not demonstrate reasonable care. Update enforcement action or document corrective action taken.</div>
                    {staleVerbalDefs.slice(0, 3).map((d) => (
                      <div key={d.id} style={{ fontSize: 12, color: "#ff9800", marginTop: 6 }}>→ {d.section}: {d.item.slice(0, 70)}{d.item.length > 70 ? "..." : ""} <span style={{ color: "#666" }}>({d.date})</span></div>
                    ))}
                  </div>
                )}

                {overdueDefs.length > 0 && (
                  <div style={{ background: "#1a0a1a", border: "1px solid #ce93d8", borderRadius: 6, padding: "12px 16px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ce93d8", marginBottom: 6 }}>
                      📅 {overdueDefs.length} Open Deficiencie{overdueDefs.length > 1 ? "s" : "y"} Past Due Date
                    </div>
                    <div style={{ fontSize: 12, color: "#aaa" }}>Past-due corrective actions with no closure documentation are a direct citation risk. Update status or extend due date with documented justification.</div>
                    {overdueDefs.slice(0, 3).map((d) => (
                      <div key={d.id} style={{ fontSize: 12, color: "#ce93d8", marginTop: 6 }}>→ {d.section}: {d.item.slice(0, 60)}{d.item.length > 60 ? "..." : ""} <span style={{ color: "#666" }}>Due: {d.dueDate}</span></div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* LEADING INDICATORS */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#4caf50", textTransform: "uppercase", marginBottom: 12 }}>▲ Leading Indicators</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Card label="Total Inspections" value={inspections.length} sub="All time" color="#4caf50" />
              <Card label="This Month" value={thisMonth.length} sub={now.toLocaleString("default", { month: "long", year: "numeric" })} color="#4caf50" />
              <Card label="This Week" value={thisWeek.length} sub="Last 7 days" color="#4caf50" />
              <Card label="Compliance Rate" value={`${complianceRate}%`} sub={`${totalItems} items inspected`} color={complianceRate >= 90 ? "#4caf50" : complianceRate >= 75 ? "#ff9800" : "#f44336"} />
            </div>
          </div>

          {/* LAGGING INDICATORS */}
          <div style={{ marginBottom: 24, marginTop: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#f44336", textTransform: "uppercase", marginBottom: 12 }}>▼ Lagging Indicators</div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Card label="Open Deficiencies" value={openDefs.length} sub="Require corrective action" color={openDefs.length > 0 ? "#f44336" : "#4caf50"} />
              <Card label="Repeat Violations" value={repeatDefs.length} sub="Same item flagged before" color={repeatDefs.length > 0 ? "#f44336" : "#4caf50"} accent={repeatDefs.length > 0 ? "#3a1a1a" : undefined} />
              <Card label="Overdue Items" value={overdueDefs.length} sub="Past due date" color={overdueDefs.length > 0 ? "#f44336" : "#4caf50"} accent={overdueDefs.length > 0 ? "#3a1a1a" : undefined} />
              <Card label="Closed Deficiencies" value={closedDefs.length} sub="Corrected & verified" color="#4caf50" />
            </div>
          </div>

          {/* BOTTOM ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Inspector Activity */}
            <div style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 8, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#D4AF37", marginBottom: 16 }}>Inspector Activity</div>
              {Object.entries(recentByInspector).map(([name, count]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: "#ccc" }}>{name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ height: 8, width: Math.max(40, count * 20), background: "linear-gradient(90deg,#B8972A,#D4AF37)", borderRadius: 4, maxWidth: 120 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37", minWidth: 24, textAlign: "right" }}>{count}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Deficiencies by Section */}
            <div style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 8, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#D4AF37", marginBottom: 16 }}>Deficiencies by Section</div>
              {Object.keys(defsBySection).length === 0 ? (
                <div style={{ color: "#4caf50", fontSize: 13 }}>✓ No deficiencies recorded</div>
              ) : (
                Object.entries(defsBySection).sort((a, b) => b[1] - a[1]).map(([sec, count]) => (
                  <div key={sec} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "#ccc" }}>{sec}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ height: 8, width: Math.max(30, count * 30), background: "linear-gradient(90deg,#b71c1c,#f44336)", borderRadius: 4, maxWidth: 100 }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#f44336", minWidth: 20, textAlign: "right" }}>{count}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Inspections */}
          <div style={{ marginTop: 16, background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 8, padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#D4AF37", marginBottom: 16 }}>Recent Inspections</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #1e3a5f" }}>
                    {["Date", "Type", "Inspector", "Project Area", "Subcontractors", "Deficiencies", "Status", "", ""].map((h) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#666", fontWeight: 600, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inspections.slice(0, 10).map((ins) => {
                    const defCount = Object.values(ins.itemStatus || {}).filter((v) => v === "✗ Deficiency").length;
                    return (
                      <tr key={ins.id} style={{ borderBottom: "1px solid #1a2a3a" }}>
                        <td style={{ padding: "10px 12px", color: "#D4AF37", fontWeight: 600 }}>{ins.date}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: ins.inspectionType === "Daily Safety Inspection" ? "#64b5f6" : "#D4AF37", background: ins.inspectionType === "Daily Safety Inspection" ? "#0d2a3a" : "#1a1500", padding: "2px 8px", borderRadius: 4 }}>
                            {ins.inspectionType === "Daily Safety Inspection" ? "Daily" : "Periodic"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", color: "#ccc" }}>{ins.inspector}</td>
                        <td style={{ padding: "10px 12px", color: "#ccc" }}>{ins.projectArea || "--"}</td>
                        <td style={{ padding: "10px 12px", color: "#ccc", fontSize: 12 }}>
                          {Array.isArray(ins.subcontractors) && ins.subcontractors.length > 0
                            ? ins.subcontractors.join(", ")
                            : ins.subcontractors || "--"}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <span style={{ background: defCount > 0 ? "#3a1a1a" : "#1a3a1a", color: defCount > 0 ? "#f44336" : "#4caf50", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                            {defCount}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontSize: 11, color: "#4caf50" }}>✓ Submitted</span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            onClick={() => generateInspectionPDF(ins, deficiencies)}
                            style={{ background: "#1a1500", border: "1px solid #D4AF37", borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#D4AF37", whiteSpace: "nowrap" }}
                          >
                            ⬇ PDF
                          </button>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            onClick={() => onDelete(ins.id)}
                            style={{ background: "#1a0a0a", border: "1px solid #f44336", borderRadius: 5, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#f44336", whiteSpace: "nowrap" }}
                          >
                            🗑 Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── INSPECTION FORM ───────────────────────────────────────────────────────────
function InspectionForm({ onSubmit }) {
  const today = new Date().toISOString().split("T")[0];
  const DRAFT_KEY = "sls_inspection_draft";

  const defaultForm = {
    date: today,
    inspectionType: INSPECTION_TYPES[0],
    inspector: INSPECTORS[0],
    projectArea: "",
    contractNumber: "70B01C23F00001236",
    weather: WEATHER_CONDITIONS[0],
    tempHigh: "",
    tempLow: "",
    humidity: "",
    subcontractors: [],
    itemStatus: {},
    itemRemarks: {},
    remarkingRequired: false,
    utilityStrike: false,
    utilityStrikeType: "Known Utility",
    utilityStrikeDetails: "",
    ahaSignedIn: false,
    generalObservations: "",
    nearMisses: "",
    toolboxTopic: "",
    additionalNotes: "",
  };

  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [draftStatus, setDraftStatus] = useState(""); // "saving" | "saved" | ""
  const [draftRestored, setDraftRestored] = useState(false);

  // Load draft on mount
  useEffect(() => {
    async function loadDraft() {
      try {
        const raw = localStorage.getItem(DRAFT_KEY); const result = raw ? { value: raw } : null;
        if (result && result.value) {
          const draft = JSON.parse(result.value);
          setForm({ ...defaultForm, ...draft });
          setDraftRestored(true);
          setTimeout(() => setDraftRestored(false), 4000);
        }
      } catch (e) {
        // No draft found, start fresh
      }
    }
    loadDraft();
  }, []);

  // Auto-save draft whenever form changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setDraftStatus("saving");
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        setDraftStatus("saved");
        setTimeout(() => setDraftStatus(""), 2000);
      } catch (e) {
        setDraftStatus("");
      }
    }, 800); // debounce 800ms
    return () => clearTimeout(timer);
  }, [form]);

  const clearDraft = async () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  // NWS Heat Index formula (Rothfusz regression) — valid when temp ≥ 80°F and RH ≥ 40%
  const calcHeatIndex = (t, rh) => {
    if (!t || !rh || t < 80) return null;
    const T = parseFloat(t);
    const R = parseFloat(rh);
    if (isNaN(T) || isNaN(R)) return null;
    const HI =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      0.00683783 * T * T -
      0.05481717 * R * R +
      0.00122874 * T * T * R +
      0.00085282 * T * R * R -
      0.00000199 * T * T * R * R;
    return Math.round(HI);
  };

  const hiHigh = calcHeatIndex(form.tempHigh, form.humidity);
  const hiLow = calcHeatIndex(form.tempLow, form.humidity);

  const getHILevel = (hi) => {
    if (hi === null) return null;
    if (hi >= 103) return { label: "DANGER", color: "#f44336", bg: "#3a1a1a" };
    if (hi >= 91) return { label: "EXTREME CAUTION", color: "#ff9800", bg: "#2a1a00" };
    if (hi >= 80) return { label: "CAUTION", color: "#D4AF37", bg: "#1a1500" };
    return { label: "SAFE", color: "#4caf50", bg: "#1a3a1a" };
  };

  const hiHighLevel = getHILevel(hiHigh);
  const hiLowLevel = getHILevel(hiLow);

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));
  const setItemStatus = (key, val) => setForm((f) => ({ ...f, itemStatus: { ...f.itemStatus, [key]: val } }));
  const setItemRemark = (key, val) => setForm((f) => ({ ...f, itemRemarks: { ...f.itemRemarks, [key]: val } }));

  const handleSubmit = async () => {
    if (!form.date || !form.inspector) {
      alert("Please fill in the date and inspector fields.");
      return;
    }
    setSubmitting(true);
    await onSubmit(form);
    await clearDraft();
    setForm(defaultForm);
    setSubmitting(false);
  };

  const fieldStyle = {
    width: "100%", background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 6,
    color: "#e8e8e8", padding: "10px 12px", fontSize: 13, boxSizing: "border-box",
    outline: "none",
  };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 };

  const sectionProgress = INSPECTION_SECTIONS.map((sec) => {
    const total = sec.items.length;
    const filled = sec.items.filter((_, i) => form.itemStatus[`${sec.id}_${i}`]).length;
    return { filled, total };
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#D4AF37", marginBottom: 4 }}>{form.inspectionType}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <p style={{ color: "#666", fontSize: 13 }}>Progress auto-saved as draft</p>
            {draftStatus === "saving" && <span style={{ fontSize: 11, color: "#555" }}>💾 Saving...</span>}
            {draftStatus === "saved" && <span style={{ fontSize: 11, color: "#4caf50" }}>✓ Draft saved</span>}
          </div>
          {draftRestored && (
            <div style={{ marginTop: 6, padding: "6px 12px", background: "#1a2a1a", border: "1px solid #4caf50", borderRadius: 6, fontSize: 12, color: "#4caf50" }}>
              ✓ Draft restored — your previous progress has been recovered
            </div>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ background: "linear-gradient(135deg,#B8972A,#D4AF37)", border: "none", borderRadius: 8, padding: "14px 32px", fontWeight: 800, fontSize: 14, color: "#0a1018", cursor: "pointer", letterSpacing: 1 }}
        >
          {submitting ? "Submitting..." : "✓ SUBMIT INSPECTION"}
        </button>
      </div>

      {/* HEADER INFO */}
      <div style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#D4AF37", marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}>Header Information</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div>
            <label style={labelStyle}>Inspection Type *</label>
            <select style={fieldStyle} value={form.inspectionType} onChange={(e) => set("inspectionType", e.target.value)}>
              {INSPECTION_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Inspection Date *</label>
            <input type="date" style={fieldStyle} value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Inspector *</label>
            <select style={fieldStyle} value={form.inspector} onChange={(e) => set("inspector", e.target.value)}>
              {INSPECTORS.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Contract Number</label>
            <input type="text" style={fieldStyle} value={form.contractNumber} onChange={(e) => set("contractNumber", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Project Area / Segment</label>
            <input type="text" style={fieldStyle} value={form.projectArea} onChange={(e) => set("projectArea", e.target.value)} placeholder="e.g., Segment 1, Chapeno" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Subcontractors Present</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUBCONTRACTORS.map((sub) => {
                const selected = form.subcontractors.includes(sub);
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      const current = form.subcontractors;
                      set("subcontractors", selected ? current.filter((s) => s !== sub) : [...current, sub]);
                    }}
                    style={{
                      padding: "8px 16px", borderRadius: 20, cursor: "pointer", fontSize: 13, fontWeight: 600,
                      border: `1px solid ${selected ? "#D4AF37" : "#1e3a5f"}`,
                      background: selected ? "#1a1500" : "#0a1018",
                      color: selected ? "#D4AF37" : "#555",
                      transition: "all 0.15s",
                    }}
                  >
                    {selected ? "✓ " : ""}{sub}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Weather Conditions</label>
            <select style={fieldStyle} value={form.weather} onChange={(e) => set("weather", e.target.value)}>
              {WEATHER_CONDITIONS.map((w) => <option key={w}>{w}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>High Temp (°F)</label>
            <input type="number" style={fieldStyle} value={form.tempHigh} onChange={(e) => set("tempHigh", e.target.value)} placeholder="e.g., 102" />
          </div>
          <div>
            <label style={labelStyle}>Low Temp (°F)</label>
            <input type="number" style={fieldStyle} value={form.tempLow} onChange={(e) => set("tempLow", e.target.value)} placeholder="e.g., 84" />
          </div>
          <div>
            <label style={labelStyle}>Humidity (%)</label>
            <input type="number" style={fieldStyle} value={form.humidity} onChange={(e) => set("humidity", e.target.value)} placeholder="e.g., 65" min="0" max="100" />
          </div>
        </div>

        {/* HEAT INDEX AUTO-CALC */}
        {(hiHigh !== null || hiLow !== null) && (
          <div style={{ marginTop: 16, background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>🌡 Heat Index (Auto-Calculated — NWS Rothfusz)</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {hiHigh !== null && hiHighLevel && (
                <div style={{ flex: 1, minWidth: 140, background: hiHighLevel.bg, border: `1px solid ${hiHighLevel.color}`, borderRadius: 6, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>High of Day</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: hiHighLevel.color }}>{hiHigh}°F</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: hiHighLevel.color, marginTop: 4 }}>{hiHighLevel.label}</div>
                </div>
              )}
              {hiLow !== null && hiLowLevel && (
                <div style={{ flex: 1, minWidth: 140, background: hiLowLevel.bg, border: `1px solid ${hiLowLevel.color}`, borderRadius: 6, padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Low of Day</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: hiLowLevel.color }}>{hiLow}°F</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: hiLowLevel.color, marginTop: 4 }}>{hiLowLevel.label}</div>
                </div>
              )}
              <div style={{ flex: 2, minWidth: 200, display: "flex", alignItems: "center" }}>
                <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
                  <span style={{ color: "#f44336", fontWeight: 700 }}>DANGER ≥103°F</span> · <span style={{ color: "#ff9800", fontWeight: 700 }}>EXTREME CAUTION 91–102°F</span> · <span style={{ color: "#D4AF37", fontWeight: 700 }}>CAUTION 80–90°F</span><br />
                  Per EM 385-1-1 §06.B — increase break frequency and water intake at Caution and above.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION NAV */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {INSPECTION_SECTIONS.map((sec, idx) => {
          const prog = sectionProgress[idx];
          const complete = prog.filled === prog.total;
          const partial = prog.filled > 0;
          return (
            <button key={sec.id} onClick={() => setActiveSection(idx)} style={{
              background: activeSection === idx ? "#1e3a5f" : "#111d2b",
              border: `1px solid ${activeSection === idx ? "#D4AF37" : complete ? "#4caf50" : partial ? "#ff9800" : "#1e3a5f"}`,
              borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
              color: activeSection === idx ? "#D4AF37" : complete ? "#4caf50" : partial ? "#ff9800" : "#666",
              transition: "all 0.2s",
            }}>
              {complete ? "✓ " : ""}{sec.label}
              <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({prog.filled}/{prog.total})</span>
            </button>
          );
        })}
      </div>

      {/* ACTIVE SECTION */}
      {INSPECTION_SECTIONS.map((sec, secIdx) => secIdx === activeSection && (
        <div key={sec.id} style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 8, padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#D4AF37", marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}>{sec.label}</div>
          {sec.items.map((item, i) => {
            const key = `${sec.id}_${i}`;
            const status = form.itemStatus[key] || "";
            const isDef = status === "✗ Deficiency";
            return (
              <div key={key} style={{ borderBottom: "1px solid #1a2a3a", paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "#ccc" }}>{item}</span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {STATUS_OPTIONS.map((opt) => (
                      <button key={opt} onClick={() => setItemStatus(key, opt)} style={{
                        background: status === opt ? (opt === "✓ Satisfactory" ? "#1a3a1a" : opt === "✗ Deficiency" ? "#3a1a1a" : "#1a2a3a") : "#0a1018",
                        border: `1px solid ${status === opt ? (opt === "✓ Satisfactory" ? "#4caf50" : opt === "✗ Deficiency" ? "#f44336" : "#666") : "#1e3a5f"}`,
                        borderRadius: 5, padding: "8px 0", cursor: "pointer", fontSize: 12, fontWeight: 600,
                        color: status === opt ? (opt === "✓ Satisfactory" ? "#4caf50" : opt === "✗ Deficiency" ? "#f44336" : "#888") : "#555",
                        transition: "all 0.15s", whiteSpace: "nowrap", flex: 1,
                      }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                {isDef && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ ...labelStyle, color: "#f44336" }}>Deficiency Details / Immediate Action Taken</label>
                    <textarea
                      style={{ ...fieldStyle, minHeight: 70, resize: "vertical", borderColor: "#f44336" }}
                      value={form.itemRemarks[key] || ""}
                      onChange={(e) => setItemRemark(key, e.target.value)}
                      placeholder="Describe the deficiency, location, and any immediate corrective action taken..."
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* UTILITY-SPECIFIC TRACKING — only shown in utility section */}
          {sec.id === "utility" && (
            <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Remarking Required */}
              <div
                onClick={() => set("remarkingRequired", !form.remarkingRequired)}
                style={{ padding: 14, background: form.remarkingRequired ? "#2a1500" : "#0a1018", border: `1px solid ${form.remarkingRequired ? "#ff9800" : "#1e3a5f"}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
              >
                <div style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0, background: form.remarkingRequired ? "#2a1500" : "#0a1018", border: `2px solid ${form.remarkingRequired ? "#ff9800" : "#1e3a5f"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#ff9800", fontWeight: 900 }}>
                  {form.remarkingRequired ? "!" : ""}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: form.remarkingRequired ? "#ff9800" : "#ccc" }}>Utility markings missing — remarking coordination required</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Check if field markings have faded, been disturbed, or are incomplete — contact P&C Utility Locators to remark</div>
                </div>
              </div>

              {/* Utility Strike */}
              <div style={{ padding: 14, background: form.utilityStrike ? "#3a1a1a" : "#0a1018", border: `1px solid ${form.utilityStrike ? "#f44336" : "#1e3a5f"}`, borderRadius: 8 }}>
                <div
                  onClick={() => set("utilityStrike", !form.utilityStrike)}
                  style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}
                >
                  <div style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0, background: form.utilityStrike ? "#3a1a1a" : "#0a1018", border: `2px solid ${form.utilityStrike ? "#f44336" : "#1e3a5f"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#f44336", fontWeight: 900 }}>
                    {form.utilityStrike ? "✗" : ""}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: form.utilityStrike ? "#f44336" : "#ccc" }}>UTILITY STRIKE — Report this incident immediately</div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Includes irrigation lines, unknown utilities, and any marked or unmarked utility contact</div>
                  </div>
                </div>
                {form.utilityStrike && (
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <label style={{ ...labelStyle, color: "#f44336" }}>Strike Type</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        {["Known Utility", "Unknown Utility", "Irrigation Line"].map((type) => (
                          <button key={type} onClick={() => set("utilityStrikeType", type)} style={{
                            background: form.utilityStrikeType === type ? "#3a1a1a" : "#0a1018",
                            border: `1px solid ${form.utilityStrikeType === type ? "#f44336" : "#1e3a5f"}`,
                            borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                            color: form.utilityStrikeType === type ? "#f44336" : "#555",
                          }}>{type}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, color: "#f44336" }}>Strike Details — Location, Utility Type, Immediate Actions Taken</label>
                      <textarea
                        style={{ ...fieldStyle, minHeight: 80, resize: "vertical", borderColor: "#f44336" }}
                        value={form.utilityStrikeDetails}
                        onChange={(e) => set("utilityStrikeDetails", e.target.value)}
                        placeholder="Describe what was struck, location, depth, utility type, who was notified, and immediate actions taken..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            {secIdx > 0 && (
              <button onClick={() => setActiveSection(secIdx - 1)} style={{ background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 6, padding: "8px 20px", color: "#888", cursor: "pointer", fontSize: 13 }}>← Previous</button>
            )}
            {secIdx < INSPECTION_SECTIONS.length - 1 && (
              <button onClick={() => setActiveSection(secIdx + 1)} style={{ background: "#1e3a5f", border: "none", borderRadius: 6, padding: "8px 20px", color: "#D4AF37", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Next →</button>
            )}
          </div>
        </div>
      ))}

      {/* NOTES */}
      <div style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 8, padding: 20, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#D4AF37", marginBottom: 16, letterSpacing: 1, textTransform: "uppercase" }}>Additional Documentation</div>

        {/* AHA Sign-in Verification */}
        <div style={{ marginBottom: 16, padding: 14, background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 8, display: "flex", alignItems: "center", gap: 14 }}>
          <div
            onClick={() => set("ahaSignedIn", !form.ahaSignedIn)}
            style={{
              width: 24, height: 24, borderRadius: 4, flexShrink: 0, cursor: "pointer",
              background: form.ahaSignedIn ? "#1a3a1a" : "#0a1018",
              border: `2px solid ${form.ahaSignedIn ? "#4caf50" : "#1e3a5f"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "#4caf50", fontWeight: 900,
            }}
          >
            {form.ahaSignedIn ? "✓" : ""}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>All workers on site are signed into the AHA for their activity</div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Verify each subcontractor's sign-in sheet before checking — §1926.21(b)(2) / EM 385-1-1 §01.A</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>General Observations</label>
            <textarea style={{ ...fieldStyle, minHeight: 100, resize: "vertical" }} value={form.generalObservations} onChange={(e) => set("generalObservations", e.target.value)} placeholder="Overall site conditions, commendations, general notes..." />
          </div>
          <div>
            <label style={labelStyle}>Near-Miss / Incident Report</label>
            <textarea style={{ ...fieldStyle, minHeight: 100, resize: "vertical" }} value={form.nearMisses} onChange={(e) => set("nearMisses", e.target.value)} placeholder="Document any near-misses or incidents..." />
          </div>
          <div>
            <label style={labelStyle}>Toolbox Talk Topic (if conducted)</label>
            <input type="text" style={fieldStyle} value={form.toolboxTopic} onChange={(e) => set("toolboxTopic", e.target.value)} placeholder="e.g., Heat illness prevention" />
          </div>
          <div>
            <label style={labelStyle}>Additional Notes</label>
            <textarea style={{ ...fieldStyle, minHeight: 100, resize: "vertical" }} value={form.additionalNotes} onChange={(e) => set("additionalNotes", e.target.value)} placeholder="Any additional information..." />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSubmit} disabled={submitting} style={{ background: "linear-gradient(135deg,#B8972A,#D4AF37)", border: "none", borderRadius: 8, padding: "16px 40px", fontWeight: 800, fontSize: 15, color: "#0a1018", cursor: "pointer", letterSpacing: 1 }}>
          {submitting ? "Submitting..." : "✓ SUBMIT INSPECTION"}
        </button>
      </div>
    </div>
  );
}

// ─── DEFICIENCY LOG ────────────────────────────────────────────────────────────
function DeficiencyLog({ deficiencies, onUpdate }) {
  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const filtered = filter === "All" ? deficiencies : deficiencies.filter((d) => d.status === filter);

  const startEdit = (def) => {
    setEditingId(def.id);
    setEditData({
      correctiveAction: def.correctiveAction || "",
      responsibleParty: def.responsibleParty || "",
      dueDate: def.dueDate || "",
      status: def.status || "Open",
      enforcementAction: def.enforcementAction || "Verbal Notice",
      notifiedDate: def.notifiedDate || "",
      verifiedDate: def.verifiedDate || "",
    });
  };

  const saveEdit = (id) => {
    const updates = { ...editData };
    if (updates.status === "Closed" && !editData.closedDate) {
      updates.closedDate = new Date().toISOString().split("T")[0];
    }
    onUpdate(id, updates);
    setEditingId(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#D4AF37", marginBottom: 4 }}>Deficiency Log</h1>
          <p style={{ color: "#666", fontSize: 13 }}>{deficiencies.length} total · {deficiencies.filter((d) => d.status === "Open").length} open</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["All", "Open", "Closed"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? "#1e3a5f" : "#111d2b", border: `1px solid ${filter === f ? "#D4AF37" : "#1e3a5f"}`,
              borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: filter === f ? 700 : 400,
              color: filter === f ? "#D4AF37" : "#666",
            }}>{f}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: "#111d2b", border: "2px dashed #1e3a5f", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#4caf50" }}>No {filter !== "All" ? filter.toLowerCase() + " " : ""}deficiencies</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((def) => {
            const isEditing = editingId === def.id;
            const isOverdue = def.dueDate && new Date(def.dueDate) < new Date() && def.status === "Open";
            return (
              <div key={def.id} style={{ background: "#111d2b", border: `1px solid ${isOverdue ? "#f44336" : def.status === "Closed" ? "#4caf50" : "#1e3a5f"}`, borderLeft: `4px solid ${isOverdue ? "#f44336" : def.status === "Closed" ? "#4caf50" : "#ff9800"}`, borderRadius: 8, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
                      <span style={{ background: "#1a2a3a", borderRadius: 4, padding: "2px 10px", fontSize: 11, color: "#D4AF37", fontWeight: 700 }}>{def.section}</span>
                      <span style={{ fontSize: 12, color: "#666" }}>{def.date}</span>
                      <span style={{ fontSize: 12, color: "#888" }}>by {def.inspector}</span>
                      {def.isRepeat && <span style={{ background: "#3a0a0a", color: "#f44336", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>🔁 REPEAT</span>}
                      {isOverdue && <span style={{ background: "#3a1a1a", color: "#f44336", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>OVERDUE</span>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#ccc", marginBottom: 6 }}>{def.item}</div>
                    {def.remarks && <div style={{ fontSize: 13, color: "#888", fontStyle: "italic" }}>"{def.remarks}"</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ background: def.status === "Closed" ? "#1a3a1a" : "#2a1a0a", color: def.status === "Closed" ? "#4caf50" : "#ff9800", padding: "4px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{def.status}</span>
                    <button onClick={() => isEditing ? saveEdit(def.id) : startEdit(def)} style={{ background: isEditing ? "#B8972A" : "#1e3a5f", border: "none", borderRadius: 6, padding: "6px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: isEditing ? "#0a1018" : "#D4AF37" }}>
                      {isEditing ? "Save" : "Edit"}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div style={{ marginTop: 16, borderTop: "1px solid #1e3a5f", paddingTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Corrective Action</label>
                      <textarea
                        style={{ width: "100%", background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e8e8e8", padding: "8px 10px", fontSize: 13, minHeight: 70, resize: "vertical", boxSizing: "border-box" }}
                        value={editData.correctiveAction}
                        onChange={(e) => setEditData((d) => ({ ...d, correctiveAction: e.target.value }))}
                        placeholder="Describe corrective action..."
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Responsible Party</label>
                        <input type="text" style={{ width: "100%", background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e8e8e8", padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }} value={editData.responsibleParty} onChange={(e) => setEditData((d) => ({ ...d, responsibleParty: e.target.value }))} placeholder="Name / company" />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Enforcement Action</label>
                        <select style={{ width: "100%", background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e8e8e8", padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }} value={editData.enforcementAction} onChange={(e) => setEditData((d) => ({ ...d, enforcementAction: e.target.value }))}>
                          <option>Verbal Notice</option>
                          <option>Written Notice</option>
                          <option>Written Violation</option>
                          <option>Stop-Work Order</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Responsible Party Notified Date</label>
                        <input type="date" style={{ width: "100%", background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e8e8e8", padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }} value={editData.notifiedDate} onChange={(e) => setEditData((d) => ({ ...d, notifiedDate: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Due Date</label>
                        <input type="date" style={{ width: "100%", background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e8e8e8", padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }} value={editData.dueDate} onChange={(e) => setEditData((d) => ({ ...d, dueDate: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Verified Closed Date</label>
                        <input type="date" style={{ width: "100%", background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e8e8e8", padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }} value={editData.verifiedDate} onChange={(e) => setEditData((d) => ({ ...d, verifiedDate: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Status</label>
                        <select style={{ width: "100%", background: "#0a1018", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e8e8e8", padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }} value={editData.status} onChange={(e) => setEditData((d) => ({ ...d, status: e.target.value }))}>
                          <option>Open</option>
                          <option>Closed</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {!isEditing && def.correctiveAction && (
                  <div style={{ marginTop: 12, borderTop: "1px solid #1e3a5f", paddingTop: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#666", marginRight: 8 }}>CORRECTIVE ACTION:</span>
                    <span style={{ fontSize: 13, color: "#ccc" }}>{def.correctiveAction}</span>
                    {def.responsibleParty && <span style={{ marginLeft: 16, fontSize: 12, color: "#D4AF37" }}>→ {def.responsibleParty}</span>}
                    {def.dueDate && <span style={{ marginLeft: 12, fontSize: 12, color: isOverdue ? "#f44336" : "#888" }}>Due: {def.dueDate}</span>}
                    {def.enforcementAction && (
                      <span style={{
                        marginLeft: 12, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: def.enforcementAction === "Stop-Work Order" ? "#3a1a1a" : def.enforcementAction === "Written Violation" ? "#2a1500" : def.enforcementAction === "Written Notice" ? "#1a1a2a" : "#1a1a1a",
                        color: def.enforcementAction === "Stop-Work Order" ? "#f44336" : def.enforcementAction === "Written Violation" ? "#ff9800" : def.enforcementAction === "Written Notice" ? "#64b5f6" : "#888",
                      }}>
                        {def.enforcementAction}
                      </span>
                    )}
                    {/* Enforcement chain timeline */}
                    <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4caf50" }} />
                        <span style={{ fontSize: 11, color: "#666" }}>Identified: {def.date}</span>
                      </div>
                      <span style={{ color: "#333" }}>→</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: def.notifiedDate ? "#64b5f6" : "#333" }} />
                        <span style={{ fontSize: 11, color: def.notifiedDate ? "#64b5f6" : "#444" }}>Notified: {def.notifiedDate || "Pending"}</span>
                      </div>
                      <span style={{ color: "#333" }}>→</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: def.status === "Closed" ? "#ff9800" : "#333" }} />
                        <span style={{ fontSize: 11, color: def.status === "Closed" ? "#ff9800" : "#444" }}>Corrected: {def.closedDate || "Pending"}</span>
                      </div>
                      <span style={{ color: "#333" }}>→</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: def.verifiedDate ? "#4caf50" : "#333" }} />
                        <span style={{ fontSize: 11, color: def.verifiedDate ? "#4caf50" : "#444" }}>Verified: {def.verifiedDate || "Pending"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── REPORTS ───────────────────────────────────────────────────────────────────
function Reports({ inspections, deficiencies }) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const exportInspectionsCSV = () => {
    const headers = ["Date","Submitted At","Inspection Type","Inspector","Contract #","Project Area","Weather","Temp High","Temp Low","Humidity","Subcontractors","Toolbox Topic","Near Misses","General Observations","AHA Signed In","Remarking Required","Utility Strike","Utility Strike Type","Utility Strike Details","Additional Notes"];
    const rows = inspections.map(i => [
      i.date || "",
      i.submittedAt ? new Date(i.submittedAt).toLocaleString() : "",
      i.inspectionType || "",
      i.inspector || "",
      i.contractNumber || "",
      i.projectArea || "",
      i.weather || "",
      i.tempHigh || "",
      i.tempLow || "",
      i.humidity || "",
      Array.isArray(i.subcontractors) ? i.subcontractors.join("; ") : (i.subcontractors || ""),
      i.toolboxTopic || "",
      i.nearMisses || "",
      i.generalObservations || "",
      i.ahaSignedIn ? "Yes" : "No",
      i.remarkingRequired ? "Yes" : "No",
      i.utilityStrike ? "Yes" : "No",
      i.utilityStrikeType || "",
      i.utilityStrikeDetails || "",
      i.additionalNotes || "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `SLS_Inspections_All.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportDeficienciesCSV = () => {
    const headers = ["Date","Inspector","Section","Deficiency Item","Remarks","Status","Enforcement Action","Responsible Party","Notified Date","Due Date","Closed Date","Verified Date","Is Repeat"];
    const rows = deficiencies.map(d => [
      d.date || "",
      d.inspector || "",
      d.section || "",
      d.item || "",
      d.remarks || "",
      d.status || "",
      d.enforcementAction || "",
      d.responsibleParty || "",
      d.notifiedDate || "",
      d.dueDate || "",
      d.closedDate || "",
      d.verifiedDate || "",
      d.isRepeat ? "Yes" : "No",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`));
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `SLS_Deficiencies_All.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const monthInsp = inspections.filter((i) => {
    const d = new Date(i.submittedAt);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });
  const monthDefs = deficiencies.filter((d) => {
    const insp = inspections.find((i) => i.id === d.inspectionId);
    if (!insp) return false;
    const dt = new Date(insp.submittedAt);
    return dt.getMonth() === selectedMonth && dt.getFullYear() === selectedYear;
  });

  const totalItems = monthInsp.reduce((s, i) => s + Object.values(i.itemStatus || {}).filter((v) => v !== "N/A").length, 0);
  const defItems = monthInsp.reduce((s, i) => s + Object.values(i.itemStatus || {}).filter((v) => v === "✗ Deficiency").length, 0);
  const satItems = totalItems - defItems;
  const complianceRate = totalItems > 0 ? Math.round((satItems / totalItems) * 100) : 100;

  const closedThisMonth = monthDefs.filter((d) => d.status === "Closed").length;
  const openThisMonth = monthDefs.filter((d) => d.status === "Open").length;
  const repeatThisMonth = monthDefs.filter((d) => d.isRepeat).length;
  const writtenNotices = monthDefs.filter((d) => d.enforcementAction === "Written Notice" || d.enforcementAction === "Written Violation").length;
  const stopWorkOrders = monthDefs.filter((d) => d.enforcementAction === "Stop-Work Order").length;

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const toolboxTopics = monthInsp.filter((i) => i.toolboxTopic).map((i) => i.toolboxTopic);
  const nearMisses = monthInsp.filter((i) => i.nearMisses && i.nearMisses.trim()).length;
  const remarkingCount = monthInsp.filter((i) => i.remarkingRequired).length;
  const utilityStrikes = monthInsp.filter((i) => i.utilityStrike);
  const knownStrikes = utilityStrikes.filter((i) => i.utilityStrikeType === "Known Utility").length;
  const unknownStrikes = utilityStrikes.filter((i) => i.utilityStrikeType === "Unknown Utility").length;
  const irrigationStrikes = utilityStrikes.filter((i) => i.utilityStrikeType === "Irrigation Line").length;

  const Row = ({ label, value, color }) => (
    <tr style={{ borderBottom: "1px solid #1a2a3a" }}>
      <td style={{ padding: "10px 16px", fontSize: 13, color: "#ccc" }}>{label}</td>
      <td style={{ padding: "10px 16px", fontSize: 14, fontWeight: 700, color: color || "#D4AF37", textAlign: "right" }}>{value}</td>
    </tr>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#D4AF37", marginBottom: 4 }}>Monthly Reports</h1>
          <p style={{ color: "#666", fontSize: 13 }}>Auto-generated from submitted inspection data</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={exportInspectionsCSV} style={{ background: "#0a1018", border: "1px solid #D4AF37", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#D4AF37" }}>
            ⬇ Export Inspections CSV
          </button>
          <button onClick={exportDeficienciesCSV} style={{ background: "#0a1018", border: "1px solid #f44336", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#f44336" }}>
            ⬇ Export Deficiencies CSV
          </button>
          <select style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e8e8e8", padding: "8px 14px", fontSize: 13 }} value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 6, color: "#e8e8e8", padding: "8px 14px", fontSize: 13 }} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {monthInsp.length === 0 ? (
        <div style={{ background: "#111d2b", border: "2px dashed #1e3a5f", borderRadius: 12, padding: 60, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#666" }}>No inspections for {months[selectedMonth]} {selectedYear}</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* LEADING */}
          <div style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderTop: "3px solid #4caf50", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e3a5f" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#4caf50", letterSpacing: 1, textTransform: "uppercase" }}>▲ Leading Indicators</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{months[selectedMonth]} {selectedYear}</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <Row label="Inspections Conducted" value={monthInsp.length} color="#4caf50" />
                <Row label="Total Items Inspected" value={totalItems} color="#4caf50" />
                <Row label="Items Satisfactory" value={satItems} color="#4caf50" />
                <Row label="Compliance Rate" value={`${complianceRate}%`} color={complianceRate >= 90 ? "#4caf50" : complianceRate >= 75 ? "#ff9800" : "#f44336"} />
                <Row label="Toolbox Talks Conducted" value={toolboxTopics.length} color="#4caf50" />
                <Row label="Remarking Coordinations Required" value={remarkingCount} color={remarkingCount > 0 ? "#ff9800" : "#4caf50"} />
                <Row label="Near-Misses Reported" value={nearMisses} color={nearMisses > 0 ? "#ff9800" : "#4caf50"} />
              </tbody>
            </table>
          </div>

          {/* LAGGING */}
          <div style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderTop: "3px solid #f44336", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e3a5f" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#f44336", letterSpacing: 1, textTransform: "uppercase" }}>▼ Lagging Indicators</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{months[selectedMonth]} {selectedYear}</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <Row label="Deficiencies Identified" value={monthDefs.length} color={monthDefs.length > 0 ? "#f44336" : "#4caf50"} />
                <Row label="Repeat Violations" value={repeatThisMonth} color={repeatThisMonth > 0 ? "#f44336" : "#4caf50"} />
                <Row label="Open Deficiencies" value={openThisMonth} color={openThisMonth > 0 ? "#ff9800" : "#4caf50"} />
                <Row label="Closed / Corrected" value={closedThisMonth} color="#4caf50" />
                <Row label="Closure Rate" value={monthDefs.length > 0 ? `${Math.round((closedThisMonth / monthDefs.length) * 100)}%` : "N/A"} color="#D4AF37" />
                <Row label="Written Notices / Violations" value={writtenNotices} color={writtenNotices > 0 ? "#ff9800" : "#4caf50"} />
                <Row label="Stop-Work Orders" value={stopWorkOrders} color={stopWorkOrders > 0 ? "#f44336" : "#4caf50"} />
                <Row label="Utility Strikes — Total" value={utilityStrikes.length} color={utilityStrikes.length > 0 ? "#f44336" : "#4caf50"} />
                <Row label="  Known Utility" value={knownStrikes} color={knownStrikes > 0 ? "#f44336" : "#666"} />
                <Row label="  Unknown Utility" value={unknownStrikes} color={unknownStrikes > 0 ? "#f44336" : "#666"} />
                <Row label="  Irrigation Line" value={irrigationStrikes} color={irrigationStrikes > 0 ? "#ff9800" : "#666"} />
                <Row label="Incidents / Near-Misses" value={nearMisses} color={nearMisses > 0 ? "#f44336" : "#4caf50"} />
              </tbody>
            </table>
          </div>

          {/* TOOLBOX TALKS */}
          {toolboxTopics.length > 0 && (
            <div style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 8, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#D4AF37", marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>Toolbox Talk Topics</div>
              {toolboxTopics.map((t, i) => (
                <div key={i} style={{ fontSize: 13, color: "#ccc", padding: "6px 0", borderBottom: "1px solid #1a2a3a" }}>• {t}</div>
              ))}
            </div>
          )}

          {/* DEFICIENCY BREAKDOWN */}
          {monthDefs.length > 0 && (
            <div style={{ background: "#111d2b", border: "1px solid #1e3a5f", borderRadius: 8, padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#D4AF37", marginBottom: 12, letterSpacing: 1, textTransform: "uppercase" }}>Deficiencies This Month</div>
              {monthDefs.map((d) => (
                <div key={d.id} style={{ fontSize: 13, color: "#ccc", padding: "8px 0", borderBottom: "1px solid #1a2a3a", display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>{d.item}</span>
                  <span style={{ color: d.status === "Closed" ? "#4caf50" : "#ff9800", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{d.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
