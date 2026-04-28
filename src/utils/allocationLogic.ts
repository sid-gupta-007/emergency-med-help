import { Ambulance, BloodBank, Hospital, AllocationResult } from '../types';
import { ambulances, hospitals, bloodBanks } from './offlineData';

// Simple haversine implementation for offline distance calc
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export const offlineAllocate = (emergencyDescription: string, lat: number, lng: number): AllocationResult => {
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
        severity = "low";
    }

    // 2. Query Local Dataset
    let bestAmbulance: Ambulance | null = null;
    let bestHospital: Hospital | null = null;
    let bestBloodBank: BloodBank | null = null;

    if (needsAmbulance) {
        let minAmbDist = Infinity;
        for (const amb of ambulances) {
            if (amb.isAvailable) {
                const dist = getDistance(lat, lng, amb.location.lat, amb.location.lng);
                if (dist < minAmbDist) {
                    minAmbDist = dist;
                    bestAmbulance = amb;
                }
            }
        }
    }

    if (needsHospital) {
        let minHospDist = Infinity;
        for (const hosp of hospitals) {
            if (needsICU && hosp.icuAvailable <= 0) continue;
            const dist = getDistance(lat, lng, hosp.location.lat, hosp.location.lng);
            if (dist < minHospDist) {
                minHospDist = dist;
                bestHospital = hosp;
            }
        }
    }

    if (needsBlood) {
        let minBBDist = Infinity;
        for (const bb of bloodBanks) {
            const dist = getDistance(lat, lng, bb.location.lat, bb.location.lng);
            if (dist < minBBDist) {
                minBBDist = dist;
                bestBloodBank = bb;
            }
        }
    }

    const allocation: AllocationResult = {
        extractedEmergencyType: "offline-calculated",
        severity,
        recommendedAmbulanceId: bestAmbulance?.id || "",
        recommendedHospitalId: bestHospital?.id || "",
        recommendedBloodBankId: bestBloodBank?.id,
        hospital: bestHospital || undefined,
        ambulance: bestAmbulance || undefined,
        bloodBank: bestBloodBank || undefined,
        explanation: "This is an offline fallback allocation."
    };

    return allocation;
};
