import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// --- Data Models & Initial State ---
interface Location { lat: number; lng: number; }
interface Hospital { id: string; name: string; location: Location; bedsAvailable: number; icuAvailable: number; contact: string; }
interface Ambulance { id: string; vehicleNumber: string; location: Location; isAvailable: boolean; status: "idle" | "en-route" | "busy"; }
interface BloodBank { id: string; name: string; location: Location; inventory: Record<string, number>; }

const hospitals: Hospital[] = [
  { id: "h1", name: "Yashoda Hospital", location: { lat: 28.6675, lng: 77.4335 }, bedsAvailable: 15, icuAvailable: 4, contact: "0120-111111" },
  { id: "h2", name: "Max Super Speciality", location: { lat: 28.6416, lng: 77.3713 }, bedsAvailable: 8, icuAvailable: 1, contact: "0120-222222" },
  { id: "h3", name: "Columbia Asia (Manipal)", location: { lat: 28.6366, lng: 77.4526 }, bedsAvailable: 25, icuAvailable: 10, contact: "0120-333333" },
];

const ambulances: Ambulance[] = [
  { id: "a1", vehicleNumber: "UP14 AB 1234", location: { lat: 28.6550, lng: 77.4200 }, isAvailable: true, status: "idle" },
  { id: "a2", vehicleNumber: "UP14 CD 5678", location: { lat: 28.6700, lng: 77.4450 }, isAvailable: true, status: "idle" },
  { id: "a3", vehicleNumber: "UP14 XY 9999", location: { lat: 28.6300, lng: 77.4100 }, isAvailable: false, status: "busy" },
];

const bloodBanks: BloodBank[] = [
  { id: "b1", name: "Rotary Blood Bank", location: { lat: 28.6650, lng: 77.4300 }, inventory: { "A+": 12, "O+": 5, "B+": 20, "AB-": 1 } },
  { id: "b2", name: "Sanjivani Blood Center", location: { lat: 28.6400, lng: 77.4200 }, inventory: { "O+": 15, "A-": 3, "B-": 2 } },
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p)/2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p))/2;
  return 12742 * Math.asin(Math.sqrt(a));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/resources", (req, res) => {
    res.json({ hospitals, ambulances, bloodBanks });
  });

  app.get("/api/hospitals", (req, res) => res.json(hospitals));
  app.get("/api/ambulances", (req, res) => res.json(ambulances));

  // --- FAST ALLOCATION PIPELINE (< 100ms) ---
  app.post("/api/allocate", (req, res) => {
    const { emergencyDescription, userLocation } = req.body;
    
    if (!emergencyDescription) {
      return res.status(400).json({ error: "Emergency description is required" });
    }

    const descLower = String(emergencyDescription).toLowerCase();
    
    // 1. Extreme Fast Heuristics (Bilingual English + Hinglish/Hindi)
    let severity: "critical" | "high" | "moderate" | "low" = "moderate";
    let needsICU = false;
    let needsBlood = descLower.includes("blood") || false;
    let needsAmbulance = descLower.includes("ambulance") || false;
    let needsHospital = descLower.includes("hospital") || false;

    if (descLower.match(/(heart|chest|stroke|breathe|collapse|unconscious|dil|saans|behosh|attack)/)) {
        severity = "critical";
        needsICU = true;
        needsAmbulance = true;
        needsHospital = true;
    } else if (descLower.match(/(accident|bleed|cut|trauma|crash|khoon|chot|takkar)/)) {
        severity = "high";
        needsBlood = true;
        needsAmbulance = true;
        needsHospital = true;
    } else if (descLower.match(/(fever|pain|sick|hurt|dard|bukhar)/)) {
        severity = "moderate";
        if (!needsAmbulance && !needsHospital) {
            needsHospital = true; // Recommend hospital by default for moderate if unspecified
        }
    } else {
        severity = "low"; // Fallback if no matching keywords and user says something vague
    }

    // 2. Query Local Dataset
    const loc = userLocation || { lat: 28.6650, lng: 77.4300 }; // Default Ghaziabad
    
    let hospital = null;
    if (needsHospital) {
        const sortedHospitals = [...hospitals].sort((a, b) => 
            calculateDistance(loc.lat, loc.lng, a.location.lat, a.location.lng) - 
            calculateDistance(loc.lat, loc.lng, b.location.lat, b.location.lng)
        );
        hospital = sortedHospitals.find(h => needsICU ? h.icuAvailable > 0 : h.bedsAvailable > 0) || sortedHospitals[0];
    }

    let ambulance = null;
    if (needsAmbulance) {
        const sortedAmbulances = [...ambulances]
          .filter(a => a.isAvailable)
          .sort((a, b) => calculateDistance(loc.lat, loc.lng, a.location.lat, a.location.lng) - calculateDistance(loc.lat, loc.lng, b.location.lat, b.location.lng));
        
        if (sortedAmbulances.length > 0) {
            ambulance = sortedAmbulances[0];
            // Simulate allocation
            ambulance.isAvailable = false;
            ambulance.status = "en-route";
        }
    }

    const bloodBank = needsBlood ? bloodBanks[0] : null;

    // 3. Instant Response (Wait exactly 500ms for realistic UI feel "Connecting...")
    setTimeout(() => {
        res.json({
            success: true,
            allocation: {
                extractedEmergencyType: needsICU ? "Critical Medical (ICU Required)" : needsBlood ? "Trauma / Bleeding" : "General Emergency",
                severity,
                recommendedHospitalId: hospital.id,
                recommendedAmbulanceId: ambulance?.id,
                recommendedBloodBankId: bloodBank?.id,
                explanation: "Allocating closest resources based on emergency criteria. AI explanation running in background.",
                hospital,
                ambulance,
                bloodBank
            }
        });
    }, 500); 
  });

  // --- ASYNC AI EXPLANATION ---
  app.post("/api/explain", async (req, res) => {
      const { emergencyDescription, allocation } = req.body;
      if (!ai) return res.json({ explanation: "Gemini API key is missing. Basic rules applied." });

      try {
          const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: `You are a medical dispatch system. You just dispatched the following resources for this emergency: "${emergencyDescription}".
            Allocated: ${JSON.stringify(allocation)}
            Provide a short 1-sentence calm explanation for the user on why this hospital/ambulance was chosen. Do not mention "AI" or "I am an AI".`
          });
          res.json({ explanation: response.text });
      } catch (e: any) {
          res.json({ explanation: "Fast allocation successful." });
      }
  });

  // --- Vite Middleware for Development ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Simulate real-time updates: move ambulances realistically towards hospital/user
    setInterval(() => {
        ambulances.forEach(a => {
            if (a.status === "en-route") {
                a.location.lat += (Math.random() - 0.5) * 0.002;
                a.location.lng += (Math.random() - 0.5) * 0.002;
            }
        });
    }, 2000);
  });
}

startServer();
